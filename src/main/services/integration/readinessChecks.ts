import type { HttpHealthResult, ServiceState } from '../../../shared/types';
import type { WinThorLoginResult } from '../../../shared/httpClientTypes';
import type { IntegrationReadinessCheck } from '../../../shared/integrationTypes';
import type { PlannedCheck } from './readinessPlan';

/** Tudo que o pré-voo precisa do mundo externo, injetado para o plano poder ser testado sem rede, banco ou Windows. */
export interface ReadinessDeps {
  getServiceState: (name: string) => Promise<ServiceState>;
  isProcessRunning: (name: string) => Promise<boolean>;
  isPortOpen: (host: string, port: number) => Promise<boolean>;
  checkHealth: (url: string) => Promise<HttpHealthResult>;
  /** `null` quando a conexão não existe mais nas configurações. */
  testDb: (connectionId: string) => Promise<{ success: boolean; message: string; version?: string } | null>;
  loginWinthor: (url: string, user: string, password: string) => Promise<WinThorLoginResult>;
  statLog: (path: string) => Promise<{ exists: boolean; modifiedAt?: number; sizeBytes?: number }>;
}

/** Uma verificação travada não pode segurar o pré-voo inteiro. */
export const CHECK_TIMEOUT_MS = 12000;

type Outcome = Pick<IntegrationReadinessCheck, 'status' | 'detail'>;

const ok = (detail?: string): Outcome => ({ status: 'ok', detail });
const failed = (detail: string): Outcome => ({ status: 'failed', detail });
const skipped = (detail: string): Outcome => ({ status: 'skipped', detail });

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Tempo esgotado após ${Math.round(ms / 1000)} s.`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

const SERVICE_STATE_LABELS: Record<ServiceState, string> = {
  RUNNING: 'em execução',
  STOPPED: 'parado',
  START_PENDING: 'iniciando',
  STOP_PENDING: 'parando',
  UNKNOWN: 'estado desconhecido',
  NOT_INSTALLED: 'não instalado'
};

function formatLogDetail(stat: { modifiedAt?: number; sizeBytes?: number }): string {
  const when = stat.modifiedAt ? new Date(stat.modifiedAt).toLocaleString('pt-BR') : 'data desconhecida';
  const kb = stat.sizeBytes !== undefined ? ` · ${Math.max(1, Math.round(stat.sizeBytes / 1024))} KB` : '';
  return `Última escrita ${when}${kb}`;
}

async function evaluate(planned: PlannedCheck, deps: ReadinessDeps): Promise<Outcome> {
  switch (planned.kind) {
    case 'static':
      return { status: planned.status, detail: planned.detail };
    case 'service': {
      const state = await deps.getServiceState(planned.name);
      return state === 'RUNNING' ? ok(SERVICE_STATE_LABELS[state]) : failed(`Serviço ${SERVICE_STATE_LABELS[state]}.`);
    }
    case 'process':
      return (await deps.isProcessRunning(planned.name)) ? ok('em execução') : failed('Processo não encontrado.');
    case 'port':
      return (await deps.isPortOpen(planned.host, planned.port))
        ? ok(`${planned.host}:${planned.port} aceitando conexões`)
        : failed(`Nada escutando em ${planned.host}:${planned.port}.`);
    case 'health': {
      const health = await deps.checkHealth(planned.url);
      const status = health.statusCode ?? health.status;
      if (health.reachable && health.isHealthy !== false) return ok(`HTTP ${status ?? '?'} · ${health.responseTimeMs ?? health.timeMs} ms`);
      return failed(status ? `HTTP ${status} ${health.statusText ?? ''}`.trim() : health.error || 'Sem resposta.');
    }
    case 'db': {
      const result = await deps.testDb(planned.connectionId);
      if (!result) return failed('Conexão não encontrada nas configurações do DB Studio.');
      return result.success ? ok(result.version ? `Conectado · ${result.version}` : 'Conectado') : failed(result.message);
    }
    case 'winthor-login': {
      const login = await deps.loginWinthor(planned.url, planned.user, planned.password);
      // O token nunca aparece no resultado: só o fato de ter sido emitido
      return login.success ? ok(`HTTP ${login.statusCode ?? 200} · token obtido · ${login.durationMs ?? 0} ms`) : failed(login.error || 'Login recusado.');
    }
    case 'log': {
      const stat = await deps.statLog(planned.path);
      return stat.exists ? ok(formatLogDetail(stat)) : skipped('Arquivo ainda não existe; o serviço o cria ao gravar.');
    }
  }
}

/** Executa uma verificação medindo a duração; qualquer exceção ou estouro de tempo vira falha, nunca derruba o pré-voo. */
export async function runPlannedCheck(
  planned: PlannedCheck,
  deps: ReadinessDeps,
  timeoutMs: number = CHECK_TIMEOUT_MS
): Promise<IntegrationReadinessCheck> {
  const started = Date.now();
  let outcome: Outcome;
  try {
    outcome = await withTimeout(evaluate(planned, deps), timeoutMs);
  } catch (error) {
    outcome = failed((error as Error)?.message || 'Falha inesperada na verificação.');
  }
  return { label: planned.label, ...outcome, durationMs: Date.now() - started };
}
