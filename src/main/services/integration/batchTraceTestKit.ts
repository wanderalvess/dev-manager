import { vi } from 'vitest';
import type { TraceSummary } from '../../../shared/types';
import type { IntegrationFlowDefinition } from '../../../shared/integrationTypes';
import { describeStatus } from '../../../shared/pdvSyncBatch';
import type { runBatchTrace, BatchTraceDeps, BatchTraceInputs } from './batchTrace';
import type { PdvSyncLookup, PdvSyncStore } from './pdvSyncClient';

/** Fixtures compartilhadas pelos testes de `runBatchTrace` (separados por tema para cada arquivo caber no teto). */

export const T0 = new Date(2026, 9, 25, 12, 0, 0).getTime();

export const makeFlow = (overrides: Partial<IntegrationFlowDefinition> = {}): IntegrationFlowDefinition => ({
  id: 'produto',
  name: 'Produto',
  chBatchType: '12',
  winthorApiPath: '/winthor/produtos/v1/produtos',
  evidence: {
    oracleQuery: 'select count(*) from pcprodut where numlote = :lote',
    pdvQuery: 'select count(*) from produto where lote = :lote and dt >= :inicio',
    pdvWaitSeconds: 6
  },
  ...overrides
});

export const layers: BatchTraceInputs['layers'] = {
  winthor: { layer: 'winthor', dbConnectionId: 'ora' },
  wsh: { layer: 'wsh', logFilePath: 'C:\\wsh\\wsh.log' },
  ch: { layer: 'ch', logFilePath: 'C:\\ch\\ch.log' },
  pdv: { layer: 'pdv', dbConnectionId: 'pg' }
};

export const apmTrace = (overrides: Partial<TraceSummary> = {}): TraceSummary => ({
  traceId: 'tr-1', rootSpanName: 'GET /winthor/produtos/v1/produtos', serviceName: 'karaf', httpMethod: 'GET',
  httpRoute: '/winthor/produtos/v1/produtos', httpStatusCode: 200, startTimeUnixMs: T0 - 5_000, durationMs: 900,
  spanCount: 4, hasError: false, errorCount: 0, hasDatabaseQuery: true, ...overrides
});

export const store = (branchId: string, code: number, errors: PdvSyncStore['errors'] = []): PdvSyncStore => ({
  branchId, statusCode: code, status: describeStatus(code), errors
});
export const lookupWith = (code: number, stores: PdvSyncStore[] = []): PdvSyncLookup => ({
  batch: { found: true, batchNumber: '48213', statusCode: code, status: describeStatus(code) },
  stores,
  durationMs: 30
});

export function makeDeps(overrides: Partial<BatchTraceDeps> = {}) {
  let clock = T0;
  const runQuery = vi.fn(async (_connectionId: string, _sql?: string, _binds?: Record<string, string>) => ({ success: true, rows: [{ c: 12 }] }));
  const lookupPdvSync = vi.fn(async (_batch: string, _branch?: string): Promise<PdvSyncLookup | null> => lookupWith(5, [store('1', 5), store('2', 5)]));
  const deps: BatchTraceDeps = {
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
    newId: () => 't-1',
    runQuery,
    getTraces: vi.fn(async () => [apmTrace()]),
    readLogLines: vi.fn(async (path: string) => (path.includes('wsh') ? ['10:00 INFO lote 48213 aberto'] : ['10:01 INFO lote 48213 recebido'])),
    lookupPdvSync,
    ...overrides
  };
  return { deps, runQuery, lookupPdvSync };
}

export const inputs = (flow = makeFlow(), configured = layers, branchId?: string): BatchTraceInputs => ({
  request: { flowId: 'produto', batchNumber: '48213', lookbackMinutes: 120, ...(branchId ? { branchId } : {}) },
  flow,
  layers: configured
});
export const stepOf = (result: Awaited<ReturnType<typeof runBatchTrace>>, id: string) => result.steps.find((s) => s.id === id)!;
export const pgCalls = (runQuery: ReturnType<typeof vi.fn>) => runQuery.mock.calls.filter((c) => c[0] === 'pg');
