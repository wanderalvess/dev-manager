import { describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '../../shared/types';
import { makeService } from './integrationTraceServiceTestKit';

const oracle = { id: 'ora', name: 'WinThor', type: 'oracle', host: 'h', port: 1521, database: 'XE', user: 'u', password: 'p' };
const withConnection: Partial<AppSettings> = {
  databaseConnections: [oracle] as never,
  integrationLayers: [{ layer: 'winthor', dbConnectionId: 'ora' }]
};

describe('IntegrationTraceService: monitor do WSH', () => {
  it('sem a conexão Oracle da camada WinThor, explica onde configurar e não consulta nada', async () => {
    const executeQuery = vi.fn();
    const { service } = makeService({ databaseConnections: [oracle] as never }, { executeQuery });

    const routes = await service.listWshRoutes();
    const search = await service.searchWsh({});

    expect(routes).toMatchObject({ success: false, error: expect.stringContaining('camada WinThor') });
    expect(search).toMatchObject({ success: false });
    expect(executeQuery).not.toHaveBeenCalled();
  });

  it('busca na PCINTEGRACAOCORE pela conexão da camada WinThor, só com binds, e devolve itens lidos', async () => {
    const executeQuery = vi.fn(async () => ({
      success: true,
      rows: [{ ID: 1, STATUS: '2', IDEXTERNO: 'pdvsync-preco-1000-1-1-x', ROTA: 'WTA - Buscar Preco Produto', TEM_TRANSFORMADO: 1 }]
    }));
    const { service } = makeService(withConnection, { executeQuery });

    const response = await service.searchWsh({ text: '1000', status: 'ok' });

    expect(response).toMatchObject({ success: true, limit: 100, items: [{ id: 1, statusLabel: 'Integrado', tone: 'ok' }] });
    const [connection, sql, maxRows, binds] = executeQuery.mock.calls[0] as unknown as [{ id: string }, string, number, Record<string, unknown>];
    expect(connection.id).toBe('ora');
    expect(sql).not.toContain('1000');
    expect(maxRows).toBe(100);
    expect(binds).toMatchObject({ texto: '%1000%' });
  });

  it('dependências: consulta só as rotas das dependências; fluxo sem dependências nem vai ao banco', async () => {
    const executeQuery = vi.fn(async () => ({ success: true, rows: [{ ROTA: 'WTA - BUSCAR ICMS', ULTIMO_STATUS: '2', TOTAL_PERIODO: 3, ERROS_PERIODO: 0 }] }));
    const { service } = makeService(withConnection, { executeQuery });

    const produto = await service.checkWshDependencies('WTA - Buscar Produto PDV');
    const icms = await service.checkWshDependencies('WTA - Buscar ICMS');

    expect(produto).toMatchObject({ success: true, flowId: '09', periodDays: 30 });
    expect(produto.success && produto.dependencies.map((d) => [d.flowId, d.found])).toEqual([['07', true], ['06', false], ['05', false]]);
    expect(icms).toEqual({ success: true, flowId: '07', dependencies: [], periodDays: 30 });
    expect(executeQuery).toHaveBeenCalledTimes(1);
  });

  it('layout: lê a LAYOUTTRANSFORMACAO das rotas por bind e devolve as regras do campo', async () => {
    const layout = JSON.stringify([{ operation: 'shift', spec: { items: { '*': { '@(1,id)': { 'PIX*': { '#8': 'items.[&3].tipo' } } } } } }]);
    const executeQuery = vi.fn(async () => ({ success: true, rows: [{ SERVICO: 'WTA - Buscar tipos cobrancas', LAYOUTTRANSFORMACAO: layout }] }));
    const { service } = makeService(withConnection, { executeQuery });

    const response = await service.explainWshLayout({ routes: ['WTA - Buscar tipos cobrancas'], fields: ['tipo'], itemIds: ['PIXS'] });

    expect(response).toMatchObject({ success: true, layouts: [{ found: true, fields: [{ field: 'tipo', mappings: [{ value: '8', matches: ['PIXS'] }] }] }] });
    const [, sql, , binds] = executeQuery.mock.calls[0] as unknown as [unknown, string, number, Record<string, string>];
    expect(sql).not.toContain('PIX');
    expect(binds).toEqual({ r0: 'WTA - BUSCAR TIPOS COBRANCAS' });
    expect(await service.explainWshLayout({ routes: [], fields: ['tipo'] })).toMatchObject({ success: false });
  });

  it('agendamento: lê as três tabelas de configuração e cruza a rota com o fluxo; tabela ausente vira mensagem', async () => {
    const executeQuery = vi.fn(async (_c: unknown, sql: string) => {
      if (sql.includes('pcintegracaofluxoexecucao')) return { success: true, rows: [{ ID: 1, DESCRICAO: 'Vendas', ATIVO: 'S', SERVICO: 'PDVSYNC - Buscar vendas' }] };
      if (sql.includes('pcintegracaoagendamentofluxo')) return { success: true, rows: [{ IDAGENDAMENTO: 'pdvsync - vendas', IDFLUXO: 'Vendas' }] };
      return { success: true, rows: [{ DESCRICAO: 'pdvsync - vendas', AGENDAMENTOSEGUNDOS: 300 }] };
    });
    const { service } = makeService(withConnection, { executeQuery });

    const response = await service.checkWshSchedule('PDVSYNC - Buscar vendas');

    expect(response).toMatchObject({ success: true, info: { flows: [{ name: 'Vendas', routeActive: true, schedules: [{ intervalSeconds: 300 }] }] } });
    expect(executeQuery).toHaveBeenCalledTimes(3);

    executeQuery.mockImplementation(async () => ({ success: false, error: 'ORA-00942: table or view does not exist' }) as never);
    expect(await service.checkWshSchedule('PDVSYNC - Buscar vendas')).toEqual({ success: false, error: 'ORA-00942: table or view does not exist' });
    expect(await service.checkWshSchedule('  ')).toMatchObject({ success: false });
  });

  it('entrada inválida e erro do banco voltam como mensagem, nunca exceção', async () => {
    const executeQuery = vi.fn(async () => ({ success: false, error: 'ORA-00942: table or view does not exist' }));
    const { service } = makeService(withConnection, { executeQuery });

    expect(await service.searchWsh({ routeId: 'x' as never })).toMatchObject({ success: false, error: 'Rota inválida.' });
    expect(await service.searchWsh({})).toEqual({ success: false, error: 'ORA-00942: table or view does not exist' });
    expect(await service.listWshRoutes()).toMatchObject({ success: false });
  });
});
