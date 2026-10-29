import { describe, expect, it, vi } from 'vitest';
import { runBatchTrace } from './batchTrace';
import { inputs, layers, lookupWith, makeDeps, makeFlow, pgCalls, stepOf, store } from './batchTraceTestKit';

describe('runBatchTrace: dados para a vista animada e o modo ao vivo', () => {
  it('guarda os parâmetros do pedido e o status de cada loja', async () => {
    const { deps } = makeDeps({ lookupPdvSync: vi.fn(async () => lookupWith(4, [store('1', 5), store('2', 4)])) });
    const result = await runBatchTrace(inputs(makeFlow(), layers, '12'), deps);

    expect(result.request).toEqual({ lookbackMinutes: 120, branchId: '12' });
    expect(result.stores?.map((s) => [s.branchId, s.status])).toEqual([['1', 'ok'], ['2', 'pending']]);
  });

  it('reconsulta mantém o id do rastreio e não espera o banco do PDV, mesmo com as lojas baixando', async () => {
    const { deps } = makeDeps({
      lookupPdvSync: vi.fn(async () => lookupWith(4, [store('1', 4)])),
      runQuery: vi.fn(async (id: string) => ({ success: true, rows: [{ c: id === 'ora' ? 12 : 0 }] }))
    });
    const result = await runBatchTrace({ ...inputs(), refresh: { id: 't-antigo' } }, deps);

    expect(result.id).toBe('t-antigo');
    expect(pgCalls(deps.runQuery as ReturnType<typeof vi.fn>)).toHaveLength(1);
    expect(stepOf(result, 'pdv-arrival').status).toBe('pending');
  });

  it('sem o PDVSync configurado não há lojas', async () => {
    const result = await runBatchTrace(inputs(), makeDeps({ lookupPdvSync: vi.fn(async () => null) }).deps);
    expect(result.stores).toEqual([]);
  });
});
