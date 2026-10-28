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

describe('agendamento da rota', () => {
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
