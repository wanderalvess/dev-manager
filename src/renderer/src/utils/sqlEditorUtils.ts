import type { SqlSnippet, TableColumnInfo } from '../../../shared/types';

export const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL',
  'ORDER BY', 'GROUP BY', 'HAVING', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'ON',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'DISTINCT', 'AS', 'LIMIT',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROWNUM', 'UNION', 'UNION ALL', 'EXISTS', 'CASE',
  'WHEN', 'THEN', 'ELSE', 'END', 'DESC', 'ASC'
];

export interface AutocompleteSuggestion {
  label: string;
  type: 'keyword' | 'table' | 'column';
}

export interface AutocompleteState {
  suggestions: AutocompleteSuggestion[];
  activeIndex: number;
  wordStart: number;
  wordEnd: number;
}

export interface ReferencedTable {
  table: string;
  alias: string;
}

export const MAX_AUTOCOMPLETE_SUGGESTIONS = 15;

/** Converte o valor salvo no localStorage em número dentro dos limites (ou o padrão se ausente). */
export function parseStoredClamped(saved: string | null, min: number, max: number, fallback: number): number {
  return saved ? Math.max(min, Math.min(max, Number(saved))) : fallback;
}

/** Extrai tabelas/aliases referenciados após FROM/JOIN para sugerir colunas com "alias.coluna". */
export function extractReferencedTables(sql: string): ReferencedTable[] {
  const regex = /\b(?:FROM|JOIN)\s+([a-zA-Z0-9_."]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
  const result: ReferencedTable[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(sql)) !== null) {
    const rawTable = m[1].replace(/"/g, '');
    const alias = m[2] || rawTable.split('.').pop() || rawTable;
    result.push({ table: rawTable, alias });
  }
  return result;
}

export function getCurrentWordRange(text: string, caret: number): { start: number; end: number } {
  let start = caret;
  while (start > 0 && /[a-zA-Z0-9_.]/.test(text[start - 1])) start--;
  return { start, end: caret };
}

/** Resolve o nome da tabela como listada no schema (ignora o prefixo de owner). */
export function resolveTableKey(tables: string[], table: string): string {
  return tables.find((t) => t === table || t.split('.').pop() === table.split('.').pop()) || table;
}

/** Chave usada para carregar colunas: compara sem diferenciar maiúsculas/minúsculas. */
export function resolveColumnLoadKey(tables: string[], table: string): string {
  const tableUpper = table.toUpperCase();
  const known = tables.find(
    (t) => t.toUpperCase() === tableUpper || (t.split('.').pop() || '').toUpperCase() === tableUpper
  );
  return known || table;
}

export function computeAutocompleteState(
  text: string,
  caret: number,
  referencedTables: ReferencedTable[],
  tables: string[],
  tableColumns: Record<string, TableColumnInfo[]>
): AutocompleteState | null {
  const { start, end } = getCurrentWordRange(text, caret);
  const word = text.slice(start, end);
  if (!word) return null;

  const dotIdx = word.lastIndexOf('.');
  if (dotIdx >= 0) {
    const prefix = word.slice(0, dotIdx);
    const partial = word.slice(dotIdx + 1).toLowerCase();
    const ref = referencedTables.find((r) => r.alias.toLowerCase() === prefix.toLowerCase());
    const tableKey = ref ? resolveTableKey(tables, ref.table) : undefined;
    const cols = tableKey ? tableColumns[tableKey] || [] : [];
    const suggestions = cols
      .filter((c) => c.name.toLowerCase().startsWith(partial))
      .slice(0, MAX_AUTOCOMPLETE_SUGGESTIONS)
      .map((c) => ({ label: c.name, type: 'column' as const }));
    if (suggestions.length === 0) return null;
    return { suggestions, activeIndex: 0, wordStart: start + dotIdx + 1, wordEnd: end };
  }

  const lower = word.toLowerCase();
  const kwMatches = SQL_KEYWORDS.filter((k) => k.toLowerCase().startsWith(lower)).map((k) => ({
    label: k,
    type: 'keyword' as const
  }));
  const tblMatches = tables
    .filter((t) => t.toLowerCase().startsWith(lower) || (t.split('.').pop() || '').toLowerCase().startsWith(lower))
    .map((t) => ({ label: t, type: 'table' as const }));
  const colSet = new Map<string, { label: string; type: 'column' }>();
  referencedTables.forEach(({ table }) => {
    const key = resolveTableKey(tables, table);
    (tableColumns[key] || []).forEach((c) => {
      if (c.name.toLowerCase().startsWith(lower)) colSet.set(c.name, { label: c.name, type: 'column' });
    });
  });
  const suggestions = [...tblMatches, ...Array.from(colSet.values()), ...kwMatches].slice(
    0,
    MAX_AUTOCOMPLETE_SUGGESTIONS
  );
  if (suggestions.length === 0) return null;
  return { suggestions, activeIndex: 0, wordStart: start, wordEnd: end };
}

export function filterSqlSnippets(snippets: SqlSnippet[], search: string): SqlSnippet[] {
  if (!search.trim()) return snippets;
  const term = search.toLowerCase();
  return snippets.filter(
    (s) =>
      s.title.toLowerCase().includes(term) ||
      s.category.toLowerCase().includes(term) ||
      (s.description && s.description.toLowerCase().includes(term)) ||
      s.sql.toLowerCase().includes(term)
  );
}
