import { describe, expect, it, vi } from 'vitest';
import type { TraceSummary } from '../../../shared/types';
import type { IntegrationFlowDefinition } from '../../../shared/integrationTypes';
import { describeStatus } from '../../../shared/pdvSyncBatch';
import { runBatchTrace, type BatchTraceDeps, type BatchTraceInputs } from './batchTrace';
import type { PdvSyncLookup, PdvSyncStore } from './pdvSyncClient';

const T0 = new Date(2026, 9, 25, 12, 0, 0).getTime();

const makeFlow = (overrides: Partial<IntegrationFlowDefinition> = {}): IntegrationFlowDefinition => ({
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

const layers: BatchTraceInputs['layers'] = {
  winthor: { layer: 'winthor', dbConnectionId: 'ora' },
  wsh: { layer: 'wsh', logFilePath: 'C:\\wsh\\wsh.log' },
  ch: { layer: 'ch', logFilePath: 'C:\\ch\\ch.log' },
  pdv: { layer: 'pdv', dbConnectionId: 'pg' }
};

const apmTrace = (overrides: Partial<TraceSummary> = {}): TraceSummary => ({
  traceId: 'tr-1', rootSpanName: 'GET /winthor/produtos/v1/produtos', serviceName: 'karaf', httpMethod: 'GET',
  httpRoute: '/winthor/produtos/v1/produtos', httpStatusCode: 200, startTimeUnixMs: T0 - 5_000, durationMs: 900,
  spanCount: 4, hasError: false, errorCount: 0, hasDatabaseQuery: true, ...overrides
});

const store = (branchId: string, code: number, errors: PdvSyncStore['errors'] = []): PdvSyncStore => ({
  branchId, statusCode: code, status: describeStatus(code), errors
});
const lookupWith = (code: number, stores: PdvSyncStore[] = []): PdvSyncLookup => ({
  batch: { found: true, batchNumber: '48213', statusCode: code, status: describeStatus(code) },
  stores,
  durationMs: 30
});

function makeDeps(overrides: Partial<BatchTraceDeps> = {}) {
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

const inputs = (flow = makeFlow(), configured = layers, branchId?: string): BatchTraceInputs => ({
  request: { flowId: 'produto', batchNumber: '48213', lookbackMinutes: 120, ...(branchId ? { branchId } : {}) },
  flow,
  layers: configured
});
const stepOf = (result: Awaited<ReturnType<typeof runBatchTrace>>, id: string) => result.steps.find((s) => s.id === id)!;
const pgCalls = (runQuery: ReturnType<typeof vi.fn>) => runQuery.mock.calls.filter((c) => c[0] === 'pg');

describe('runBatchTrace: com o PDVSync', () => {
  it('tudo certo: lote existe, foi fechado, todas as lojas baixaram; o que o WSH faz por dentro fica sem evidência', async () => {
    const { deps } = makeDeps();
    const result = await runBatchTrace(inputs(), deps);

    expect(result).toMatchObject({ id: 't-1', flowId: 'produto', batchNumber: '48213', brokenAt: undefined });
    expect(stepOf(result, 'winthor-fetch')).toMatchObject({ status: 'ok', source: 'apm', itemCount: 12, httpStatus: 200 });
    expect(stepOf(result, 'open-batch')).toMatchObject({ status: 'ok', source: 'ch-api' });
    expect(stepOf(result, 'close-batch')).toMatchObject({ status: 'ok', source: 'ch-api' });
    expect(stepOf(result, 'pdv-arrival')).toMatchObject({ status: 'ok', source: 'ch-api' });
    expect(stepOf(result, 'pdv-arrival').message).toContain('Todas as 2 lojas baixaram o lote.');
    expect(stepOf(result, 'pdv-arrival').message).toContain('Encontrado no banco do PDV');
    for (const id of ['winthor-login', 'jolt', 'pdvsync-login', 'send']) {
      expect(stepOf(result, id).status).toBe('unknown');
      expect(stepOf(result, id).message).toMatch(/^Sem evidência: /);
    }
    expect(result.logExcerpts?.map((l) => [l.source, l.totalMatches])).toEqual([['wsh', 1], ['ch', 1]]);
  });

  it('loja com erro: quebrou na chegada, com o motivo de cada erro no relatório', async () => {
    const { deps } = makeDeps({
      lookupPdvSync: vi.fn(async () => lookupWith(5, [store('1', 5), store('2', 6, [{ id: 'PROD-7', message: 'NCM inválido' }])]))
    });
    const result = await runBatchTrace(inputs(), deps);

    expect(result.brokenAt).toBe('pdv-arrival');
    expect(stepOf(result, 'pdv-arrival').message).toContain('1 de 2 loja(s) com erro ao baixar o lote (filial 2).');
    expect(result.evidenceMarkdown).toContain('**Quebrou no passo 8: Chegada nas lojas (PDV)**');
    expect(result.evidenceMarkdown).toContain('loja 2 · PROD-7: NCM inválido');
  });

  it('com a resposta final do PDVSync, o banco do PDV é consultado uma vez só, sem esperar o tempo todo', async () => {
    const { deps, runQuery } = makeDeps();
    await runBatchTrace(inputs(), deps);
    expect(pgCalls(runQuery)).toHaveLength(1);
  });

  it('PDVSync prova a chegada e o banco do PDV não acha o lote na consulta rápida: continua ok, com observação', async () => {
    const { deps } = makeDeps({ runQuery: vi.fn(async (id: string) => ({ success: true, rows: [{ c: id === 'ora' ? 12 : 0 }] })) });
    const result = await runBatchTrace(inputs(), deps);

    expect(stepOf(result, 'pdv-arrival')).toMatchObject({ status: 'ok', source: 'ch-api' });
    expect(result.notes?.some((n) => n.includes('a consulta de evidência do banco do PDV não achou o lote'))).toBe(true);
    expect(result.brokenAt).toBeUndefined();
  });

  it('PDVSync aponta erro e o banco do PDV não acha o lote: falha, sem nenhuma contradição a explicar', async () => {
    const { deps } = makeDeps({
      lookupPdvSync: vi.fn(async () => lookupWith(5, [store('2', 6, [{ id: 'PROD-7', message: 'NCM inválido' }])])),
      runQuery: vi.fn(async (id: string) => ({ success: true, rows: [{ c: id === 'ora' ? 12 : 0 }] }))
    });
    expect((await runBatchTrace(inputs(), deps)).brokenAt).toBe('pdv-arrival');
  });

  it('lojas ainda baixando e dado ausente no banco: pendente, nunca falha, e espera o tempo configurado', async () => {
    const { deps } = makeDeps({
      lookupPdvSync: vi.fn(async () => lookupWith(4, [store('1', 5), store('2', 4)])),
      runQuery: vi.fn(async (id: string) => ({ success: true, rows: [{ c: id === 'ora' ? 12 : 0 }] }))
    });
    const result = await runBatchTrace(inputs(), deps);

    expect(stepOf(result, 'pdv-arrival').status).toBe('pending');
    expect(stepOf(result, 'pdv-arrival').message).toContain('1 de 2 loja(s) baixaram o lote; 1 ainda em andamento.');
    expect(result.brokenAt).toBeUndefined();
    expect(pgCalls(deps.runQuery as ReturnType<typeof vi.fn>).length).toBeGreaterThan(1);
  });

  it('lote ainda em EmPreparacao: fechamento pendente e chegada pendente', async () => {
    const { deps } = makeDeps({ lookupPdvSync: vi.fn(async () => lookupWith(0)) });
    const result = await runBatchTrace(inputs(), deps);

    expect(stepOf(result, 'close-batch').status).toBe('pending');
    expect(stepOf(result, 'pdv-arrival').status).not.toBe('failed');
  });

  it('repassa a filial ao PDVSync e o número do lote como texto', async () => {
    const { deps, lookupPdvSync } = makeDeps();
    await runBatchTrace(inputs(makeFlow(), layers, '12'), deps);
    expect(lookupPdvSync).toHaveBeenCalledWith('48213', '12');
  });

  it('o PDVSync não conhece o lote: nada é provado por ele e a observação orienta a conferir inquilino e ambiente', async () => {
    const { deps } = makeDeps({
      lookupPdvSync: vi.fn(async () => ({ batch: { found: false, batchNumber: '48213', status: describeStatus(undefined) }, durationMs: 5 }))
    });
    const result = await runBatchTrace(inputs(), deps);

    expect(stepOf(result, 'open-batch').status).toBe('unknown');
    expect(result.notes?.some((n) => n.includes('não conhece o lote 48213'))).toBe(true);
    // a chegada passa a depender só do banco do PDV
    expect(stepOf(result, 'pdv-arrival')).toMatchObject({ status: 'ok', source: 'sql' });
  });

  it('login do PDVSync recusado vira observação e os passos dele ficam sem evidência, sem derrubar o banco do PDV', async () => {
    const { deps } = makeDeps({ lookupPdvSync: vi.fn(async () => ({ error: 'O PDVSync recusou o login (HTTP 401).', durationMs: 5 })) });
    const result = await runBatchTrace(inputs(), deps);

    expect(stepOf(result, 'open-batch').message).toContain('recusou o login');
    expect(result.notes).toContain('Consulta ao PDVSync falhou: O PDVSync recusou o login (HTTP 401).');
    expect(stepOf(result, 'pdv-arrival').source).toBe('sql');
  });
});

describe('runBatchTrace: sem o PDVSync configurado', () => {
  const semPdvSync = { lookupPdvSync: vi.fn(async () => null) };

  it('abrir e fechar ficam sem evidência com o motivo, e a chegada vem do banco do PDV', async () => {
    const { deps } = makeDeps(semPdvSync);
    const result = await runBatchTrace(inputs(), deps);

    expect(stepOf(result, 'open-batch').message).toContain('o PDVSync não está configurado na camada CH');
    expect(stepOf(result, 'close-batch').status).toBe('unknown');
    expect(stepOf(result, 'pdv-arrival')).toMatchObject({ status: 'ok', source: 'sql', itemCount: 12 });
    expect(result.notes?.some((n) => n.startsWith('PDVSync não consultado'))).toBe(true);
  });

  it('o dado não desceu no banco: falha depois da espera inteira e aponta onde quebrou', async () => {
    const { deps } = makeDeps({
      ...semPdvSync,
      runQuery: vi.fn(async (id: string) => ({ success: true, rows: [{ c: id === 'ora' ? 12 : 0 }] }))
    });
    const result = await runBatchTrace(inputs(), deps);

    expect(result.brokenAt).toBe('pdv-arrival');
    expect(stepOf(result, 'pdv-arrival').message).toMatch(/^Nenhum registro do lote no banco do PDV após 6 s \(\d+ tentativa\(s\)\)\.$/);
    expect(result.evidenceMarkdown).toContain('**Quebrou no passo 8: Chegada nas lojas (PDV)**');
  });

  it('manda só os binds usados, com :lote em texto e :inicio na janela pedida', async () => {
    const { deps, runQuery } = makeDeps(semPdvSync);
    await runBatchTrace(inputs(), deps);
    const calls = runQuery.mock.calls;

    expect(calls.find((c) => c[0] === 'ora')?.[2]).toEqual({ lote: '48213' });
    expect(calls.find((c) => c[0] === 'pg')?.[2]).toEqual({ lote: '48213', inicio: '2026-10-25 10:00:00' });
  });

  it('consulta do PDV que escreve é recusada e nem chega ao banco', async () => {
    const { deps, runQuery } = makeDeps(semPdvSync);
    const flow = makeFlow({ evidence: { pdvQuery: 'delete from produto where lote = :lote', pdvWaitSeconds: 5 } });
    const result = await runBatchTrace(inputs(flow), deps);

    expect(stepOf(result, 'pdv-arrival').status).toBe('unknown');
    expect(stepOf(result, 'pdv-arrival').message).toContain('somente leitura');
    expect(pgCalls(runQuery)).toHaveLength(0);
  });

  it('banco do PDV sem conexão ou com conexão apagada fica sem evidência', async () => {
    const semConexao = await runBatchTrace(inputs(makeFlow(), { ...layers, pdv: { layer: 'pdv' } }), makeDeps(semPdvSync).deps);
    expect(stepOf(semConexao, 'pdv-arrival').message).toContain('conexão do PDV não está configurada');

    const apagada = await runBatchTrace(
      inputs(),
      makeDeps({ ...semPdvSync, runQuery: vi.fn(async (id: string) => (id === 'pg' ? null : { success: true, rows: [{ c: 1 }] })) }).deps
    );
    expect(stepOf(apagada, 'pdv-arrival').status).toBe('unknown');
    expect(stepOf(apagada, 'pdv-arrival').message).toContain('Conexão não encontrada');
  });

  it('erro de SQL no PDV é falha da evidência, não da integração, e não repete', async () => {
    const runQuery = vi.fn(async (id: string) => (id === 'pg' ? { success: false, rows: [], error: 'relation "produto" does not exist' } : { success: true, rows: [{ c: 3 }] }));
    const result = await runBatchTrace(inputs(), makeDeps({ ...semPdvSync, runQuery }).deps);

    expect(result.brokenAt).toBeUndefined();
    expect(stepOf(result, 'pdv-arrival').status).toBe('unknown');
    expect(result.notes?.some((n) => n.startsWith('Consulta do PDV falhou: relation "produto"'))).toBe(true);
    expect(runQuery.mock.calls.filter((c) => c[0] === 'pg')).toHaveLength(1);
  });
});

describe('runBatchTrace: WinThor e logs', () => {
  it('APM indisponível vira observação; o dado da retaguarda sozinho NÃO prova a chamada', async () => {
    const { deps } = makeDeps({ getTraces: vi.fn(async () => { throw new Error('Nenhum receptor APM ativo'); }) });
    const result = await runBatchTrace(inputs(), deps);
    const step = stepOf(result, 'winthor-fetch');

    expect(step).toMatchObject({ status: 'unknown', source: 'sql', itemCount: 12 });
    expect(step.message).toContain('a chamada da API não foi observada');
    expect(result.notes).toContain('APM indisponível: Nenhum receptor APM ativo');
  });

  it('chamada do WinThor com erro no APM falha o passo da busca', async () => {
    const { deps } = makeDeps({ getTraces: vi.fn(async () => [apmTrace({ httpStatusCode: 500, hasError: true })]) });
    const result = await runBatchTrace(inputs(), deps);

    expect(result.brokenAt).toBe('winthor-fetch');
    expect(stepOf(result, 'winthor-fetch').status).toBe('failed');
  });

  it('sem nenhuma fonte para a busca: sem evidência e observação sobre a API não configurada', async () => {
    const { deps } = makeDeps();
    const flow = makeFlow({ winthorApiPath: '', evidence: { pdvQuery: 'select count(*) from produto where lote = :lote', pdvWaitSeconds: 0 } });
    const result = await runBatchTrace(inputs(flow), deps);

    expect(stepOf(result, 'winthor-fetch')).toMatchObject({ status: 'unknown', source: 'none' });
    expect(result.notes).toContain('API do fluxo no WinThor não configurada: a chamada não pôde ser procurada no APM.');
    expect(deps.getTraces).not.toHaveBeenCalled();
  });

  it('logs: erro citando o lote vira observação; arquivo ausente vira observação sem derrubar o rastreio', async () => {
    const readLogLines = vi.fn(async (path: string) => (path.includes('wsh') ? ['10:00 ERROR lote 48213 falhou ao enviar'] : null));
    const result = await runBatchTrace(inputs(), makeDeps({ readLogLines }).deps);

    expect(result.logExcerpts?.map((l) => l.source)).toEqual(['wsh']);
    expect(result.notes).toContain('O log do WSH tem 1 linha(s) de erro citando o lote.');
    expect(result.notes).toContain('Log do CH não encontrado ou ilegível (ch.log).');
    expect(result.brokenAt).toBeUndefined();
  });

  it('camada sem log configurado não gera trecho nem observação de log', async () => {
    const result = await runBatchTrace(inputs(makeFlow(), { ...layers, wsh: { layer: 'wsh' }, ch: { layer: 'ch' } }), makeDeps().deps);
    expect(result.logExcerpts).toEqual([]);
    expect(result.notes?.some((n) => n.startsWith('Log do'))).toBe(false);
  });
});
