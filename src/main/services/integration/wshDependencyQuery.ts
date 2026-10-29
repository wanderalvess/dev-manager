import { findFlowById, findFlowByRoute, normalizeRouteName, type WshFlow } from '../../../shared/wshFlowCatalog';
import { WSH_DEPENDENCY_PERIOD_DAYS, type WshDependency } from '../../../shared/wshMonitorTypes';
import { describeWshStatus } from '../../../shared/wshObservation';
import { asEpoch, asNumber, asText, col, formatOracleDate, type Row } from './wshMonitorQuery';

/**
 * Dependências de um fluxo no Monitor do WSH: para cada fluxo de que ele depende, a última integração gravada
 * e quantas deram erro no período. Responde "o ICMS já foi para o PDVSync?" quando o Produto volta com impostos vazio.
 */

export function dependencyFlows(routeName: string): { flow?: WshFlow; dependencies: WshFlow[] } {
  const flow = findFlowByRoute(routeName);
  const dependencies = (flow?.dependsOn ?? []).map((id) => findFlowById(id)).filter((dep): dep is WshFlow => Boolean(dep));
  return { flow, dependencies };
}

/** Uma linha por rota de busca das dependências. Nomes vão por bind, comparados sem diferença de maiúsculas. */
export function buildDependencyQuery(dependencies: WshFlow[], now: number): { sql: string; binds: Record<string, string> } {
  const binds: Record<string, string> = { inicio: formatOracleDate(now - WSH_DEPENDENCY_PERIOD_DAYS * 86_400_000) };
  const names = dependencies.map((dep, index) => {
    binds[`r${index}`] = normalizeRouteName(dep.searchRoute);
    return `:r${index}`;
  });
  const sql = `select upper(trim(r.servico)) as rota,
       max(c.datacriacao) as ultima,
       max(c.status) keep (dense_rank last order by c.id) as ultimo_status,
       sum(case when c.datacriacao >= to_date(:inicio, 'YYYY-MM-DD HH24:MI:SS') then 1 else 0 end) as total_periodo,
       sum(case when c.datacriacao >= to_date(:inicio, 'YYYY-MM-DD HH24:MI:SS') and c.status = '3' then 1 else 0 end) as erros_periodo
from pcintegracaocore c
join pcintegracaorotaservico r on r.id = c.idrotaservico
where upper(trim(r.servico)) in (${names.join(', ')})
group by upper(trim(r.servico))`;
  return { sql, binds };
}

export function toDependencies(dependencies: WshFlow[], rows: Row[]): WshDependency[] {
  const byRoute = new Map(rows.map((row) => [normalizeRouteName(asText(col(row, 'rota')) ?? ''), row]));
  return dependencies.map((dep) => {
    const row = byRoute.get(normalizeRouteName(dep.searchRoute));
    const base = { flowId: dep.id, flowName: dep.name, route: dep.searchRoute };
    if (!row) return { ...base, found: false, periodTotal: 0, periodErrors: 0 };
    const lastStatus = asText(col(row, 'ultimo_status'));
    const { label, tone } = describeWshStatus(lastStatus);
    const lastAt = asEpoch(col(row, 'ultima'));
    return {
      ...base,
      found: true,
      ...(lastAt !== undefined ? { lastAt } : {}),
      ...(lastStatus !== undefined ? { lastStatus, lastLabel: label, lastTone: tone } : {}),
      periodTotal: asNumber(col(row, 'total_periodo')) ?? 0,
      periodErrors: asNumber(col(row, 'erros_periodo')) ?? 0
    };
  });
}
