import type { DatabaseType } from '../../../shared/types';

/** Aba de consulta: texto do editor preso a UMA conexão. O resultado vive no workspace da aba, não aqui. */
export interface QueryTab {
  id: string;
  title: string;
  connectionId: string;
  sql: string;
}

export interface QueryTabsState {
  tabs: QueryTab[];
  activeId: string | null;
  /** Abas em ordem de uso recente (mais recente primeiro): ao fechar uma, volta-se para a anterior. */
  recent: string[];
  /** Contador para numerar "Consulta N" sem repetir depois de fechar abas. */
  counter: number;
}

export const MAX_QUERY_TABS = 12;
export const EMPTY_TABS: QueryTabsState = { tabs: [], activeId: null, recent: [], counter: 0 };

export function defaultSqlFor(type: DatabaseType | undefined): string {
  return type === 'oracle' ? 'SELECT 1 FROM DUAL' : 'SELECT 1';
}

function touch(recent: string[], id: string): string[] {
  return [id, ...recent.filter((r) => r !== id)];
}

export function activeTab(state: QueryTabsState): QueryTab | null {
  return state.tabs.find((t) => t.id === state.activeId) ?? null;
}

/** Cria e ativa uma aba. Devolve o estado igual se já estiver no limite de abas. */
export function addTab(state: QueryTabsState, input: { connectionId: string; sql: string; id?: string }): QueryTabsState {
  if (state.tabs.length >= MAX_QUERY_TABS) return state;
  const counter = state.counter + 1;
  const id = input.id ?? `tab_${Date.now().toString(36)}_${counter}`;
  const tab: QueryTab = { id, title: `Consulta ${counter}`, connectionId: input.connectionId, sql: input.sql };
  return { tabs: [...state.tabs, tab], activeId: id, recent: touch(state.recent, id), counter };
}

export function selectTab(state: QueryTabsState, id: string): QueryTabsState {
  if (!state.tabs.some((t) => t.id === id) || state.activeId === id) return state;
  return { ...state, activeId: id, recent: touch(state.recent, id) };
}

/** Fecha a aba. Se era a ativa, ativa a usada mais recentemente (ou a vizinha). */
export function closeTab(state: QueryTabsState, id: string): QueryTabsState {
  const index = state.tabs.findIndex((t) => t.id === id);
  if (index === -1) return state;
  const tabs = state.tabs.filter((t) => t.id !== id);
  const recent = state.recent.filter((r) => r !== id);
  if (state.activeId !== id) return { ...state, tabs, recent };
  const next = recent.find((r) => tabs.some((t) => t.id === r)) ?? tabs[Math.min(index, tabs.length - 1)]?.id ?? null;
  return { ...state, tabs, recent, activeId: next };
}

export function setTabSql(state: QueryTabsState, id: string, sql: string): QueryTabsState {
  const tab = state.tabs.find((t) => t.id === id);
  if (!tab || tab.sql === sql) return state;
  return { ...state, tabs: state.tabs.map((t) => (t.id === id ? { ...t, sql } : t)) };
}

export function renameTab(state: QueryTabsState, id: string, title: string): QueryTabsState {
  const clean = title.trim();
  if (!clean) return state;
  return { ...state, tabs: state.tabs.map((t) => (t.id === id ? { ...t, title: clean.slice(0, 40) } : t)) };
}

/**
 * Clique numa conexão da sidebar: volta para a aba dela usada mais recentemente; se não há nenhuma, abre uma nova
 * com a consulta padrão do banco. Assim trocar de conexão nunca apaga o que estava na tela de outra.
 */
export function openConnectionTab(state: QueryTabsState, connectionId: string, defaultSql: string): QueryTabsState {
  const mostRecent = state.recent.map((id) => state.tabs.find((t) => t.id === id)).find((t) => t?.connectionId === connectionId);
  const candidate = mostRecent ?? state.tabs.find((t) => t.connectionId === connectionId);
  if (candidate) return selectTab(state, candidate.id);
  return addTab(state, { connectionId, sql: defaultSql });
}

/**
 * Ajusta as abas ao conjunto atual de conexões: remove as de conexões apagadas e, se não sobrar nenhuma aba,
 * abre uma para a conexão padrão.
 */
export function reconcileTabs(
  state: QueryTabsState,
  connections: Array<{ id: string; type: DatabaseType; isDefault?: boolean }>
): QueryTabsState {
  if (connections.length === 0) return state;
  const valid = new Set(connections.map((c) => c.id));
  let next = state;
  for (const tab of state.tabs) {
    if (!valid.has(tab.connectionId)) next = closeTab(next, tab.id);
  }
  if (next.tabs.length === 0) {
    const def = connections.find((c) => c.isDefault) ?? connections[0];
    return addTab(next, { connectionId: def.id, sql: defaultSqlFor(def.type) });
  }
  if (!next.activeId || !next.tabs.some((t) => t.id === next.activeId)) {
    return { ...next, activeId: next.tabs[0].id, recent: touch(next.recent, next.tabs[0].id) };
  }
  return next;
}

// ---------------------------------------------------------------------------
// Persistência (só o texto e a conexão de cada aba; resultados não são guardados)
// ---------------------------------------------------------------------------

export const QUERY_TABS_STORAGE_KEY = 'devManager:dbQueryTabsV1';

export function serializeTabs(state: QueryTabsState): string {
  return JSON.stringify({
    tabs: state.tabs.map(({ id, title, connectionId, sql }) => ({ id, title, connectionId, sql })),
    activeId: state.activeId,
    counter: state.counter
  });
}

export function deserializeTabs(raw: string | null): QueryTabsState {
  if (!raw) return EMPTY_TABS;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.tabs)) return EMPTY_TABS;
    const tabs: QueryTab[] = parsed.tabs
      .filter((t: any) => t && typeof t.id === 'string' && typeof t.connectionId === 'string')
      .slice(0, MAX_QUERY_TABS)
      .map((t: any) => ({ id: t.id, title: typeof t.title === 'string' ? t.title : 'Consulta', connectionId: t.connectionId, sql: typeof t.sql === 'string' ? t.sql : '' }));
    const activeId = tabs.some((t) => t.id === parsed.activeId) ? parsed.activeId : (tabs[0]?.id ?? null);
    return { tabs, activeId, recent: activeId ? [activeId] : [], counter: Number.isFinite(parsed.counter) ? parsed.counter : tabs.length };
  } catch {
    return EMPTY_TABS;
  }
}

export function readStoredTabs(): QueryTabsState {
  try {
    return deserializeTabs(window.localStorage.getItem(QUERY_TABS_STORAGE_KEY));
  } catch {
    return EMPTY_TABS;
  }
}

export function storeTabs(state: QueryTabsState): void {
  try {
    window.localStorage.setItem(QUERY_TABS_STORAGE_KEY, serializeTabs(state));
  } catch {
    // localStorage indisponível: as abas simplesmente não sobrevivem ao reinício
  }
}
