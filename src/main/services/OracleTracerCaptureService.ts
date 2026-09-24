import { DatabaseService } from './DatabaseService';
import {
  DatabaseConnectionConfig,
  OracleCaptureOptions,
  OracleCaptureState,
  OracleRecentStatement,
  OracleSessionCaptureEntry
} from '../../shared/types';

// Intervalo mínimo protege o Oracle e o app de captura configurada acidentalmente
// pra rodar a cada poucos ms — v$session/v$sql são views leves, mas ainda assim
// não faz sentido bater nelas mais rápido que isso.
const MIN_INTERVAL_MS = 2000;
const MAX_STATEMENTS = 300;
const MAX_SESSION_EVENTS = 500;
// Trava de segurança: se o usuário esquecer a captura ligada, ela se encerra sozinha
// em vez de ficar consultando o Oracle indefinidamente em segundo plano.
const MAX_CAPTURE_DURATION_MS = 30 * 60 * 1000;

interface CaptureRuntime {
  config: DatabaseConnectionConfig;
  intervalMs: number;
  schemaFilter?: string;
  textFilter?: string;
  timer: ReturnType<typeof setInterval> | null;
  autoStopTimer: ReturnType<typeof setTimeout> | null;
  isCapturing: boolean;
  startedAt: number | null;
  pollCount: number;
  lastPolledAt: number | null;
  lastError: string | null;
  statements: Map<string, OracleRecentStatement>;
  sessionEvents: OracleSessionCaptureEntry[];
  lastSqlIdBySession: Map<string, string>;
}

/**
 * Captura contínua de atividade Oracle (Statement Tracer) em segundo plano no processo
 * dono do app (Electron main ou server web), pra sobreviver a troca de aba/página na UI —
 * ao contrário de um polling preso ao componente React, que morre quando a tela desmonta.
 * Vive só em memória (como o buffer de traces do ApmService): não atravessa processos, então
 * o MCP (processo separado) tem sua própria instância — as capturas iniciadas pela IA e pela
 * tela do app são independentes. Ao contrário do APM, não há buffer do app a consultar: quem
 * liga a captura é quem a lê, e ela não disputa nenhum recurso com o app (nem porta).
 */
export class OracleTracerCaptureService {
  private captures = new Map<string, CaptureRuntime>();

  constructor(private databaseService: DatabaseService) {}

  startCapture(config: DatabaseConnectionConfig, options: OracleCaptureOptions): OracleCaptureState {
    if (config.type !== 'oracle') {
      throw new Error('Captura contínua do Statement Tracer disponível apenas para conexões Oracle.');
    }

    this.clearCapture(config.id);

    const intervalMs = Math.max(MIN_INTERVAL_MS, Math.floor(options.intervalMs) || MIN_INTERVAL_MS);
    const runtime: CaptureRuntime = {
      config,
      intervalMs,
      schemaFilter: options.schemaFilter,
      textFilter: options.textFilter,
      timer: null,
      autoStopTimer: null,
      isCapturing: true,
      startedAt: Date.now(),
      pollCount: 0,
      lastPolledAt: null,
      lastError: null,
      statements: new Map(),
      sessionEvents: [],
      lastSqlIdBySession: new Map()
    };
    this.captures.set(config.id, runtime);

    const poll = () => this.poll(config.id);
    runtime.timer = setInterval(poll, intervalMs);
    runtime.autoStopTimer = setTimeout(() => this.stopCapture(config.id), MAX_CAPTURE_DURATION_MS);
    // Captura esquecida não pode manter vivo um processo que já deveria ter encerrado
    // (ex.: o servidor MCP depois que o cliente desconecta do stdio).
    runtime.timer.unref?.();
    runtime.autoStopTimer.unref?.();
    poll();

    return this.getCaptureState(config.id);
  }

  stopCapture(connectionId: string): OracleCaptureState {
    const runtime = this.captures.get(connectionId);
    if (runtime) {
      if (runtime.timer) clearInterval(runtime.timer);
      if (runtime.autoStopTimer) clearTimeout(runtime.autoStopTimer);
      runtime.timer = null;
      runtime.autoStopTimer = null;
      runtime.isCapturing = false;
    }
    return this.getCaptureState(connectionId);
  }

  clearCapture(connectionId: string): OracleCaptureState {
    this.stopCapture(connectionId);
    this.captures.delete(connectionId);
    return this.getCaptureState(connectionId);
  }

  getCaptureState(connectionId: string): OracleCaptureState {
    const runtime = this.captures.get(connectionId);
    if (!runtime) {
      return {
        isCapturing: false,
        startedAt: null,
        intervalMs: 0,
        pollCount: 0,
        lastPolledAt: null,
        lastError: null,
        statements: [],
        sessionEvents: []
      };
    }

    return {
      isCapturing: runtime.isCapturing,
      startedAt: runtime.startedAt ? new Date(runtime.startedAt).toISOString() : null,
      intervalMs: runtime.intervalMs,
      pollCount: runtime.pollCount,
      lastPolledAt: runtime.lastPolledAt ? new Date(runtime.lastPolledAt).toISOString() : null,
      lastError: runtime.lastError,
      statements: [...runtime.statements.values()].sort((a, b) => timeDesc(a.lastActiveTime, b.lastActiveTime)),
      sessionEvents: runtime.sessionEvents
    };
  }

  private async poll(connectionId: string): Promise<void> {
    const runtime = this.captures.get(connectionId);
    if (!runtime) return;

    const filter = { schemaFilter: runtime.schemaFilter, textFilter: runtime.textFilter };
    const [sessionsRes, statementsRes] = await Promise.all([
      this.databaseService.getOracleActiveSessions(runtime.config, filter),
      this.databaseService.getOracleRecentStatements(runtime.config, filter)
    ]);

    // A captura pode ter sido parada/limpa enquanto as duas consultas acima estavam em voo.
    if (!this.captures.has(connectionId)) return;

    runtime.pollCount += 1;
    runtime.lastPolledAt = Date.now();
    runtime.lastError = null;

    if (statementsRes.success) {
      for (const stmt of statementsRes.statements) {
        runtime.statements.set(stmt.sqlId, stmt);
      }
      if (runtime.statements.size > MAX_STATEMENTS) {
        const trimmed = [...runtime.statements.values()]
          .sort((a, b) => timeDesc(a.lastActiveTime, b.lastActiveTime))
          .slice(0, MAX_STATEMENTS);
        runtime.statements = new Map(trimmed.map((s) => [s.sqlId, s]));
      }
    } else {
      runtime.lastError = statementsRes.error || 'Falha ao consultar SQL recente no Oracle.';
    }

    if (sessionsRes.success) {
      const capturedAt = new Date().toISOString();
      for (const session of sessionsRes.sessions) {
        if (!session.sqlId) continue;
        const key = `${session.sid}-${session.serialNum}`;
        if (runtime.lastSqlIdBySession.get(key) === session.sqlId) continue;
        runtime.lastSqlIdBySession.set(key, session.sqlId);
        runtime.sessionEvents.unshift({ ...session, capturedAt });
      }
      if (runtime.sessionEvents.length > MAX_SESSION_EVENTS) {
        runtime.sessionEvents.length = MAX_SESSION_EVENTS;
      }
    } else if (!runtime.lastError) {
      runtime.lastError = sessionsRes.error || 'Falha ao consultar sessões ativas no Oracle.';
    }
  }
}

function timeDesc(a: string | null, b: string | null): number {
  return new Date(b || 0).getTime() - new Date(a || 0).getTime();
}
