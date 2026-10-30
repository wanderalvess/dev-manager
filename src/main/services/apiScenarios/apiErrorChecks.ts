import { EXPOSURE_LABELS, detectExposure, exposureExcerpts, isBlockingExposure } from '../../../shared/authLockoutAnalysis';
import type { ExposureFinding } from '../../../shared/authLockoutTypes';
import { describeRule } from '../../../shared/apiRuleText';
import type { ApiRule, ApiRuleResult } from '../../../shared/apiScenarioTypes';
import { karafServicesLogPath } from '../../../shared/integrationInheritance';
import { httpRequest } from '../../utils/httpRequest';
import { isLogFilePath, isSafeUrl } from '../../utils/security';
import { logFileSize, logsApiLines, readLogSince } from '../authLockout/lockoutLogSources';
import { REQUEST_TIMEOUT_MS, normalizeWtaUrl, type Note, type RunnerSettings } from './apiWtaAuth';

/** Tentativas de achar o registro: o log é gravado de forma assíncrona e pode chegar um pouco depois da resposta. */
const LOG_ATTEMPTS = 3;
const LOG_RETRY_MS = 1000;
export const DEFAULT_LOGS_PATH = '/winthor/ferramenta/servidor/v1/logs';

export interface ResponseExposure {
  findings: ExposureFinding[];
  /** O trecho que denunciou cada achado técnico (ver `exposureExcerpts`). */
  excerpts: Partial<Record<ExposureFinding, string>>;
}

/** Exceção não mapeada: a resposta não pode trazer detalhe interno. Versão do servidor no cabeçalho não reprova. */
export function evaluateLeakRule(rule: ApiRule, exposure: ResponseExposure, status: number): ApiRuleResult {
  const base = { ruleId: rule.id, label: describeRule(rule), expected: 'nenhum vazamento' };
  if (status === 0) return { ...base, passed: false, actual: 'sem resposta' };
  const blocking = exposure.findings.filter(isBlockingExposure);
  const soft = exposure.findings.includes('server-version') ? ` (atenção: ${EXPOSURE_LABELS['server-version']})` : '';
  if (blocking.length === 0) return { ...base, passed: true, actual: `nenhum vazamento${soft}` };
  // Cada achado com o trecho que o denunciou: o QA vê na hora o que a API devolveu
  const parts = blocking.map((f) => (exposure.excerpts[f] ? `${EXPOSURE_LABELS[f]} (${exposure.excerpts[f]})` : EXPOSURE_LABELS[f]));
  return { ...base, passed: false, actual: `expôs ${parts.join('; ')}` };
}

export function responseExposure(body: string, headers: Record<string, string>, secrets: string[]): ResponseExposure {
  const input = { body, headers, secrets };
  const findings = detectExposure(input);
  return { findings, excerpts: findings.length ? exposureExcerpts(input) : {} };
}

/** Onde o winthor.log estava antes da chamada: só o que for escrito depois conta. */
export interface LogProbe {
  filePath?: string;
  offset?: number;
}

export function startLogProbe(settings: RunnerSettings): LogProbe {
  const filePath = karafServicesLogPath(settings.karafPath);
  // Mesma regra do visualizador de logs: só arquivo com extensão de log
  if (!filePath || !isLogFilePath(filePath)) return {};
  return { filePath, offset: logFileSize(filePath) };
}

export function logsApiUrl(rule: ApiRule, settings: RunnerSettings): string {
  const custom = rule.path?.trim();
  const wta = normalizeWtaUrl(settings.wtaUrl);
  return custom ? custom.replace(/\{\{\s*wtaUrl\s*\}\}/gi, wta) : `${wta}${DEFAULT_LOGS_PATH}`;
}

export interface LogLookupDeps {
  settings: RunnerSettings;
  probe: LogProbe;
  /** Token para a API de logs (o login do WTA de Configurações). */
  getToken: () => Promise<string | undefined>;
  note: Note;
  sleep?: (ms: number) => Promise<void>;
}

async function searchFile(probe: LogProbe, needle: string): Promise<string> {
  if (!probe.filePath) return 'winthor.log não configurado (pasta do Karaf em Configurações)';
  const read = readLogSince(probe.filePath, probe.offset);
  if (!read.found) return `winthor.log não encontrado em ${probe.filePath}`;
  const hit = read.lines.find((line) => line.includes(needle));
  return hit ? `found:${hit}` : `não apareceu nas ${read.lines.length} linha(s) novas do winthor.log`;
}

async function searchApi(url: string, needle: string, token: string | undefined): Promise<string> {
  if (!isSafeUrl(url)) return `URL da API de logs inválida: ${url}`;
  try {
    const res = await httpRequest(url, {
      method: 'GET',
      headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}`, Cookie: `suukie=${token}` } : {}) },
      timeout: REQUEST_TIMEOUT_MS
    });
    if (!res.ok) return `a API de logs respondeu HTTP ${res.status}`;
    const hit = logsApiLines(await res.text()).find((line) => line.includes(needle));
    return hit ? `found:${hit}` : 'não apareceu na API de logs';
  } catch (err: any) {
    return `a API de logs não respondeu (${err?.message ?? 'erro'})`;
  }
}

/** Registrado no log: procura o texto (com {{requestId}} já trocado) no winthor.log novo e/ou na API de logs. */
export async function evaluateLogRule(rule: ApiRule, needle: string, deps: LogLookupDeps): Promise<ApiRuleResult> {
  const source = rule.logSource ?? 'any';
  const base = { ruleId: rule.id, label: describeRule(rule), expected: `"${needle}" no ${source === 'api' ? 'log da API' : source === 'file' ? 'winthor.log' : 'log'}` };
  const sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const token = source === 'file' ? undefined : await deps.getToken();
  const url = logsApiUrl(rule, deps.settings);
  let misses: string[] = [];
  for (let attempt = 1; attempt <= LOG_ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(LOG_RETRY_MS);
    const results = [
      ...(source !== 'api' ? [{ where: 'winthor.log', text: await searchFile(deps.probe, needle) }] : []),
      ...(source !== 'file' ? [{ where: 'API de logs', text: await searchApi(url, needle, token) }] : [])
    ];
    const hit = results.find((r) => r.text.startsWith('found:'));
    if (hit) {
      deps.note(`Registro encontrado no ${hit.where} (tentativa ${attempt}).`);
      return { ...base, passed: true, actual: `${hit.where}: ${hit.text.slice('found:'.length).trim().slice(0, 160)}` };
    }
    misses = results.map((r) => `${r.where}: ${r.text}`);
    deps.note(`Registro ainda não apareceu (tentativa ${attempt} de ${LOG_ATTEMPTS}).`);
  }
  return { ...base, passed: false, actual: misses.join('; ') };
}
