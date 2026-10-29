import { maskSecrets } from '../../../shared/authLockoutAnalysis';
import { describeRule } from '../../../shared/apiRuleText';
import { buildApiScenarioMarkdown } from '../../../shared/apiScenarioReport';
import type { ApiResponseSnapshot, ApiRuleResult, ApiScenario, ApiScenarioRunResult } from '../../../shared/apiScenarioTypes';
import type { AuthLockoutLogEntry } from '../../../shared/authLockoutTypes';
import type { AppSettings } from '../../../shared/types';
import { httpRequest } from '../../utils/httpRequest';
import { isSafeUrl } from '../../utils/security';
import { encodeWtaPassword } from '../authLockout/wtaPassword';
import { evaluateRule } from './apiRules';

export type RunnerSettings = Partial<Pick<AppSettings, 'wtaUrl' | 'wtaLogin' | 'wtaPassword' | 'wtaAuthToken'>>;

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_BODY_SHOWN = 8 * 1024;

export function normalizeWtaUrl(raw: string | undefined): string {
  let url = (raw || 'http://localhost:8889').trim();
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, '');
}

export function resolveScenarioUrl(url: string, settings: RunnerSettings): string {
  return url.replace(/\{\{\s*wtaUrl\s*\}\}/gi, normalizeWtaUrl(settings.wtaUrl));
}

/** Uma execução: narra cada etapa (mesmo formato do Bloqueio de Login) e devolve o confronto regra a regra. */
export async function runApiScenario(
  scenario: ApiScenario,
  settings: RunnerSettings,
  onLog: (entry: AuthLockoutLogEntry) => void = () => {}
): Promise<ApiScenarioRunResult> {
  const startedAt = new Date().toISOString();
  const log: AuthLockoutLogEntry[] = [];
  const note = (message: string, level: AuthLockoutLogEntry['level'] = 'action', extra: Partial<AuthLockoutLogEntry> = {}) => {
    const entry = { at: new Date().toISOString(), level, message, ...extra };
    log.push(entry);
    onLog(entry);
  };
  const secrets: string[] = [];
  const url = resolveScenarioUrl(scenario.url, settings);
  const finish = (partial: Pick<ApiScenarioRunResult, 'success' | 'rules'> & Partial<ApiScenarioRunResult>): ApiScenarioRunResult => {
    const base = {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      startedAt,
      finishedAt: new Date().toISOString(),
      request: { method: scenario.method, url },
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

  const headers: Record<string, string> = { Accept: 'application/json' };
  for (const h of scenario.headers) headers[h.key] = h.value;
  if (scenario.body && !Object.keys(headers).some((k) => k.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json';

  if (scenario.auth === 'settings-wta') {
    const token = await wtaToken(settings, note, secrets);
    if (!token) {
      const error = 'Não foi possível autenticar no WTA com o login de Configurações (confira login e senha em Configurações).';
      note(error, 'error');
      return finish({ success: false, rules: [], error });
    }
    headers.Authorization = `Bearer ${token}`;
    headers.Cookie = `suukie=${token}`;
  }

  note(`Chamando ${scenario.method} ${url}${scenario.auth === 'settings-wta' ? ' com o token do WTA' : ' sem autenticação'}.`);
  const response = await callApi(scenario, url, headers, secrets);
  note(
    response.status ? `Resposta: HTTP ${response.status} em ${response.durationMs} ms${response.isJson ? ' (JSON)' : ' (não é JSON)'}.` : `Sem resposta: ${response.error}.`,
    response.status ? 'action' : 'error',
    response.body ? { detail: response.body.slice(0, 300) } : {}
  );

  const json = response.isJson ? safeParse(response.rawBody) : undefined;
  const rules: ApiRuleResult[] = scenario.rules.map((rule) => {
    const evaluated = evaluateRule(rule, { status: response.status, isJson: response.isJson, json });
    // O valor obtido vai para a tela, o passo a passo e o relatório do Jira: token e senha saem mascarados como no corpo
    const result = { ...evaluated, actual: maskSecrets(evaluated.actual, secrets) };
    note(
      `${result.passed ? '✔' : '✘'} ${result.label} — ${result.passed ? `obtido ${result.actual}` : `esperado ${result.expected}, obtido ${result.actual}`}`,
      'attempt',
      { asExpected: result.passed }
    );
    return result;
  });
  const passed = rules.filter((r) => r.passed).length;
  const success = response.status > 0 && passed === rules.length;
  note(`${success ? '✅' : '❌'} ${scenario.name} — ${success ? 'OK' : 'Falhou'}: ${passed} de ${rules.length} regra(s) conferem.`, 'result', {
    status: success ? 'passed' : 'failed'
  });
  const snapshot: ApiResponseSnapshot = {
    status: response.status,
    durationMs: response.durationMs,
    body: response.body,
    isJson: response.isJson,
    ...(response.error ? { error: response.error } : {})
  };
  return finish({ success, rules, response: snapshot });
}

async function wtaToken(settings: RunnerSettings, note: (m: string, l?: AuthLockoutLogEntry['level']) => void, secrets: string[]) {
  const login = settings.wtaLogin?.trim();
  const password = settings.wtaPassword;
  if (login && password) {
    note(`Entrando no WTA com o login de Configurações (${login}) para obter o token.`);
    const loginUrl = `${normalizeWtaUrl(settings.wtaUrl)}/winthor/autenticacao/v1/login`;
    const senha = encodeWtaPassword(password);
    secrets.push(password, senha);
    try {
      const res = await httpRequest(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ login, senha }),
        timeout: REQUEST_TIMEOUT_MS
      });
      const token = safeParse(await res.text())?.accessToken;
      if (res.ok && typeof token === 'string' && token) {
        secrets.push(token);
        note('Login no WTA aceito: o token vai no cabeçalho Authorization e no cookie suukie.');
        return token;
      }
      note(`Login no WTA recusado (HTTP ${res.status}).`, 'error');
    } catch (err: any) {
      note(`Login no WTA sem resposta: ${err?.message ?? 'erro de conexão'}.`, 'error');
    }
  }
  const saved = settings.wtaAuthToken?.trim().replace(/^suukie=/, '');
  if (saved) {
    secrets.push(saved);
    note('Usando o token do WTA salvo em Configurações.');
    return saved;
  }
  return undefined;
}

async function callApi(
  scenario: ApiScenario,
  url: string,
  headers: Record<string, string>,
  secrets: string[]
): Promise<ApiResponseSnapshot & { rawBody: string }> {
  const started = Date.now();
  try {
    const res = await httpRequest(url, {
      method: scenario.method,
      headers,
      ...(scenario.body ? { body: scenario.body } : {}),
      timeout: REQUEST_TIMEOUT_MS
    });
    const rawBody = await res.text();
    const parsed = safeParse(rawBody);
    const isJson = parsed !== undefined;
    const shown = isJson ? JSON.stringify(parsed, null, 2) : rawBody;
    return {
      status: res.status,
      durationMs: Date.now() - started,
      body: maskSecrets(shown.length > MAX_BODY_SHOWN ? `${shown.slice(0, MAX_BODY_SHOWN)}\n…` : shown, secrets, MAX_BODY_SHOWN + 2, true),
      isJson,
      rawBody
    };
  } catch (err: any) {
    return { status: 0, durationMs: Date.now() - started, body: '', isJson: false, error: err?.message ?? 'sem resposta', rawBody: '' };
  }
}

function safeParse(text: string): any {
  try {
    return text.trim() ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
}
