import type { TableColumnInfo } from '../../../shared/types';

/** Sigilo usado para representar NULL ao editar uma célula — mesma convenção já usada nos filtros da grid. */
export const NULL_SIGIL = '[NULL]';

/**
 * Colunas usadas para identificar uma linha em UPDATE/DELETE: a chave primária da tabela,
 * quando existe; senão todas as colunas da linha original, como fallback (pode afetar mais de
 * uma linha em tabelas com registros duplicados, mas é o único critério disponível sem PK).
 */
export function getRowKeyColumns(columns: TableColumnInfo[]): string[] {
  const pkCols = columns.filter((c) => c.isPrimaryKey).map((c) => c.name);
  if (pkCols.length > 0) return pkCols;
  return columns.map((c) => c.name);
}

/**
 * Reconhece um `SELECT * FROM <tabela>` simples (opcionalmente com o LIMIT/ROWNUM que o botão
 * "abrir tabela" da sidebar já gera) e devolve o nome da tabela. Qualquer coisa mais complexa
 * (JOIN, agregação, subquery, múltiplas tabelas) retorna null — a edição inline só é segura
 * quando dá pra saber, sem ambiguidade, de qual tabela cada linha veio.
 */
export function parseSingleTableSelect(sql: string): string | null {
  if (!sql) return null;
  const clean = sql.trim().replace(/;+\s*$/, '');
  const match = clean.match(
    /^SELECT\s+\*\s+FROM\s+([A-Za-z_][A-Za-z0-9_$]*(?:\.[A-Za-z_][A-Za-z0-9_$]*)?)\s*(?:WHERE\s+ROWNUM\s*<=\s*\d+)?\s*(?:LIMIT\s+\d+)?\s*$/i
  );
  return match ? match[1] : null;
}

/** Verdadeiro se o texto digitado na edição de célula representa o sigilo de NULL. */
export function isNullSigil(raw: string): boolean {
  return raw.trim().toUpperCase() === NULL_SIGIL;
}

/** Heurística sobre o texto de tipo (`NUMBER(10,2)`, `integer`, `int(11)`...) retornado por getTableColumns. */
export function looksNumericType(type: string | undefined): boolean {
  const t = (type || '').toLowerCase();
  return /int|num|float|double|decimal|real/.test(t);
}

/**
 * Converte o texto digitado ao editar uma célula para o valor a enviar no UPDATE/INSERT:
 * `[NULL]` vira null, texto numérico em coluna de tipo numérico vira Number, o resto fica string.
 */
export function castEditedValue(raw: string, column: TableColumnInfo | undefined): string | number | null {
  if (isNullSigil(raw)) return null;
  if (column && looksNumericType(column.type) && raw.trim() !== '' && !Number.isNaN(Number(raw))) {
    return Number(raw);
  }
  return raw;
}

/** Monta os valores iniciais (vazios) do formulário de "Nova linha" a partir das colunas da tabela. */
export function buildEmptyRowDraft(columns: TableColumnInfo[]): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const col of columns) {
    draft[col.name] = '';
  }
  return draft;
}

/**
 * A partir do rascunho de texto da "Nova linha", monta o objeto de valores para o INSERT,
 * descartando colunas deixadas em branco (deixa o banco aplicar o DEFAULT/NULL da coluna).
 */
export function draftToInsertValues(
  draft: Record<string, string>,
  columns: TableColumnInfo[]
): Record<string, string | number | null> {
  const columnsByName = new Map(columns.map((c) => [c.name, c]));
  const values: Record<string, string | number | null> = {};
  for (const [name, raw] of Object.entries(draft)) {
    if (raw.trim() === '') continue;
    values[name] = castEditedValue(raw, columnsByName.get(name));
  }
  return values;
}
