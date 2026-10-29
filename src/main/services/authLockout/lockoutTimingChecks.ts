import { evaluateLockDuration, interpretCountWindow, type DurationProbe } from '../../../shared/authLockoutAnalysis';
import { DURATION_MARGIN_SECONDS, durationProbeOffsets } from '../../../shared/authLockoutNarrative';
import { describeAttempt, type LockoutRun } from './lockoutRun';
import { isBlocked, isInconclusive } from './lockoutAccountChecks';

/**
 * Sonda a conta A com a senha certa antes e depois de cada duração candidata e para na primeira que entrar.
 * Devolve se A ficou livre (as checagens seguintes precisam de uma conta sem bloqueio).
 */
export async function checkLockDuration(run: LockoutRun, lockedAtMs: number | undefined, report: boolean): Promise<boolean> {
  const { userA, lockMinutesCandidates } = run.config;
  let started = Date.now();
  if (report) started = run.beginCheck('lock-duration');
  else if (lockedAtMs !== undefined) {
    run.note(`${userA.login} precisa ser liberado antes de medir a janela de contagem: tentando a senha certa até entrar.`, 'step');
  }
  if (lockedAtMs === undefined) {
    if (report) run.setCheck('lock-duration', 'skipped', 'A conta A não chegou a bloquear, então não há prazo para medir.', [], started);
    return true;
  }
  const lockedDuring = run.attempts.filter((a) => a.user === userA.login && Date.parse(a.at) > lockedAtMs);
  const lastDuring = lockedDuring.length ? Math.round((Date.parse(lockedDuring[lockedDuring.length - 1].at) - lockedAtMs) / 1000) : 0;
  const probes: DurationProbe[] = [];
  const evidence: string[] = [];
  let free = false;
  const minLock = Math.min(...lockMinutesCandidates) * 60;
  const maxLock = Math.max(...lockMinutesCandidates) * 60;
  for (const offset of durationProbeOffsets(lockMinutesCandidates)) {
    await run.sleepUntil(lockedAtMs, offset * 1000, `Esperando +${offset}s desde o bloqueio de ${userA.login} para tentar a senha certa`);
    // Antes da menor duração tem de estar bloqueado; depois da maior, liberado. Entre as duas é o que se quer descobrir
    const expect = offset < minLock ? 'refuse' : offset > maxLock ? 'enter' : undefined;
    const when = expect === 'refuse' ? `ainda dentro dos ${minLock / 60} min, tem de recusar` : expect === 'enter' ? `já passou de ${maxLock / 60} min, tem de entrar` : 'entre as durações candidatas, o resultado diz qual vale';
    run.note(`Sonda em +${offset}s (${when}).`);
    const r = await run.login(report ? 'lock-duration' : 'count-window', userA, userA.password, `${userA.login}: senha certa em +${offset}s do bloqueio`, undefined, expect);
    const offsetSeconds = Math.round((Date.parse(r.attempt.at) - lockedAtMs) / 1000);
    evidence.push(`#${r.attempt.seq} +${offsetSeconds}s: ${describeAttempt(r.attempt)}`);
    if (isInconclusive(r)) continue;
    probes.push({ offsetSeconds, blocked: isBlocked(r) });
    if (r.attempt.outcome === 'authenticated') {
      run.note(`${userA.login} entrou de novo em +${offsetSeconds}s: o bloqueio acabou.`);
      free = true;
      break;
    }
  }
  if (report) {
    if (lastDuring > 0) {
      evidence.push(`Houve ${lockedDuring.length} tentativa(s) durante o bloqueio, a última em +${lastDuring}s. Se o servidor renova o prazo a cada tentativa, conte a partir dela.`);
    }
    const verdict = evaluateLockDuration(probes, lockMinutesCandidates, DURATION_MARGIN_SECONDS);
    run.setCheck('lock-duration', verdict.status, verdict.summary, evidence, started);
  }
  return free;
}

/**
 * Janela de contagem: 1 falha em t=0, N-2 falhas pouco antes de t=janela (N-1 dentro dela), 1 falha logo depois
 * (t=janela+1), outra em t=janela+2 e a senha certa em seguida. Janela fixa a partir da 1ª falha não bloqueia;
 * janela deslizante bloqueia na falha de t=janela+2; contagem acumulada bloqueia já na de t=janela+1.
 */
export async function checkCountWindow(run: LockoutRun): Promise<void> {
  const started = run.beginCheck('count-window');
  const { userA, threshold, windowSeconds } = run.config;
  const t0 = Date.now();
  run.note('t=0: primeira falha. A partir dela começa a contar a janela.');
  const sequence = [await run.login('count-window', userA, run.nextWrongPassword(), `${userA.login}: falha em t=0`)];
  await run.sleepUntil(t0, (windowSeconds - 6) * 1000, `Esperando chegar perto do fim da janela (t=${windowSeconds - 6}s) para as próximas falhas`);
  run.note(`t≈${windowSeconds - 6}s: mais ${threshold - 2} falhas. Agora são ${threshold - 1} dentro de ${windowSeconds}s, uma a menos que o limite.`);
  sequence.push(...(await run.failTimes('count-window', userA, threshold - 2, `Antes do limite (t≈${windowSeconds - 6}s)`)));
  await run.sleepUntil(t0, (windowSeconds + 1) * 1000, `Esperando passar do limite de ${windowSeconds}s`);
  run.note(`t=${windowSeconds + 1}s: a primeira falha saiu da janela. Mais uma falha (${threshold}ª no total).`);
  const justAfter = await run.login('count-window', userA, run.nextWrongPassword(), `${userA.login}: falha em t=${windowSeconds + 1}s`);
  await run.sleepUntil(t0, (windowSeconds + 2) * 1000, 'Esperando 1s para a última falha');
  run.note(`t=${windowSeconds + 2}s: mais uma falha. Numa janela deslizante agora são ${threshold} falhas nos últimos ${windowSeconds}s.`);
  const secondAfter = await run.login('count-window', userA, run.nextWrongPassword(), `${userA.login}: falha em t=${windowSeconds + 2}s`);
  run.note('Conferindo com a senha certa: entrar indica janela fixa; recusar indica janela deslizante ou contagem acumulada.');
  const probe = await run.login('count-window', userA, userA.password, `${userA.login}: senha certa ao fim da sequência`);

  const all = [...sequence, justAfter, secondAfter, probe];
  const evidence = all.map((r) => `#${r.attempt.seq} +${((Date.parse(r.attempt.at) - t0) / 1000).toFixed(1)}s ${r.attempt.label}: ${describeAttempt(r.attempt)}`);
  const lastBefore = sequence[sequence.length - 1];
  const spanBefore = (Date.parse(lastBefore.attempt.at) - t0) / 1000;
  if (spanBefore >= windowSeconds) {
    run.setCheck('count-window', 'warning', `As falhas "antes do limite" terminaram em ${spanBefore.toFixed(1)}s, fora da janela: servidor lento demais para este teste.`, evidence, started);
    return;
  }
  if (sequence.some((r) => r.attempt.outcome === 'locked')) {
    run.setCheck('count-window', 'failed', `Bloqueou com menos de ${threshold} falhas dentro da janela.`, evidence, started);
    return;
  }
  if (isInconclusive(probe)) {
    run.setCheck('count-window', 'warning', 'Inconclusivo: a conferência com a senha certa ficou sem resposta ou deu 5xx.', evidence, started);
    return;
  }
  const verdict = interpretCountWindow({
    windowSeconds,
    threshold,
    blockedAtEnd: isBlocked(probe),
    lockedRightAfterWindow: justAfter.attempt.outcome === 'locked'
  });
  if (isBlocked(probe)) evidence.push(`${userA.login} fica bloqueado até o fim do prazo de bloqueio.`);
  run.setCheck('count-window', verdict.status, verdict.summary, evidence, started);
}
