import {
  EXPOSURE_LABELS,
  countLoginFailureMentions,
  evaluateMentions,
  isBlockingExposure,
  worstStatus
} from '../../../shared/authLockoutAnalysis';
import type { AuthLockoutCheckStatus } from '../../../shared/authLockoutTypes';
import { describeAttempt, type CallOptions, type CallResult, type LockoutRun } from './lockoutRun';
import { logsApiLines, readLogSince, secretsFoundIn } from './lockoutLogSources';

const ROUNDS = 3;
const SINK_BURST = 10;

function withQuery(url: string, params: Record<string, string>): string {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

/** Quatro falhas diferentes ao mesmo tempo, cada uma com um marcador; nenhuma resposta pode trazer o marcador de outra. */
export async function checkApiExceptions(run: LockoutRun): Promise<void> {
  const started = Date.now();
  const { loginUrl, logsUrl, baseUrl } = run.config;
  const evidence: string[] = [];
  const problems: { status: AuthLockoutCheckStatus; text: string }[] = [];
  for (let round = 1; round <= ROUNDS; round++) {
    const markers = [0, 1, 2, 3].map((i) => `mk${run.runId.replace(/\W/g, '')}r${round}i${i}`);
    const requests: CallOptions[] = [
      { checkId: 'api-exceptions', label: `Rodada ${round}: login com JSON malformado`, kind: 'probe', method: 'POST', url: loginUrl, headers: { 'Content-Type': 'application/json' }, body: `{"login":"${markers[0]}","senha":` },
      { checkId: 'api-exceptions', label: `Rodada ${round}: login de usuário inexistente`, kind: 'login-wrong', user: `devmgr-${markers[1]}`, method: 'POST', url: loginUrl, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: `devmgr-${markers[1]}`, senha: run.encodePassword(run.nextWrongPassword()) }) },
      { checkId: 'api-exceptions', label: `Rodada ${round}: API de logs com parâmetro inválido`, kind: 'probe', method: 'GET', url: withQuery(logsUrl, { pagina: '-1', limite: 'abc', ref: markers[2] }), withAuth: false },
      { checkId: 'api-exceptions', label: `Rodada ${round}: rota inexistente`, kind: 'probe', method: 'GET', url: `${baseUrl}/winthor/ferramenta/servidor/v1/${markers[3]}` }
    ];
    const results = await Promise.all(requests.map((req, i) => run.call({ ...req, headers: { ...req.headers, 'X-Request-Id': markers[i] } })));
    results.forEach((r, i) => {
      const foreign = markers.filter((m, j) => j !== i && (r.body.includes(m) || JSON.stringify(r.headers).includes(m)));
      evidence.push(`#${r.attempt.seq} ${r.attempt.label}: ${describeAttempt(r.attempt)}`);
      if (foreign.length) problems.push({ status: 'failed', text: `#${r.attempt.seq} trouxe dados de outra requisição (${foreign.join(', ')}).` });
      if (r.attempt.status === 0) problems.push({ status: 'failed', text: `#${r.attempt.seq} ficou sem resposta (${r.attempt.error}).` });
      else if (r.attempt.status >= 500) problems.push({ status: 'warning', text: `#${r.attempt.seq} respondeu ${r.attempt.status}: a falha do cliente virou erro do servidor.` });
    });
  }
  const status = problems.length ? worstStatus(problems.map((p) => p.status)) : 'passed';
  const summary = problems.length
    ? problems.map((p) => p.text).join(' ')
    : `${ROUNDS * 4} falhas simultâneas tratadas isoladamente, sem 5xx e sem dados cruzados.`;
  run.setCheck('api-exceptions', status, summary, evidence, started);
}

/** Varre tudo o que voltou na execução. O conteúdo da API de logs com autenticação é avaliado na checagem de logs. */
export async function checkErrorExposure(run: LockoutRun): Promise<void> {
  const started = Date.now();
  const { loginUrl, logsUrl } = run.config;
  await run.call({ checkId: 'error-exposure', label: 'Login com Content-Type text/plain', kind: 'probe', method: 'POST', url: loginUrl, headers: { 'Content-Type': 'text/plain' }, body: 'login=x&senha=y' });
  await run.call({ checkId: 'error-exposure', label: 'API de logs sem autenticação', kind: 'logs', method: 'GET', url: logsUrl, withAuth: false });
  const inspected = run.attempts.filter((a) => a.status > 0 && !(a.kind === 'logs' && a.withAuth && a.status < 300));
  const blocking: string[] = [];
  const soft: string[] = [];
  for (const a of inspected) {
    const hard = a.exposure.filter(isBlockingExposure);
    if (hard.length) blocking.push(`#${a.seq} ${a.label} (HTTP ${a.status}): ${hard.map((f) => EXPOSURE_LABELS[f]).join(', ')}`);
    if (a.exposure.includes('server-version')) soft.push(`#${a.seq} ${a.label}: ${EXPOSURE_LABELS['server-version']}`);
  }
  const evidence = [...blocking, ...soft.slice(0, 5)];
  if (blocking.length) run.setCheck('error-exposure', 'failed', `${blocking.length} resposta(s) expuseram detalhe interno ou segredo.`, evidence, started);
  else if (soft.length) run.setCheck('error-exposure', 'warning', `Nenhum segredo nem stack trace em ${inspected.length} respostas, mas o servidor anuncia a versão no cabeçalho.`, evidence, started);
  else run.setCheck('error-exposure', 'passed', `${inspected.length} respostas inspecionadas (status, corpo e cabeçalhos) sem stack trace, senha, token ou string de conexão.`, evidence, started);
}

function expectedFailures(run: LockoutRun, login: string): number {
  return run.attempts.filter((a) => a.user === login && (a.kind === 'login-wrong' || a.kind === 'login-correct') && a.status > 0 && a.outcome !== 'authenticated').length;
}

export async function checkLogCorrelation(run: LockoutRun, logOffset: number | undefined, logsAuth: Record<string, string> | undefined): Promise<void> {
  const started = Date.now();
  const { logsUrl, logFilePath, userA, userB } = run.config;
  const parts: { status: AuthLockoutCheckStatus; text: string }[] = [];
  const evidence: string[] = [];
  const users = [userA, ...(userB ? [userB] : [])];

  const open = await run.call({ checkId: 'log-correlation', label: 'API de logs sem autenticação', kind: 'logs', method: 'GET', url: logsUrl, withAuth: false });
  evidence.push(`#${open.attempt.seq} sem autenticação: ${describeAttempt(open.attempt)}`);
  if (open.attempt.status >= 200 && open.attempt.status < 300) parts.push({ status: 'failed', text: 'A API de logs respondeu sem autenticação.' });
  else if (open.attempt.status === 404) parts.push({ status: 'warning', text: 'A API de logs não foi encontrada (404); confira a URL.' });
  else if (open.attempt.status === 401 || open.attempt.status === 403) parts.push({ status: 'passed', text: `Acesso sem autenticação recusado (${open.attempt.status}).` });
  else parts.push({ status: 'warning', text: `Sem autenticação a API respondeu ${open.attempt.status || 'nada'}; esperado 401 ou 403.` });

  const sources: { name: string; lines: string[] }[] = [];
  let authed: CallResult | undefined;
  if (logsAuth) {
    authed = await run.call({ checkId: 'log-correlation', label: 'API de logs com autenticação', kind: 'logs', method: 'GET', url: logsUrl, headers: logsAuth, withAuth: true });
    evidence.push(`#${authed.attempt.seq} com autenticação: ${describeAttempt(authed.attempt)}`);
    if (authed.attempt.status >= 200 && authed.attempt.status < 300) sources.push({ name: 'API de logs', lines: logsApiLines(authed.body) });
    else parts.push({ status: 'warning', text: `A API de logs recusou o token administrativo (${describeAttempt(authed.attempt)}).` });
  } else {
    parts.push({ status: 'warning', text: 'Sem credencial para consultar a API de logs (configure login e senha do WTA em Configurações).' });
  }

  const file = readLogSince(logFilePath, logOffset);
  if (file.found) {
    sources.push({ name: 'winthor.log', lines: file.lines });
    evidence.push(`winthor.log: ${file.lines.length} linha(s) novas durante a execução${file.rotated ? ' (o arquivo foi rotacionado e lido do começo)' : ''}${file.truncated ? ' (só os últimos 8 MB)' : ''}.`);
  } else {
    parts.push({ status: 'warning', text: logFilePath ? `Log local não encontrado: ${logFilePath}.` : 'Log local não configurado (pasta do Karaf).' });
  }

  for (const source of sources) {
    for (const user of users) {
      const verdict = evaluateMentions(`${source.name} / ${user.login}`, countLoginFailureMentions(source.lines, user.login), expectedFailures(run, user.login));
      parts.push({ status: verdict.status, text: verdict.summary });
    }
    const leaked = secretsFoundIn(source.lines, run.secrets);
    if (leaked.length) parts.push({ status: 'failed', text: `${source.name} registrou ${leaked.length} segredo(s) da execução (senha digitada ou token).` });
  }

  const status = worstStatus(parts.map((p) => p.status));
  const summary = parts.filter((p) => p.status !== 'passed' && p.status !== 'info').map((p) => p.text).join(' ') || 'Falhas correlacionadas, acesso restrito e nenhum segredo nos logs.';
  run.setCheck('log-correlation', status, summary, [...evidence, ...parts.map((p) => p.text)], started);
}

/** Só roda com a confirmação de que o destino de logs foi derrubado por um mecanismo autorizado. */
export async function checkLogSinkFailure(run: LockoutRun): Promise<void> {
  const started = Date.now();
  const { loginUrl, logsUrl, logSinkUnavailableConfirmed } = run.config;
  if (!logSinkUnavailableConfirmed) {
    run.setCheck(
      'log-sink-failure',
      'manual',
      'Torne o destino de logs indisponível por um mecanismo autorizado em homologação (ex.: appender apontando para pasta sem gravação ou coletor parado), marque a confirmação e rode só esta checagem.'
    );
    return;
  }
  const ghost = `devmgr-sink-${run.runId}`;
  const burst = await Promise.all(
    Array.from({ length: SINK_BURST }, (_, i) =>
      run.call({ checkId: 'log-sink-failure', label: `Falha ${i + 1}/${SINK_BURST} com o log indisponível`, kind: 'login-wrong', user: ghost, method: 'POST', url: loginUrl, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: ghost, senha: run.encodePassword(run.nextWrongPassword()) }) })
    )
  );
  const health = [
    await run.call({ checkId: 'log-sink-failure', label: 'Serviço respondendo depois do lote (login)', kind: 'login-wrong', user: ghost, method: 'POST', url: loginUrl, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: ghost, senha: run.encodePassword(run.nextWrongPassword()) }) }),
    await run.call({ checkId: 'log-sink-failure', label: 'Serviço respondendo depois do lote (logs)', kind: 'logs', method: 'GET', url: logsUrl, withAuth: false })
  ];
  const all = [...burst, ...health];
  const evidence = all.map((r) => `#${r.attempt.seq} ${r.attempt.label}: ${describeAttempt(r.attempt)}`);
  const silent = all.filter((r) => r.attempt.status === 0);
  const errors = all.filter((r) => r.attempt.status >= 500);
  if (health.some((r) => r.attempt.status === 0)) run.setCheck('log-sink-failure', 'failed', 'O serviço parou de responder depois das falhas com o log indisponível.', evidence, started);
  else if (silent.length) run.setCheck('log-sink-failure', 'failed', `${silent.length} requisição(ões) ficaram sem resposta com o log indisponível.`, evidence, started);
  else if (errors.length) run.setCheck('log-sink-failure', 'warning', `O serviço seguiu de pé, mas ${errors.length} resposta(s) foram 5xx: confira no console se houve exceção em cascata.`, evidence, started);
  else run.setCheck('log-sink-failure', 'passed', `${all.length} requisições respondidas normalmente com o destino de logs indisponível.`, evidence, started);
}
