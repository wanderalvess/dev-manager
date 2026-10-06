import type { SqlSnippet } from '../../../shared/types';

export interface ReferencedTable {
  table: string;
  alias: string;
}

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

/**
 * Identificador (com ponto, como `OWNER.TABELA`) que contém a posição do cursor, para "descrever o objeto sob o cursor".
 * Aspas ao redor são removidas; pontos soltos nas pontas, ignorados. Retorna null se o cursor não está sobre um nome.
 */
export function extractIdentifierAt(text: string, offset: number): string | null {
  const isIdent = (ch: string | undefined) => !!ch && /[A-Za-z0-9_$#."]/.test(ch);
  let start = Math.min(offset, text.length);
  let end = start;
  while (start > 0 && isIdent(text[start - 1])) start--;
  while (end < text.length && isIdent(text[end])) end++;
  const cleaned = text.slice(start, end).replace(/"/g, '').replace(/^\.+|\.+$/g, '');
  return cleaned || null;
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
