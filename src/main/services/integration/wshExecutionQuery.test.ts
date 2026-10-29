import { describe, expect, it, vi } from 'vitest';
import { describeRunStatus, summarizeExecutionError } from '../../../shared/wshExecution';
import { attachRuns, buildRunsQuery, buildStepsQuery, toFlowRuns } from './wshExecutionQuery';

// Formas vistas num banco real (2026-10-29): o fluxo 39 parando em BUSCAROTASERVICOPAGINADA com 404 do WTA
const NOT_FOUND =
  '<html>\n<head>\n<meta http-equiv="Content-Type" content="text/html;charset=utf-8"/>\n<title>Error 404 Not Found</title>\n</head>\n' +
  '<body><h2>HTTP ERROR 404</h2>\n<p>Problem accessing /api/wholesale/v1/customer/deliveryAddress. Reason:\n<pre>    Not Found</pre></p>';

const runRows = [
  { ID: 153141, IDFLUXO: 39, DATAINICIAL: new Date(2026, 9, 27, 9, 54, 41), DATAFINAL: new Date(2026, 9, 27, 9, 54, 42), STATUSEXECUCAO: 3, RECURSOFALHA: 'BUSCAROTASERVICOPAGINADA', ERRO: null },
  { ID: 153140, IDFLUXO: 39, DATAINICIAL: new Date(2026, 9, 27, 9, 54, 36), DATAFINAL: null, STATUSEXECUCAO: 2, RECURSOFALHA: null, ERRO: null }
];
const stepRows = [
  { ID: 1, IDGESTAOFLUXO: 153141, NOMERECURSO: 'AUTENTICADORREFRESHTOKENAPI', STATUSEXECUCAO: 2, QUANTIDADEBUSCA: null, QUANTIDADEENVIO: null, ERRO: null },
  { ID: 2, IDGESTAOFLUXO: 153141, NOMERECURSO: 'BUSCAROTASERVICOPAGINADA', STATUSEXECUCAO: 3, QUANTIDADEBUSCA: 0, QUANTIDADEENVIO: 0, ERRO: NOT_FOUND },
  { ID: 3, IDGESTAOFLUXO: 153140, NOMERECURSO: 'BUSCAROTASERVICOPAGINADA', STATUSEXECUCAO: 2, QUANTIDADEBUSCA: 12, QUANTIDADEENVIO: 12, ERRO: null }
];

describe('execuções do fluxo (gestão de execução do WSH)', () => {
  it('status conhecidos e o erro HTML do WTA virando uma frase', () => {
    expect(describeRunStatus(2)).toEqual({ label: 'Concluída', tone: 'ok' });
    expect(describeRunStatus(3)).toEqual({ label: 'Com erro', tone: 'error' });
    expect(describeRunStatus(9)).toEqual({ label: 'Status 9', tone: 'other' });
    expect(summarizeExecutionError(NOT_FOUND)).toBe(
      'HTTP 404 em /api/wholesale/v1/customer/deliveryAddress: a API não existe neste WTA (falta instalar ou atualizar o bundle que a publica).'
    );
    expect(summarizeExecutionError('<html><title>Error 500 Server Error</title>')).toBe('HTTP 500.');
    expect(summarizeExecutionError('\n  ORA-00942: table or view does not exist\n  at ...')).toBe('ORA-00942: table or view does not exist');
    expect(summarizeExecutionError('   ')).toBeUndefined();
  });

  it('SQL só com binds, últimas por fluxo e etapas das execuções', () => {
    const runs = buildRunsQuery([39, 41]);
    expect(runs.sql).toContain('partition by g.idfluxo');
    expect(runs.sql).toContain(':f0, :f1');
    expect(runs.binds).toEqual({ f0: 39, f1: 41 });
    expect(buildStepsQuery([153141]).binds).toEqual({ e0: 153141 });
  });

  it('junta as etapas à execução; sem erro na execução, vale o da etapa que falhou', () => {
    const runs = toFlowRuns(runRows, stepRows).get(39)!;
    expect(runs.map((run) => run.statusLabel)).toEqual(['Com erro', 'Concluída']);
    expect(runs[0]).toMatchObject({ failedStep: 'BUSCAROTASERVICOPAGINADA', error: expect.stringContaining('HTTP 404 em /api/wholesale') });
    expect(runs[0].finishedAt! - runs[0].startedAt!).toBe(1000);
    expect(runs[1].steps[0]).toMatchObject({ fetched: 12, sent: 12, tone: 'ok' });
  });

  it('acrescenta as execuções ao agendamento; tabela ausente (WSH antigo) deixa a ficha como estava', async () => {
    const info = { route: 'WTA - Buscar Endereco Entrega Client', flows: [{ id: 39, name: 'Endereco Entrega Cliente', routeActive: false, activeSteps: 0, totalSteps: 6, schedules: [] }] };
    const run = vi.fn(async (sql: string) => ({ success: true, rows: sql.includes('pcintegracaogestaorecurso') ? stepRows : runRows }));
    const withRuns = await attachRuns(info, run);
    expect(withRuns.flows[0].runs).toHaveLength(2);

    const missing = vi.fn(async () => ({ success: false, error: 'ORA-00942: table or view does not exist' }));
    expect(await attachRuns(info, missing)).toEqual(info);
    expect(await attachRuns({ route: 'X', flows: [] }, missing)).toEqual({ route: 'X', flows: [] });
  });
});

describe('execuções repetidas', () => {
  it('agrupa as seguidas com o mesmo resultado e mantém separadas as diferentes', async () => {
    const { collapseRuns } = await import('../../../shared/wshExecution');
    const run = (id: number, statusLabel: string, error?: string) => ({ id, statusLabel, tone: 'other' as const, steps: [], ...(error ? { error } : {}) });
    const collapsed = collapseRuns([run(5, 'Com erro', '404'), run(4, 'Com erro', '404'), run(3, 'Concluída'), run(2, 'Com erro', '404')]);
    expect(collapsed.map((c) => [c.run.id, c.times])).toEqual([[5, 2], [3, 1], [2, 1]]);
  });
});
