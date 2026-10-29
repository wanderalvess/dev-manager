import { describe, expect, it } from 'vitest';
import { findFlowById } from '../../../shared/wshFlowCatalog';
import { flowFacts, formatSeconds, groupWshRoutes, scheduleFacts } from './wshFlowView';

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

describe('scheduleFacts', () => {
  it('formata o intervalo lido do ambiente', () => {
    expect([5, 300, 600, 5400, 3605].map(formatSeconds)).toEqual(['5 s', '5 min', '10 min', '1 h 30 min', '1 h 5 s']);
  });

  it('intervalo e passos do fluxo; rota inativa, sem agendamento ou fora de fluxo viram aviso', () => {
    const [ativo, inativo, avulso] = scheduleFacts({
      route: 'PDVSYNC - Buscar vendas',
      flows: [
        { name: 'Vendas', routeActive: true, activeSteps: 2, totalSteps: 3, schedules: [{ name: 'pdvsync - vendas', intervalSeconds: 300, initialDelaySeconds: 5 }] },
        { name: 'Vendas 2', routeActive: false, activeSteps: 0, totalSteps: 2, schedules: [] },
        { name: 'Manual', routeActive: true, activeSteps: 1, totalSteps: 1, schedules: [] }
      ]
    });
    expect(ativo).toEqual({
      label: 'Fluxo "Vendas" neste ambiente',
      value: 'a cada 5 min (começa 5 s após o WSH subir) pelo agendamento "pdvsync - vendas" · 2 de 3 passo(s) ativo(s)',
      warning: false
    });
    expect(inativo.warning).toBe(true);
    expect(inativo.value).toMatch(/^Fluxo desligado neste ambiente/);
    expect(avulso.value).toMatch(/^sem agendamento/);
    expect(scheduleFacts({ route: 'X', flows: [] })[0].warning).toBe(true);
    // Um passo ativo e o desta rota inativo: o WSH pula só esta rota; com o número do fluxo no rótulo
    const [passo] = scheduleFacts({ route: 'X', flows: [{ id: 16, name: 'Vendas', routeActive: false, activeSteps: 1, totalSteps: 3, schedules: [] }] });
    expect(passo).toMatchObject({ label: 'Fluxo 16 "Vendas" neste ambiente', warning: true });
    expect(passo.value).toMatch(/^Passo desta rota inativo/);
  });
});
