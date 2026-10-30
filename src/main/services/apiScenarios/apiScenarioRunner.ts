import { maskSecrets } from '../../../shared/authLockoutAnalysis';
import { describeRule } from '../../../shared/apiRuleText';
import { buildApiScenarioMarkdown } from '../../../shared/apiScenarioReport';
import type { ApiResponseSnapshot, ApiRuleResult, ApiScenario, ApiScenarioRunResult } from '../../../shared/apiScenarioTypes';
import { randomBytes } from 'crypto';
import type { AuthLockoutLogEntry } from '../../../shared/authLockoutTypes';
import { httpRequest } from '../../utils/httpRequest';
import { isSafeUrl } from '../../utils/security';
import { evaluateDbRule, evaluateRule } from './apiRules';
import { lookupDbValue, type RunDbQuery } from './apiDbLookup';
import { evaluateLeakRule, evaluateLogRule, responseExposure, startLogProbe } from './apiErrorChecks';
import { REQUEST_TIMEOUT_MS, normalizeWtaUrl, safeParse, wtaToken, type RunnerSettings } from './apiWtaAuth';

export type { RunnerSettings } from './apiWtaAuth';
export { normalizeWtaUrl } from './apiWtaAuth';

const MAX_BODY_SHOWN = 8 * 1024;

export function resolveScenarioUrl(url: string, settings: RunnerSettings, requestId = ''): string {
  return fillRequestId(url.replace(/\{\{\s*wtaUrl\s*\}\}/gi, normalizeWtaUrl(settings.wtaUrl)), requestId);
}

/** `{{requestId}}` vira o identificador desta execução (para achar o erro no log). */
export function fillRequestId(text: string, requestId: string): string {
  return text.replace(/\{\{\s*requestId\s*\}\}/gi, requestId);
}

export function newRequestId(): string {
  return `dm-${Date.now().toString(36)}-${randomBytes(3).toString('hex')}`;
}

/** Uma execução: narra cada etapa (mesmo formato do Bloqueio de Login) e devolve o confronto regra a regra. */
export async function runApiScenario(
  scenario: ApiScenario,
  settings: RunnerSettings,
  onLog: (entry: AuthLockoutLogEntry) => void = () => {},
  runQuery?: RunDbQuery
): Promise<ApiScenarioRunResult> {
  const startedAt = new Date().toISOString();
  const log: AuthLockoutLogEntry[] = [];
  const note = (message: string, level: AuthLockoutLogEntry['level'] = 'action', extra: Partial<AuthLockoutLogEntry> = {}) => {
    const entry = { at: new Date().toISOString(), level, message, ...extra };
    log.push(entry);
    onLog(entry);
  };
  const secrets: string[] = [];
  const requestId = newRequestId();
  const url = resolveScenarioUrl(scenario.url, settings, requestId);
  const request: ApiScenarioRunResult['request'] = { method: scenario.method, url };
  const finish = (partial: Pick<ApiScenarioRunResult, 'success' | 'rules'> & Partial<ApiScenarioRunResult>): ApiScenarioRunResult => {
    const base = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      startedAt,
      finishedAt: new Date().toISOString(),
      request,
      requestId,
      exposure: [],
      log,
      ...partial
    };
    return { ...base, markdown: buildApiScenarioMarkdown(base) };
  };

  note(`▶ ${scenario.name}`, 'step', {
    detail: `Chama ${scenario.method} ${url} e confere ${scenario.rules.length} regra(s): ${scenario.rules.map(describeRule).join('; ')}.`
  });
  if (!isSafeUrl(url)) {
    const error = `URL inválida ou não permitida: ${url}`;
    note(error, 'error');
    return finish({ success: false, rules: [], error });
  }

  // O identificador vai em cabeçalhos comuns de rastreio; se o servidor registrar algum deles, a regra de log o encontra
  const headers: Record<string, string> = { Accept: 'application/json', 'X-Request-Id': requestId, 'X-Correlation-Id': requestId };
  for (const h of scenario.headers) headers[h.key] = fillRequestId(h.value, requestId);
  const body = scenario.body ? fillRequestId(scenario.body, requestId) : undefined;
  if (body && !Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json';
  note(`Identificador desta execução: ${requestId} (cabeçalhos X-Request-Id e X-Correlation-Id e {{requestId}}).`);

  let authToken: string | undefined;
  const getToken = async () => (authToken ??= await wtaToken(settings, note, secrets));
  if (scenario.auth === 'settings-wta') {
    const token = await getToken();
    if (!token) {
      const error = 'Não foi possível autenticar no WTA com o login de Configurações (confira login e senha em Configurações).';
      note(error, 'error');
      return finish({ success: false, rules: [], error });
    }
    headers.Authorization = `Bearer ${token}`;
    headers.Cookie = `suukie=${token}`;
  }

  // Guardado depois do login: o token entra em `secrets` e sai mascarado; Authorization/Cookie viram *** de qualquer forma
  request.headers = Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [name, maskCredentialHeader(name, value, secrets)])
  );
  if (body) request.body = maskSecrets(body, secrets, 64 * 1024, true);
  note(`Chamando ${scenario.method} ${url}${scenario.auth === 'settings-wta' ? ' com o token do WTA' : ' sem autenticação'}.`);
  const hasLogRule = scenario.rules.some((r) => r.kind === 'log');
  const probe = hasLogRule ? startLogProbe(settings) : {};
  const response = await callApi(scenario.method, url, headers, body, secrets);
  note(
    response.status ? `Resposta: HTTP ${response.status} em ${response.durationMs} ms${response.isJson ? ' (JSON)' : ' (não é JSON)'}.` : `Sem resposta: ${response.error}.`,
    response.status ? 'action' : 'error',
    response.body ? { detail: response.body.slice(0, 300) } : {}
  );

  const json = response.isJson ? safeParse(response.rawBody) : undefined;
  const evaluated = { status: response.status, isJson: response.isJson, json, durationMs: response.durationMs, headers: response.rawHeaders, bodyText: response.rawBody };
  const exposure = response.status > 0 ? responseExposure(response.rawBody, response.rawHeaders, secrets) : [];
  if (exposure.some((f) => f !== 'server-version') && !scenario.rules.some((r) => r.kind === 'leak')) {
    note('A resposta expõe detalhe interno. Acrescente a regra "Sem vazamento de erro" para reprovar o cenário por isso.', 'error');
  }
  const rules: ApiRuleResult[] = [];
  for (const rule of scenario.rules) {
    let outcome: ApiRuleResult;
    if (rule.kind === 'db' && response.status > 0) outcome = evaluateDbRule(rule, evaluated, await lookupDbValue(rule, json, runQuery, (m) => note(m)));
    else if (rule.kind === 'leak') outcome = evaluateLeakRule(rule, exposure, response.status);
    else if (rule.kind === 'log') {
      const needle = fillRequestId(rule.expected?.trim() || '{{requestId}}', requestId);
      outcome = await evaluateLogRule(rule, needle, { settings, probe, getToken, note: (m, l) => note(m, l) });
    } else outcome = evaluateRule(rule, evaluated);
    // Os valores vão para a tela, o passo a passo e o relatório do Jira: token e senha saem mascarados como no corpo
    const result = { ...outcome, expected: maskSecrets(outcome.expected, secrets), actual: maskSecrets(outcome.actual, secrets) };
    note(
      `${result.passed ? '✔' : '✘'} ${result.label} — ${result.passed ? `obtido ${result.actual}` : `esperado ${result.expected}, obtido ${result.actual}`}`,
      'attempt',
      { asExpected: result.passed }
    );
    rules.push(result);
  }
  const passed = rules.filter((r) => r.passed).length;
  const success = response.status > 0 && passed === rules.length;
  note(`${success ? '✅' : '❌'} ${scenario.name} — ${success ? 'OK' : 'Falhou'}: ${passed} de ${rules.length} regra(s) conferem.`, 'result', {
    status: success ? 'passed' : 'failed'
  });
  const snapshot: ApiResponseSnapshot = {
    status: response.status,
    durationMs: response.durationMs,
    headers: response.headers,
    body: response.body,
    isJson: response.isJson,
    ...(response.error ? { error: response.error } : {})
  };
  return finish({ success, rules, response: snapshot, exposure });
}

/** Authorization guarda o esquema ("Bearer ***") e Cookie os nomes ("suukie=***"): dá para saber o que foi enviado sem o valor. */
function maskCredentialHeader(name: string, value: string, secrets: string[]): string {
  if (/^(authorization|proxy-authorization)$/i.test(name)) return /\s/.test(value) ? `${value.split(/\s+/)[0]} ***` : '***';
  if (/^cookie$/i.test(name)) return value.replace(/=([^;]*)/g, '=***');
  return maskSecrets(value, secrets, 500);
}

type CalledResponse = ApiResponseSnapshot & { rawBody: string; rawHeaders: Record<string, string> };

const SENSITIVE_HEADERS = /^(set-cookie|authorization|proxy-authorization|cookie)$/i;

async function callApi(
  method: ApiScenario['method'],
  url: string,
  headers: Record<string, string>,
  body: string | undefined,
  secrets: string[]
): Promise<CalledResponse> {
  const started = Date.now();
  try {
    const res = await httpRequest(url, {
      method,
      headers,
      ...(body ? { body } : {}),
      timeout: REQUEST_TIMEOUT_MS
    });
    const rawBody = await res.text();
    const durationMs = Date.now() - started;
    const rawHeaders = Object.fromEntries(
      Object.entries(res.headers ?? {}).map(([name, value]) => [name.toLowerCase(), Array.isArray(value) ? value.join('; ') : String(value ?? '')])
    );
    // Cookie e token não aparecem na tela nem no relatório; as regras de cabeçalho leem os valores sem máscara
    const shownHeaders = Object.fromEntries(
      Object.entries(rawHeaders).map(([name, value]) => [name, SENSITIVE_HEADERS.test(name) ? '***' : maskSecrets(value, secrets, 300)])
    );
    const parsed = safeParse(rawBody);
    const isJson = parsed !== undefined;
    const shown = isJson ? JSON.stringify(parsed, null, 2) : rawBody;
    return {
      status: res.status,
      durationMs,
      headers: shownHeaders,
      body: maskSecrets(shown.length > MAX_BODY_SHOWN ? `${shown.slice(0, MAX_BODY_SHOWN)}\n…` : shown, secrets, MAX_BODY_SHOWN + 2, true),
      isJson,
      rawBody,
      rawHeaders
    };
  } catch (err: any) {
    return { status: 0, durationMs: Date.now() - started, headers: {}, body: '', isJson: false, error: err?.message ?? 'sem resposta', rawBody: '', rawHeaders: {} };
  }
}
