import { normalizeRouteName } from '../../../shared/wshFlowCatalog';
import type { WshScheduleInfo } from '../../../shared/wshMonitorTypes';
import { asNumber, asText, col, type Row } from './wshMonitorQuery';

/**
 * Agendamento e situação do fluxo de uma rota, lidos do próprio Oracle do WSH (o intervalo é de cada cliente).
 * Conferido num banco real (2026-10-29): PCINTEGRACAOFLUXOEXECUCAO tem uma linha por passo, agrupada por IDFLUXO (o
 * número do fluxo, o mesmo do catálogo), com DESCRICAO = nome do fluxo e ATIVO; PCINTEGRACAOAGENDAMENTOFLUXO liga
 * IDAGENDAMENTO a IDFLUXO. Ligações antigas (por descrição ou pelo id do passo) continuam aceitas.
 * As três tabelas são de configuração, pequenas e sem dado de negócio.
 */

export const FLOW_STEPS_SQL = `select fe.id, fe.idfluxo, fe.descricao, fe.ativo, fe.ordemexecucao, r.servico
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

/** O fluxo de um passo: IDFLUXO quando o banco tem a coluna; senão, a descrição. */
const flowKey = (row: Row) => asText(col(row, 'idfluxo')) ?? `nome:${(asText(col(row, 'descricao')) ?? '').trim().toUpperCase()}`;

export function toScheduleInfo(route: string, steps: Row[], schedules: Row[], scheduleFlows: Row[]): WshScheduleInfo {
  const wanted = normalizeRouteName(route);
  const routeSteps = steps.filter((row) => normalizeRouteName(asText(col(row, 'servico')) ?? '') === wanted);
  const keys = [...new Set(routeSteps.map(flowKey))];
  const isActive = (row: Row) => same(col(row, 'ativo'), 'S');

  const flows = keys.map((key) => {
    const own = steps.filter((row) => flowKey(row) === key);
    const name = asText(col(own[0], 'descricao'))?.trim() ?? '';
    const flowId = asNumber(col(own[0], 'idfluxo'));
    const stepIds = own.map((row) => col(row, 'id'));
    const links = scheduleFlows.filter(
      (link) =>
        (flowId !== undefined && same(col(link, 'idfluxo'), flowId)) ||
        same(col(link, 'idfluxo'), name) ||
        stepIds.some((id) => same(col(link, 'idfluxo'), id))
    );
    const linked = schedules.filter((schedule) =>
      links.some((link) => same(col(link, 'idagendamento'), col(schedule, 'id')) || same(col(link, 'idagendamento'), col(schedule, 'descricao')))
    );
    return {
      ...(flowId !== undefined ? { id: flowId } : {}),
      name,
      routeActive: routeSteps.some((row) => flowKey(row) === key && isActive(row)),
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
