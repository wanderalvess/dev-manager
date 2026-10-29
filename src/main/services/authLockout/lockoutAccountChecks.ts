import type { AuthLockoutCheckId, AuthLockoutUser, LoginOutcome } from '../../../shared/authLockoutTypes';
import { describeAttempt, type CallResult, type LockoutRun } from './lockoutRun';

/** Senha certa recusada = bloqueada. Sem resposta ou 5xx não prova nada. */
export const isBlocked = (r: CallResult) => r.attempt.outcome === 'locked' || r.attempt.outcome === 'rejected';
export const isInconclusive = (r: CallResult) => r.attempt.outcome === 'error';
const evidenceOf = (r: CallResult) => `#${r.attempt.seq} ${r.attempt.label}: ${describeAttempt(r.attempt)}${r.attempt.bodySnippet ? ` — ${r.attempt.bodySnippet}` : ''}`;
const firstLocked = (results: CallResult[]) => results.findIndex((r) => r.attempt.outcome === 'locked');
const ordinal = (n: number) => `${n}ª`;

export interface AccountState {
  /** Momento (epoch ms) da falha que bloqueou A; ausente se A não bloqueou. */
  aLockedAtMs?: number;
  bReady: boolean;
  /** Por que o pré-voo de B falhou, para as checagens que dependem dele dizerem. */
  bFailure?: string;
}

/** Limiar: N-1 falhas não bloqueiam; numa execução independente, N falhas em menos da janela bloqueiam. */
export async function checkThreshold(run: LockoutRun, state: AccountState): Promise<void> {
  const started = Date.now();
  const { userA, threshold, windowSeconds } = run.config;
  const first = await run.failTimes('threshold', userA, threshold - 1, 'Execução 1');
  const probe1 = await run.login('threshold', userA, userA.password, `Execução 1 ${userA.login}: senha certa após ${threshold - 1} falhas`);
  await run.sleep((windowSeconds + 5) * 1000, `Limiar: aguardando a janela de ${windowSeconds}s para a execução independente`);

  const seriesStart = Date.now();
  const second = await run.failTimes('threshold', userA, threshold, 'Execução 2');
  state.aLockedAtMs = Date.now();
  const seriesSeconds = (state.aLockedAtMs - seriesStart) / 1000;
  const probe2 = await run.login('threshold', userA, userA.password, `Execução 2 ${userA.login}: senha certa após ${threshold} falhas`);

  const evidence = [...first, probe1, ...second, probe2].map(evidenceOf);
  const earlyIndex = firstLocked(first);
  const lockedIndex = firstLocked(second);
  if (lockedIndex >= 0) {
    evidence.push(`Na execução 2, a ${ordinal(lockedIndex + 1)} falha já respondeu como bloqueio.`);
  } else {
    evidence.push('As respostas de falha não diferenciam senha errada de conta bloqueada; o bloqueio foi conferido com a senha certa.');
  }
  if (seriesSeconds >= windowSeconds) evidence.push(`As ${threshold} falhas levaram ${seriesSeconds.toFixed(1)}s, acima da janela: servidor lento demais para este teste.`);

  if (earlyIndex >= 0 || isBlocked(probe1)) {
    const where = earlyIndex >= 0 ? `na ${ordinal(earlyIndex + 1)} falha` : `com ${threshold - 1} falhas (a senha certa foi recusada)`;
    run.setCheck('threshold', 'failed', `Bloqueou antecipadamente, ${where}.`, evidence, started);
    return;
  }
  if (probe2.attempt.outcome === 'authenticated') {
    state.aLockedAtMs = undefined;
    run.setCheck('threshold', 'failed', `Não bloqueou: a senha certa entrou depois de ${threshold} falhas em ${seriesSeconds.toFixed(1)}s.`, evidence, started);
    return;
  }
  if (isInconclusive(probe1) || isInconclusive(probe2)) {
    run.setCheck('threshold', 'warning', 'Inconclusivo: o servidor não respondeu (ou deu 5xx) a uma das conferências com a senha certa.', evidence, started);
    return;
  }
  run.setCheck(
    'threshold',
    'passed',
    `${threshold - 1} falhas não bloquearam; ${threshold} falhas em ${seriesSeconds.toFixed(1)}s bloquearam${lockedIndex >= 0 ? ` (resposta de bloqueio na ${ordinal(lockedIndex + 1)})` : ''}.`,
    evidence,
    started
  );
}

/** Sem a checagem de limiar, só bloqueia A para as checagens que dependem do bloqueio. */
export async function lockAccountA(run: LockoutRun, state: AccountState): Promise<void> {
  const { userA, threshold } = run.config;
  const owner = A_LOCK_CHECKS.find((id) => run.selected(id)) ?? 'correct-password-while-locked';
  await run.failTimes(owner, userA, threshold, 'Bloqueio de A');
  state.aLockedAtMs = Date.now();
}

function verdictWhileLocked(results: CallResult[]): { status: 'passed' | 'failed' | 'warning'; reason: string } {
  const leaked = results.filter((r) => r.attempt.outcome === 'authenticated' || r.attempt.issuedToken || r.attempt.setSessionCookie);
  if (leaked.length > 0) {
    const what = leaked.map((r) => `#${r.attempt.seq} ${r.attempt.issuedToken ? 'emitiu token' : r.attempt.setSessionCookie ? 'criou cookie de sessão' : 'autenticou'}`);
    return { status: 'failed', reason: `Entrou com a conta bloqueada: ${what.join(', ')}.` };
  }
  if (results.some(isInconclusive)) return { status: 'warning', reason: 'Inconclusivo: o servidor não respondeu ou deu 5xx.' };
  return { status: 'passed', reason: '' };
}

export async function checkCorrectPasswordWhileLocked(run: LockoutRun): Promise<void> {
  const started = Date.now();
  const { userA } = run.config;
  const r = await run.login('correct-password-while-locked', userA, userA.password, `${userA.login} bloqueado: senha certa`);
  const v = verdictWhileLocked([r]);
  const outcome: LoginOutcome | undefined = r.attempt.outcome;
  run.setCheck(
    'correct-password-while-locked',
    v.status,
    v.reason || `Recusou (HTTP ${r.attempt.status}, ${outcome}) sem token e sem cookie de sessão.`,
    [evidenceOf(r)],
    started
  );
}

/** Outro cliente HTTP: sem cookie e com outro User-Agent; e reaproveitando o cookie da sessão aberta antes do bloqueio. */
export async function checkClientSwitch(run: LockoutRun): Promise<void> {
  const started = Date.now();
  const { userA } = run.config;
  const results = [
    await run.login('client-switch', userA, userA.password, `${userA.login} bloqueado: outro cliente, sem cookie`, {
      'User-Agent': 'DevManager-LockoutTest-OutroCliente/2.0',
      Connection: 'close'
    })
  ];
  const oldToken = run.tokens.get(userA.login);
  if (oldToken) {
    results.push(
      await run.login('client-switch', userA, userA.password, `${userA.login} bloqueado: com o cookie da sessão anterior`, {
        Cookie: `suukie=${oldToken}`,
        Authorization: `Bearer ${oldToken}`
      })
    );
  }
  const v = verdictWhileLocked(results);
  const evidence = results.map(evidenceOf);
  if (!oldToken) evidence.push('O pré-voo não devolveu token, então a variação com o cookie da sessão anterior não foi feita.');
  run.setCheck('client-switch', v.status, v.reason || `Continuou bloqueada em ${results.length} cliente(s) diferente(s).`, evidence, started);
}

/** Devolve se A continua bloqueada: se o logoff limpou o bloqueio, quem vem depois precisa bloquear de novo. */
export async function checkLogoffBypass(run: LockoutRun): Promise<boolean> {
  const started = Date.now();
  const { userA, logoffUrl } = run.config;
  const token = run.tokens.get(userA.login);
  if (!logoffUrl) {
    run.setCheck('logoff-bypass', 'manual', 'Caminho de logoff não informado: chame o logoff à mão e tente o login de novo.', [], started);
    return true;
  }
  const auth: Record<string, string> = token ? { Authorization: `Bearer ${token}`, Cookie: `suukie=${token}` } : {};
  let logoff = await run.call({ checkId: 'logoff-bypass', label: `Logoff de ${userA.login}`, kind: 'logoff', user: userA.login, method: 'POST', url: logoffUrl, headers: auth, withAuth: !!token });
  if (logoff.attempt.status === 405) {
    logoff = await run.call({ checkId: 'logoff-bypass', label: `Logoff de ${userA.login} (GET)`, kind: 'logoff', user: userA.login, method: 'GET', url: logoffUrl, headers: auth, withAuth: !!token });
  }
  const after = await run.login('logoff-bypass', userA, userA.password, `${userA.login}: senha certa depois do logoff`);
  const evidence = [evidenceOf(logoff), evidenceOf(after)];
  const v = verdictWhileLocked([after]);
  if (v.status === 'failed') {
    run.setCheck('logoff-bypass', 'failed', `O logoff limpou o bloqueio. ${v.reason}`, evidence, started);
  } else if (logoff.attempt.status === 0 || logoff.attempt.status === 404) {
    run.setCheck('logoff-bypass', 'warning', `O logoff não foi encontrado (${describeAttempt(logoff.attempt)}); confira o caminho. O login continuou bloqueado.`, evidence, started);
  } else {
    run.setCheck('logoff-bypass', v.status, v.reason || `Depois do logoff (HTTP ${logoff.attempt.status}) o login continuou bloqueado.`, evidence, started);
  }
  return v.status !== 'failed';
}

export async function checkPerUser(run: LockoutRun, state: AccountState): Promise<void> {
  const started = Date.now();
  const { userA, userB } = run.config;
  if (!userB || !state.bReady) {
    run.setCheck('per-user', 'skipped', userB ? `O usuário B não autenticou no pré-voo: ${state.bFailure ?? 'sem detalhe'}` : 'Informe o usuário de teste B.', [], started);
    return;
  }
  const r = await run.login('per-user', userB, userB.password, `${userB.login}: senha certa com ${userA.login} bloqueado`);
  const evidence = [evidenceOf(r)];
  if (r.attempt.outcome === 'authenticated') {
    run.setCheck('per-user', 'passed', `${userB.login} entrou normalmente com ${userA.login} bloqueado na mesma origem.`, evidence, started);
  } else if (isInconclusive(r)) {
    run.setCheck('per-user', 'warning', 'Inconclusivo: o servidor não respondeu ou deu 5xx.', evidence, started);
  } else {
    run.setCheck('per-user', 'failed', `Bloquear ${userA.login} bloqueou também ${userB.login} (o pré-voo de ${userB.login} tinha passado): bloqueio por origem, não por usuário?`, evidence, started);
  }
}

/** Lote de N falhas simultâneas em B: tem de bloquear (nenhum incremento perdido) e nada pode entrar enquanto isso. */
export async function checkConcurrency(run: LockoutRun, state: AccountState): Promise<void> {
  const started = Date.now();
  const { userB, threshold, concurrency } = run.config;
  if (!userB || !state.bReady) {
    run.setCheck('concurrency', 'skipped', userB ? `O usuário B não autenticou no pré-voo: ${state.bFailure ?? 'sem detalhe'}` : 'Informe o usuário de teste B (a conta A está ocupada com o bloqueio).', [], started);
    return;
  }
  run.log(`Concorrência: ${threshold} falhas simultâneas em ${userB.login}`);
  const burst = await Promise.all(
    Array.from({ length: threshold }, (_, i) => run.login('concurrency', userB, run.nextWrongPassword(), `${userB.login}: falha simultânea ${i + 1}/${threshold}`))
  );
  const probe = await run.login('concurrency', userB, userB.password, `${userB.login}: senha certa depois do lote`);
  const race = await Promise.all(
    Array.from({ length: concurrency }, (_, i) => run.login('concurrency', userB, userB.password, `${userB.login}: senha certa simultânea ${i + 1}/${concurrency}`))
  );
  const evidence = [...burst, probe, ...race].map(evidenceOf);
  evidence.push(`${userB.login} fica bloqueado até o fim do prazo de bloqueio.`);
  const leaked = verdictWhileLocked([...burst, ...race]);
  if (probe.attempt.outcome === 'authenticated') {
    run.setCheck('concurrency', 'failed', `Perdeu incrementos: ${threshold} falhas simultâneas não bloquearam a conta.`, evidence, started);
  } else if (leaked.status === 'failed') {
    run.setCheck('concurrency', 'failed', `Autenticação indevida na corrida. ${leaked.reason}`, evidence, started);
  } else if (isInconclusive(probe) || leaked.status === 'warning') {
    run.setCheck('concurrency', 'warning', 'Inconclusivo: parte das requisições simultâneas ficou sem resposta ou deu 5xx.', evidence, started);
  } else {
    run.setCheck('concurrency', 'passed', `${threshold} falhas simultâneas bloquearam e ${concurrency} logins simultâneos com a senha certa foram recusados.`, evidence, started);
  }
}

export const A_LOCK_CHECKS: readonly AuthLockoutCheckId[] = ['correct-password-while-locked', 'client-switch', 'per-user', 'logoff-bypass', 'lock-duration'];

export async function preflightUser(run: LockoutRun, user: AuthLockoutUser, name: string): Promise<CallResult> {
  const r = await run.login('preflight', user, user.password, `Pré-voo: ${name} (${user.login}) com a senha certa`);
  if (r.token) run.tokens.set(user.login, r.token);
  return r;
}

/** Motivo do pré-voo recusado, com o que o WTA respondeu (já mascarado) para a pessoa saber se é senha ou bloqueio. */
export function preflightFailureReason(r: CallResult): string {
  const a = r.attempt;
  if (a.status === 0) return `o WTA não respondeu (${a.error ?? 'sem resposta'}). Confira a URL do WTA.`;
  const hint =
    a.outcome === 'locked'
      ? 'A conta parece bloqueada: aguarde o fim do bloqueio antes de rodar.'
      : a.outcome === 'error'
        ? 'Erro do servidor: confira se o WTA está de pé.'
        : 'Confira login e senha (o WinThor pode diferenciar maiúsculas) ou se a conta já está bloqueada por um teste anterior.';
  return `HTTP ${a.status}${a.bodySnippet ? `, resposta do WTA: ${a.bodySnippet.slice(0, 200)}` : ''}. ${hint}`;
}
