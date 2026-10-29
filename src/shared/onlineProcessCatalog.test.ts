import { describe, expect, it } from 'vitest';
import { ONLINE_CATEGORY_ORDER, ONLINE_PROCESSES, ORDER_LOG, findOnlineProcesses, isMapped, onlineKind, sameEndpoint } from './onlineProcessCatalog';

describe('catálogo dos processos online do PDVOmni', () => {
  it('os 12 endpoints do levantamento, ids únicos e categorias conhecidas', () => {
    expect(ONLINE_PROCESSES).toHaveLength(12);
    expect(new Set(ONLINE_PROCESSES.map((p) => p.id)).size).toBe(12);
    for (const p of ONLINE_PROCESSES) {
      expect(ONLINE_CATEGORY_ORDER).toContain(p.category);
      expect(p.apiPath.startsWith('/')).toBe(true);
    }
  });

  it('GET é leitura; POST e PUT são escrita (6 de cada no levantamento)', () => {
    const kinds = ONLINE_PROCESSES.map(onlineKind);
    expect(kinds.filter((k) => k === 'leitura')).toHaveLength(6);
    expect(kinds.filter((k) => k === 'escrita')).toHaveLength(6);
  });

  it('pré-venda, nota de entrada e reserva de estoque são o mesmo POST: só o corpo diferencia', () => {
    const preVenda = ONLINE_PROCESSES.find((p) => p.id === 'EndpointPreVendaEnvio')!;
    expect(sameEndpoint(preVenda).map((p) => p.id)).toEqual(['EndpointReservaEstoqueEnvio', 'EndpointNotaEntradaEnvio']);
    expect(sameEndpoint(ONLINE_PROCESSES.find((p) => p.id === 'EndpointPreVendaAtualiza')!)).toEqual([]);
  });

  it('acha o processo pela chamada vista, sem query, barra final ou caixa', () => {
    expect(findOnlineProcesses('get', '/winthor/varejo/v1/credito-cliente/list?codcli=1').map((p) => p.id)).toEqual(['EndpointCreditoConsulta']);
    expect(findOnlineProcesses('GET', '/API/stock-vtex/v1/available/pdv-sync/').map((p) => p.id)).toEqual(['EndpointEstoqueConsulta']);
    expect(findOnlineProcesses('DELETE', '/winthor/varejo/v1/credito-cliente')).toEqual([]);
  });

  it('envio e atualização da pré-venda gravam o log na PCLOGPEDIDOAPI', () => {
    expect(ONLINE_PROCESSES.filter(isMapped).map((p) => [p.id, p.oracleTables])).toEqual([
      ['EndpointPreVendaEnvio', [ORDER_LOG]],
      ['EndpointPreVendaAtualiza', [ORDER_LOG]]
    ]);
  });
});
