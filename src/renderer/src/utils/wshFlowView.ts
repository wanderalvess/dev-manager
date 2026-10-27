import { WSH_CATEGORY_ORDER, findFlowByRoute, flowLabel, type WshFlow } from '../../../shared/wshFlowCatalog';
import type { WshRoute } from '../../../shared/wshMonitorTypes';

/** Apresentação pura do catálogo de fluxos no Monitor do WSH: o filtro agrupado e a ficha do fluxo. */

export interface WshRouteOption {
  id: number;
  label: string;
}

export interface WshRouteGroup {
  category: string;
  options: WshRouteOption[];
}

const OTHERS = 'Outras rotas';

/** Rotas do banco viram "FLUXO-09 · Produto", agrupadas por categoria na ordem do catálogo; o resto vai para "Outras rotas". */
export function groupWshRoutes(routes: WshRoute[]): WshRouteGroup[] {
  const groups = new Map<string, (WshRouteOption & { order: string })[]>();
  for (const route of routes) {
    const flow = findFlowByRoute(route.name);
    const category = flow?.category ?? OTHERS;
    const list = groups.get(category) ?? [];
    list.push({ id: route.id, label: flow ? flowLabel(flow) : route.name, order: flow ? flow.id : route.name });
    groups.set(category, list);
  }
  const order = [...WSH_CATEGORY_ORDER, OTHERS] as string[];
  return [...groups.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([category, options]) => ({
      category,
      options: options.sort((a, b) => a.order.localeCompare(b.order)).map(({ id, label }) => ({ id, label }))
    }));
}

const DIRECTION_TEXT: Record<WshFlow['direction'], string> = {
  envio: 'Envio: WinThor → PDVSync',
  recebimento: 'Recebimento pelo ERP: PDVSync → WinThor',
  monitor: 'Monitor de status',
  utilitario: 'Utilitário'
};

/** A ficha do fluxo em pares rótulo/valor, só com o que o catálogo sabe. */
export function flowFacts(flow: WshFlow): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [{ label: 'Sentido', value: DIRECTION_TEXT[flow.direction] }];
  if (flow.apiPath) facts.push({ label: 'API do WinThor', value: `${flow.apiPath}${flow.apiProject ? ` (${flow.apiProject})` : ''}` });
  if (flow.oracleTables?.length) facts.push({ label: 'Tabelas Oracle', value: flow.oracleTables.join(', ') });
  if (flow.pdvTables?.length) facts.push({ label: 'Tabelas do PDVOmni', value: flow.pdvTables.join(', ') });
  if (flow.scheduled) facts.push({ label: 'Agendamento', value: 'Roda sozinho; o intervalo é configurado em cada cliente' });
  return facts;
}
