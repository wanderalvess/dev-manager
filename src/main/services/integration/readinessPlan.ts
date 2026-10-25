import type {
  IntegrationCheckStatus,
  IntegrationLayerConfig,
  IntegrationLayerReadinessStatus,
  IntegrationReadinessCheck,
  IntegrationReadinessResult
} from '../../../shared/integrationTypes';
import { isLogFilePath, isSafeUrl } from '../../utils/security';

/**
 * Planejamento puro do pré-voo (decisão 0003): transforma a configuração de uma camada na lista
 * de verificações a executar. Só o que foi preenchido gera verificação; quando algo foi
 * preenchido mas não dá para provar (ex.: URL sem caminho de health), a verificação nasce
 * `skipped`, que deixa a camada em aviso em vez de fingir que está ok.
 */

export const WINTHOR_LOGIN_PATH = '/winthor/autenticacao/v1/login';

export type PlannedCheck =
  | { kind: 'service'; label: string; name: string }
  | { kind: 'process'; label: string; name: string }
  | { kind: 'port'; label: string; host: string; port: number }
  | { kind: 'health'; label: string; url: string }
  | { kind: 'db'; label: string; connectionId: string }
  | { kind: 'winthor-login'; label: string; url: string; user: string; password: string }
  | { kind: 'log'; label: string; path: string }
  | { kind: 'static'; label: string; status: IntegrationCheckStatus; detail: string };

export function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.trim().replace(/\/+$/, '');
  const rest = path.trim();
  if (!rest) return base;
  return rest.startsWith('/') ? `${base}${rest}` : `${base}/${rest}`;
}

/** `localhost` vira 127.0.0.1: em máquinas com Docker/WSL, `::1` pode ser atendido por outro processo. */
function probeHost(hostname: string): string {
  const bare = hostname.replace(/^\[|\]$/g, '');
  return !bare || bare.toLowerCase() === 'localhost' ? '127.0.0.1' : bare;
}

export interface ResolvedEndpoint {
  host: string;
  port?: number;
}

/** Host e porta de teste: a porta explícita vence; sem ela, usa a da URL (ou 80/443 pelo protocolo). */
export function resolveEndpoint(layer: IntegrationLayerConfig, validBaseUrl: string | undefined): ResolvedEndpoint {
  let host = '127.0.0.1';
  let urlPort: number | undefined;
  if (validBaseUrl) {
    const parsed = new URL(validBaseUrl);
    host = probeHost(parsed.hostname);
    urlPort = parsed.port ? parseInt(parsed.port, 10) : parsed.protocol === 'https:' ? 443 : 80;
  }
  return { host, port: layer.port ?? urlPort };
}

function planAddress(layer: IntegrationLayerConfig, baseUrl: string | undefined): PlannedCheck[] {
  const planned: PlannedCheck[] = [];
  const healthPath = layer.healthPath?.trim();
  const endpoint = resolveEndpoint(layer, baseUrl);
  if (baseUrl && healthPath) {
    planned.push({ kind: 'health', label: 'Health HTTP', url: joinUrl(baseUrl, healthPath) });
  } else if (baseUrl) {
    planned.push({
      kind: 'static',
      label: 'Health HTTP',
      status: 'skipped',
      detail: 'Caminho de health não configurado; só a porta foi testada.'
    });
  }
  // Com health ok a porta é redundante; só entra quando foi pedida ou quando não há health
  const needsPort = layer.port !== undefined || (baseUrl && !healthPath);
  if (needsPort && endpoint.port) {
    planned.push({ kind: 'port', label: `Porta ${endpoint.port}`, host: endpoint.host, port: endpoint.port });
  }
  return planned;
}

function planWinthorLogin(layer: IntegrationLayerConfig, baseUrl: string | undefined): PlannedCheck[] {
  if (layer.layer !== 'winthor' || layer.auth?.type !== 'winthor' || !baseUrl) return [];
  const user = layer.auth.user?.trim() ?? '';
  const password = layer.auth.password ?? '';
  if (!user || !password) {
    return [{ kind: 'static', label: 'Login WinThor', status: 'skipped', detail: 'Usuário ou senha do WinThor não informados.' }];
  }
  return [{ kind: 'winthor-login', label: 'Login WinThor', url: joinUrl(baseUrl, WINTHOR_LOGIN_PATH), user, password }];
}

function planLocal(layer: IntegrationLayerConfig): PlannedCheck[] {
  const planned: PlannedCheck[] = [];
  const service = layer.windowsServiceName?.trim();
  const processName = layer.processName?.trim();
  const logPath = layer.logFilePath?.trim();
  if (service) planned.push({ kind: 'service', label: `Serviço ${service}`, name: service });
  if (processName) planned.push({ kind: 'process', label: `Processo ${processName}`, name: processName });
  if (layer.dbConnectionId) planned.push({ kind: 'db', label: 'Banco de dados', connectionId: layer.dbConnectionId });
  if (logPath) {
    planned.push(
      isLogFilePath(logPath)
        ? { kind: 'log', label: 'Arquivo de log', path: logPath }
        : { kind: 'static', label: 'Arquivo de log', status: 'failed', detail: 'Caminho inválido: use um arquivo .log, .out ou .txt.' }
    );
  }
  return planned;
}

export function planLayerChecks(layer: IntegrationLayerConfig): PlannedCheck[] {
  const rawUrl = layer.baseUrl?.trim();
  if (rawUrl && !isSafeUrl(rawUrl)) {
    return [
      { kind: 'static', label: 'URL base', status: 'failed', detail: 'URL inválida ou não permitida (use http:// ou https://).' },
      ...planLocal(layer)
    ];
  }
  const baseUrl = rawUrl || undefined;
  return [...planAddress(layer, baseUrl), ...planWinthorLogin(layer, baseUrl), ...planLocal(layer)];
}

/** Sem verificação a camada não está configurada; falha pesa mais que aviso; aviso mais que ok. */
export function deriveLayerStatus(checks: IntegrationReadinessCheck[]): IntegrationLayerReadinessStatus {
  if (checks.length === 0) return 'not-configured';
  if (checks.some((check) => check.status === 'failed')) return 'failed';
  if (checks.some((check) => check.status === 'skipped')) return 'warning';
  return 'ok';
}

export interface ReadinessSummary {
  /** Pronto para testar: nenhuma camada falhou e pelo menos uma foi verificada. */
  ready: boolean;
  configured: number;
  ok: number;
  warning: number;
  failed: number;
  notConfigured: number;
}

export function summarizeReadiness(result: IntegrationReadinessResult): ReadinessSummary {
  const count = (status: IntegrationLayerReadinessStatus) => result.layers.filter((layer) => layer.status === status).length;
  const summary = {
    ok: count('ok'),
    warning: count('warning'),
    failed: count('failed'),
    notConfigured: count('not-configured')
  };
  const configured = result.layers.length - summary.notConfigured;
  return { ...summary, configured, ready: configured > 0 && summary.failed === 0 };
}
