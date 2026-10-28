import { normalizeRouteName } from '../../../shared/wshFlowCatalog';
import type { WshScheduleInfo } from '../../../shared/wshMonitorTypes';
import { asNumber, asText, col, type Row } from './wshMonitorQuery';

/**
 * Agendamento e situação do fluxo de uma rota, lidos do próprio Oracle do WSH (o intervalo é de cada cliente).
 * Estrutura conhecida pelos layouts: PCINTEGRACAOFLUXOEXECUCAO (passos do fluxo: DESCRICAO, IDROTASERVICO, ATIVO),
 * PCINTEGRACAOAGENDAMENTO (DESCRICAO, AGENDAMENTOSEGUNDOS, DELAYINICIALSEGUNDOS) e PCINTEGRACAOAGENDAMENTOFLUXO
 * (IDAGENDAMENTO, IDFLUXO). Como a ligação pode ser por id ou por descrição, o cruzamento é feito aqui, aceitando as duas.
 * As três tabelas são de configuração, pequenas e sem dado de negócio.
 */

export const FLOW_STEPS_SQL = `select fe.id, fe.descricao, fe.ativo, fe.ordemexecucao, r.servico
from pcintegracaofluxoexecucao fe
left join pcintegracaorotaservico r on r.id = fe.idrotaservico`;
export const SCHEDULES_SQL = 'select * from pcintegracaoagendamento';
export const SCHEDULE_FLOWS_SQL = 'select * from pcintegracaoagendamentofluxo';
export const SCHEDULE_MAX_ROWS = 2000;

const same = (a: unknown, b: unknown) => {
  const left = asText(a)?.trim().toUpperCase();
  const right = asText(b)?.trim().toUpperCase();
  return Boolean(left) && left === right;
};

export function toScheduleInfo(route: string, steps: Row[], schedules: Row[], scheduleFlows: Row[]): WshScheduleInfo {
  const wanted = normalizeRouteName(route);
  const routeSteps = steps.filter((row) => normalizeRouteName(asText(col(row, 'servico')) ?? '') === wanted);
  const flowNames = [...new Set(routeSteps.map((row) => asText(col(row, 'descricao')) ?? ''))].filter(Boolean);
  const isActive = (row: Row) => same(col(row, 'ativo'), 'S');

  const flows = flowNames.map((name) => {
    const own = steps.filter((row) => same(col(row, 'descricao'), name));
    const ids = own.map((row) => col(row, 'id'));
    const links = scheduleFlows.filter((link) => same(col(link, 'idfluxo'), name) || ids.some((id) => same(col(link, 'idfluxo'), id)));
    const linked = schedules.filter((schedule) =>
      links.some((link) => same(col(link, 'idagendamento'), col(schedule, 'id')) || same(col(link, 'idagendamento'), col(schedule, 'descricao')))
    );
    return {
      name,
      routeActive: routeSteps.some((row) => same(col(row, 'descricao'), name) && isActive(row)),
      activeSteps: own.filter(isActive).length,
      totalSteps: own.length,
      schedules: linked.map((schedule) => {
        const interval = asNumber(col(schedule, 'agendamentosegundos'));
        const delay = asNumber(col(schedule, 'delayinicialsegundos'));
        return {
          name: asText(col(schedule, 'descricao')) ?? '',
          ...(interval !== undefined ? { intervalSeconds: interval } : {}),
          ...(delay !== undefined ? { initialDelaySeconds: delay } : {})
        };
      })
    };
  });
  return { route, flows };
}
