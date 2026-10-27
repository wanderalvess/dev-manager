import { describe, expect, it } from 'vitest';
import { findFlowById } from '../../../shared/wshFlowCatalog';
import { flowFacts, groupWshRoutes } from './wshFlowView';

describe('groupWshRoutes', () => {
  it('nomeia pelo fluxo, agrupa pela ordem do catálogo e deixa o desconhecido em "Outras rotas"', () => {
    const groups = groupWshRoutes([
      { id: 9, name: 'WTA - Buscar Preco Produto' },
      { id: 3, name: 'WTA - Buscar Produto PDV' },
      { id: 7, name: 'PDVSYNC - Buscar vendas' },
      { id: 5, name: 'WTA - Buscar ICMS' },
      { id: 1, name: 'XPTO - Rota local' },
      { id: 4, name: 'WTA - Buscar Pis Cofins' }
    ]);
    expect(groups.map((g) => g.category)).toEqual(['Fiscal e tributação', 'Produtos e estoque', 'Preços', 'Recebimento pelo ERP', 'Outras rotas']);
    expect(groups[0].options).toEqual([
      { id: 4, label: 'FLUXO-06 · PIS/COFINS' },
      { id: 5, label: 'FLUXO-07 · ICMS' }
    ]);
    expect(groups[4].options).toEqual([{ id: 1, label: 'XPTO - Rota local' }]);
  });
});

describe('flowFacts', () => {
  it('mostra o sentido, a API, as tabelas e o agendamento que o catálogo conhece', () => {
    expect(flowFacts(findFlowById('09')!).map((f) => f.label)).toEqual(['Sentido', 'API do WinThor', 'Tabelas Oracle', 'Tabelas do PDVOmni']);
    // O intervalo é configuração de cada cliente: o catálogo só diz que o fluxo roda por agendamento
    expect(flowFacts(findFlowById('16')!)).toContainEqual({ label: 'Agendamento', value: 'Roda sozinho; o intervalo é configurado em cada cliente' });
    expect(flowFacts(findFlowById('16')!)[0].value).toBe('Recebimento pelo ERP: PDVSync → WinThor');
  });
});
