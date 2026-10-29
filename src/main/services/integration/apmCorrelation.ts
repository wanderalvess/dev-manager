import type { ApmFilter, TraceSummary } from '../../../shared/types';
import type { IntegrationTraceStep } from '../../../shared/integrationTypes';

/**
 * Correlação com o APM do Rastreio de Integração (decisão 0003): acha, na janela do rastreio, a
 * chamada da API do WinThor que o fluxo faz. Sem lote do lado WinThor, a ligação é por rota e
 * janela de tempo. Funções puras; quem consulta o APM é o service.
 */

export interface TraceWindow {
  startMs: number;
  endMs: number;
}

/** Caminho sem query string, sem barra final e em minúsculas, para comparar rota de trace com o cadastro. */
export function normalizeApiPath(path: string): string {
  return path.trim().split('?')[0].replace(/\/+$/, '').toLowerCase();
}

export function buildTraceFilter(apiPath: string, window: TraceWindow): ApmFilter {
  return { search: normalizeApiPath(apiPath), startTimeMs: window.startMs, endTimeMs: window.endMs, sortBy: 'time', limit: 100 };
}

function matchesApiPath(trace: TraceSummary, normalizedPath: string): boolean {
  const route = normalizeApiPath(trace.httpRoute ?? '');
  const root = trace.rootSpanName.toLowerCase();
  return (route !== '' && route.includes(normalizedPath)) || root.includes(normalizedPath);
}

export interface TraceMatch {
  trace: TraceSummary;
  /** Quantas chamadas da mesma rota caíram na janela. */
  totalInWindow: number;
}

/** A chamada mais recente da rota dentro da janela; `undefined` quando nenhuma casa. */
export function pickWinthorTrace(traces: TraceSummary[], apiPath: string, window: TraceWindow): TraceMatch | undefined {
  const normalized = normalizeApiPath(apiPath);
  if (!normalized) return undefined;
  const inWindow = traces.filter(
    (trace) => trace.startTimeUnixMs >= window.startMs && trace.startTimeUnixMs <= window.endMs && matchesApiPath(trace, normalized)
  );
  if (inWindow.length === 0) return undefined;
  const latest = inWindow.reduce((a, b) => (b.startTimeUnixMs > a.startTimeUnixMs ? b : a));
  return { trace: latest, totalInWindow: inWindow.length };
}

/** Passo 3 a partir do trace: erro de span ou HTTP >= 400 é falha, o resto é ok. */
export function stepFromTrace(match: TraceMatch): IntegrationTraceStep {
  const { trace, totalInWindow } = match;
  const failed = trace.hasError || (trace.httpStatusCode !== undefined && trace.httpStatusCode >= 400);
  const route = `${trace.httpMethod ?? ''} ${trace.httpRoute ?? trace.rootSpanName}`.trim();
  const extra = totalInWindow > 1 ? ` (${totalInWindow} chamadas na janela; mostrando a mais recente)` : '';
  return {
    id: 'winthor-fetch',
    status: failed ? 'failed' : 'ok',
    source: 'apm',
    startedAt: trace.startTimeUnixMs,
    durationMs: trace.durationMs,
    httpStatus: trace.httpStatusCode,
    evidence: `${route} · trace ${trace.traceId}${trace.hasDatabaseQuery ? ' · com SQL' : ''}`,
    message: failed
      ? `A API do WinThor respondeu com erro${trace.httpStatusCode ? ` (HTTP ${trace.httpStatusCode})` : ''}${extra}.`
      : `API do WinThor observada no APM${extra}.`
  };
}
