import { joltFieldMappings } from '../../../shared/joltFieldMap';
import { normalizeRouteName } from '../../../shared/wshFlowCatalog';
import type { WshLayoutRequest, WshRouteLayout } from '../../../shared/wshMonitorTypes';
import { asText, col, type Row } from './wshMonitorQuery';

/**
 * Nível 2 do "Como resolver": lê a LAYOUTTRANSFORMACAO das rotas do item na PCINTEGRACAOROTASERVICO (a definição do
 * JOLT, sem dado de negócio nem segredo) e devolve as regras que montam cada campo recusado.
 */

const MAX_ROUTES = 2;
const MAX_FIELDS = 5;
const MAX_IDS = 20;
const MAX_TEXT = 120;

export interface ValidLayoutRequest {
  routes: string[];
  fields: string[];
  itemIds: string[];
}

const cleanList = (value: unknown, max: number): string[] | null => {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > max) return null;
  const items = value.map((entry) => (typeof entry === 'string' ? entry.trim() : '')).filter(Boolean);
  return items.every((item) => item.length <= MAX_TEXT) ? [...new Set(items)] : null;
};

export function validateLayoutRequest(request: Partial<WshLayoutRequest> | undefined): { ok: true; value: ValidLayoutRequest } | { ok: false; error: string } {
  const routes = cleanList(request?.routes, MAX_ROUTES);
  const fields = cleanList(request?.fields, MAX_FIELDS);
  const itemIds = cleanList(request?.itemIds, MAX_IDS);
  if (!routes || routes.length === 0) return { ok: false, error: `Informe de 1 a ${MAX_ROUTES} rotas.` };
  if (!fields || fields.length === 0) return { ok: false, error: `Informe de 1 a ${MAX_FIELDS} campos.` };
  if (!itemIds) return { ok: false, error: `Até ${MAX_IDS} identificadores de item.` };
  return { ok: true, value: { routes, fields, itemIds } };
}

/** SQL fixo com uma rota por bind, comparada sem diferença de maiúsculas. */
export function buildLayoutQuery(routes: string[]): { sql: string; binds: Record<string, string> } {
  const binds: Record<string, string> = {};
  const names = routes.map((route, index) => {
    binds[`r${index}`] = normalizeRouteName(route);
    return `:r${index}`;
  });
  return {
    sql: `select r.servico, r.layouttransformacao from pcintegracaorotaservico r where upper(trim(r.servico)) in (${names.join(', ')})`,
    binds
  };
}

export function toRouteLayouts(request: ValidLayoutRequest, rows: Row[]): WshRouteLayout[] {
  const byRoute = new Map(rows.map((row) => [normalizeRouteName(asText(col(row, 'servico')) ?? ''), row]));
  return request.routes.map((route) => {
    const row = byRoute.get(normalizeRouteName(route));
    const layout = row ? col(row, 'layouttransformacao') : undefined;
    if (typeof layout !== 'string') return { route, found: false, fields: [] };
    return {
      route,
      found: true,
      fields: request.fields.map((field) => ({ field, mappings: joltFieldMappings(layout, field, request.itemIds) }))
    };
  });
}
