import { describe, expect, it } from 'vitest';
import type { TraceSummary } from '../../../shared/types';
import { buildTraceFilter, normalizeApiPath, pickWinthorTrace, stepFromTrace } from './apmCorrelation';

const makeTrace = (overrides: Partial<TraceSummary> = {}): TraceSummary => ({
  traceId: 't-1',
  rootSpanName: 'GET /winthor/vendas/v1/pedidos',
  serviceName: 'karaf-winthor',
  httpMethod: 'GET',
  httpRoute: '/winthor/vendas/v1/pedidos',
  httpStatusCode: 200,
  startTimeUnixMs: 1_000,
  durationMs: 1800,
  spanCount: 12,
  hasError: false,
  errorCount: 0,
  hasDatabaseQuery: true,
  ...overrides
});

const window = { startMs: 0, endMs: 10_000 };

describe('apmCorrelation', () => {
  it('normaliza caminho: sem query, sem barra final, minúsculo', () => {
    expect(normalizeApiPath(' /Winthor/Vendas/v1/Pedidos/?a=1 ')).toBe('/winthor/vendas/v1/pedidos');
  });

  it('monta o filtro do APM com busca pela rota e a janela', () => {
    expect(buildTraceFilter('/Winthor/Pedidos?x=1', window)).toEqual({
      search: '/winthor/pedidos',
      startTimeMs: 0,
      endTimeMs: 10_000,
      sortBy: 'time',
      limit: 100
    });
  });

  it('escolhe a chamada mais recente da rota dentro da janela e conta as demais', () => {
    const traces = [
      makeTrace({ traceId: 'velho', startTimeUnixMs: 2_000 }),
      makeTrace({ traceId: 'novo', startTimeUnixMs: 8_000 }),
      makeTrace({ traceId: 'fora', startTimeUnixMs: 99_000 }),
      makeTrace({ traceId: 'outra-rota', httpRoute: '/winthor/clientes', rootSpanName: 'GET /winthor/clientes', startTimeUnixMs: 9_000 })
    ];
    const match = pickWinthorTrace(traces, '/winthor/vendas/v1/pedidos', window);
    expect(match?.trace.traceId).toBe('novo');
    expect(match?.totalInWindow).toBe(2);
  });

  it('casa pelo nome do span raiz quando o trace não tem httpRoute', () => {
    const match = pickWinthorTrace([makeTrace({ httpRoute: undefined })], '/winthor/vendas/v1/pedidos', window);
    expect(match?.trace.traceId).toBe('t-1');
  });

  it('sem caminho ou sem trace na janela não devolve nada', () => {
    expect(pickWinthorTrace([makeTrace()], '', window)).toBeUndefined();
    expect(pickWinthorTrace([makeTrace({ startTimeUnixMs: 50_000 })], '/winthor/vendas/v1/pedidos', window)).toBeUndefined();
    expect(pickWinthorTrace([], '/x', window)).toBeUndefined();
  });

  it('passo ok com duração, status HTTP e referência ao trace', () => {
    const step = stepFromTrace({ trace: makeTrace(), totalInWindow: 1 });
    expect(step).toMatchObject({ id: 'winthor-fetch', status: 'ok', source: 'apm', durationMs: 1800, httpStatus: 200 });
    expect(step.evidence).toBe('GET /winthor/vendas/v1/pedidos · trace t-1 · com SQL');
    expect(step.message).toBe('API do WinThor observada no APM.');
  });

  it('erro de span ou HTTP 4xx/5xx é falha, e várias chamadas são avisadas', () => {
    expect(stepFromTrace({ trace: makeTrace({ hasError: true, httpStatusCode: 200 }), totalInWindow: 1 }).status).toBe('failed');
    const failed = stepFromTrace({ trace: makeTrace({ httpStatusCode: 500 }), totalInWindow: 3 });
    expect(failed.status).toBe('failed');
    expect(failed.message).toBe('A API do WinThor respondeu com erro (HTTP 500) (3 chamadas na janela; mostrando a mais recente).');
  });
});
