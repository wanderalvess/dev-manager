import { describe, expect, it } from 'vitest';
import { toScheduleInfo } from './wshScheduleQuery';

// Formas vistas nos layouts do WSH (pdvsync): passos do fluxo Vendas e o agendamento "pdvsync - vendas"
const steps = [
  { ID: 160, DESCRICAO: 'Vendas', ATIVO: 'S', ORDEMEXECUCAO: 1, SERVICO: 'PDVSYNC - RAC LoginPDVSync' },
  { ID: 161, DESCRICAO: 'Vendas', ATIVO: 'S', ORDEMEXECUCAO: 2, SERVICO: 'PDVSYNC - Buscar vendas' },
  { ID: 162, DESCRICAO: 'Vendas', ATIVO: 'N', ORDEMEXECUCAO: 3, SERVICO: 'WTA - LoginWTA' },
  { ID: 90, DESCRICAO: 'Produto', ATIVO: 'N', ORDEMEXECUCAO: 2, SERVICO: 'WTA - Buscar Produto PDV' }
];
const schedules = [
  { ID: 7, DESCRICAO: 'pdvsync - vendas', AGENDAMENTOSEGUNDOS: 600, DELAYINICIALSEGUNDOS: 5 },
  { ID: 8, DESCRICAO: 'pdvsync - consultar status lote', AGENDAMENTOSEGUNDOS: 300, DELAYINICIALSEGUNDOS: 5 }
];

// Forma vista num banco real (2026-10-29): os passos têm IDFLUXO e a ligação do agendamento é por ele
const realSteps = [
  { ID: 754, IDFLUXO: 11, DESCRICAO: 'Preco', ATIVO: 'N', ORDEMEXECUCAO: 1, SERVICO: 'WTA - LoginWTA' },
  { ID: 755, IDFLUXO: 11, DESCRICAO: 'Preco', ATIVO: 'N', ORDEMEXECUCAO: 2, SERVICO: 'WTA - Buscar Preco Produto' },
  { ID: 900, IDFLUXO: 24, DESCRICAO: 'Atualizar Status Lote Retaguarda', ATIVO: 'S', ORDEMEXECUCAO: 2, SERVICO: 'WTA - Buscar lote PDV' },
  { ID: 901, IDFLUXO: 24, DESCRICAO: 'Atualizar Status Lote Retaguarda', ATIVO: 'S', ORDEMEXECUCAO: 4, SERVICO: 'PDVSYNC - Consultar status lote' }
];

describe('agendamento da rota', () => {
  it('banco real: agrupa os passos pelo IDFLUXO e liga o agendamento pelo IDFLUXO', () => {
    const info = toScheduleInfo('WTA - Buscar lote PDV', realSteps, [{ ID: 73, DESCRICAO: 'pdvsync - consultar status lote', AGENDAMENTOSEGUNDOS: 180 }], [
      { IDAGENDAMENTO: 73, IDFLUXO: 24 }
    ]);
    expect(info.flows).toEqual([
      { id: 24, name: 'Atualizar Status Lote Retaguarda', routeActive: true, activeSteps: 2, totalSteps: 2, schedules: [{ name: 'pdvsync - consultar status lote', intervalSeconds: 180 }] }
    ]);
    expect(toScheduleInfo('WTA - Buscar Preco Produto', realSteps, [], []).flows).toEqual([
      { id: 11, name: 'Preco', routeActive: false, activeSteps: 0, totalSteps: 2, schedules: [] }
    ]);
  });

  it('ligação por descrição (como nos layouts): fluxo, passos ativos e o intervalo deste ambiente', () => {
    const info = toScheduleInfo('PDVSYNC - Buscar vendas', steps, schedules, [{ IDAGENDAMENTO: 'pdvsync - vendas', IDFLUXO: 'Vendas' }]);
    expect(info).toEqual({
      route: 'PDVSYNC - Buscar vendas',
      flows: [{ name: 'Vendas', routeActive: true, activeSteps: 2, totalSteps: 3, schedules: [{ name: 'pdvsync - vendas', intervalSeconds: 600, initialDelaySeconds: 5 }] }]
    });
  });

  it('ligação por id também vale; rota sem agendamento fica sem agendamento; rota fora de fluxo fica vazia', () => {
    const byId = toScheduleInfo('pdvsync - buscar VENDAS', steps, schedules, [{ IDAGENDAMENTO: 7, IDFLUXO: 161 }]);
    expect(byId.flows[0].schedules.map((s) => s.intervalSeconds)).toEqual([600]);

    const produto = toScheduleInfo('WTA - Buscar Produto PDV', steps, schedules, []);
    expect(produto.flows).toEqual([{ name: 'Produto', routeActive: false, activeSteps: 0, totalSteps: 1, schedules: [] }]);

    expect(toScheduleInfo('XPTO', steps, schedules, []).flows).toEqual([]);
  });
});
