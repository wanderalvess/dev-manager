import { describe, expect, it, vi } from 'vitest';
import { makeService } from './integrationTraceServiceTestKit';

const oracle = { id: 'ora', name: 'WinThor', type: 'oracle', host: 'h', port: 1521, database: 'XE', user: 'u', password: 'p' };

describe('IntegrationTraceService: pedidos online (PCLOGPEDIDOAPI)', () => {
  it('sem a conexão Oracle da camada WinThor, explica onde configurar e não consulta nada', async () => {
    const executeQuery = vi.fn();
    const { service } = makeService({ databaseConnections: [oracle] as never }, { executeQuery });

    expect(await service.searchOnlineOrders({ orderNumber: '123' })).toMatchObject({ success: false, error: expect.stringContaining('camada WinThor') });
    expect(executeQuery).not.toHaveBeenCalled();
  });

  it('consulta pela conexão da camada WinThor, com o pedido em bind, e devolve as linhas traduzidas', async () => {
    const executeQuery = vi.fn(async () => ({
      success: true,
      rows: [{ DATA: '2026-10-28T10:00:00', NUMPED: 123, POSICAO: 'L', OPERACAO: 'I', STATUS: 'R', JSON_TRECHO: '{"a":1}', JSON_TAMANHO: 7 }]
    }));
    const { service } = makeService(
      { databaseConnections: [oracle] as never, integrationLayers: [{ layer: 'winthor', dbConnectionId: 'ora' }] },
      { executeQuery }
    );

    const response = await service.searchOnlineOrders({ orderNumber: '123' });

    expect(response).toMatchObject({ success: true, entries: [{ orderNumber: '123', operationLabel: 'Inclusão', statusLabel: 'Rejeitado', tone: 'error' }] });
    const [connection, sql, , binds] = executeQuery.mock.calls[0] as unknown as [{ id: string }, string, number, Record<string, unknown>];
    expect(connection.id).toBe('ora');
    expect(sql).toContain('pclogpedidoapi');
    expect(sql).not.toContain('123');
    expect(binds).toMatchObject({ numped: 123 });
  });
});
