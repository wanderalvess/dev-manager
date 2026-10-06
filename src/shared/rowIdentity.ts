import type { DatabaseType } from './types';

/**
 * Identificação de linha por pseudo-coluna quando a tabela não tem chave primária:
 * ROWID no Oracle, ctid no PostgreSQL. A coluna só existe na consulta que o editor
 * reescreve e nunca é exibida nem exportada; no `where` de updateDbRow/deleteDbRow ela
 * aparece com este nome reservado.
 */
export const ROW_ID_COLUMN = '__ROWID__';

/** Vendors cuja pseudo-coluna de linha é suportada. MySQL não tem equivalente estável. */
export function supportsRowId(type: DatabaseType | undefined): boolean {
  return type === 'oracle' || type === 'postgres';
}

const ORACLE_ROWID = /^[A-Za-z0-9+/*]{1,4000}$/;
const POSTGRES_CTID = /^\(\d+,\d+\)$/;

/** Formato aceito para o valor da pseudo-coluna; o ctid é interpolado como literal no PG, então é estrito. */
export function isValidRowIdValue(type: DatabaseType | undefined, value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (type === 'oracle') return ORACLE_ROWID.test(value);
  if (type === 'postgres') return POSTGRES_CTID.test(value);
  return false;
}

/**
 * Reescreve `SELECT * FROM <tabela> ...` para trazer também a pseudo-coluna de linha como
 * `__ROWID__`. Devolve null para vendor sem suporte ou SQL que não começa com `SELECT * FROM`.
 */
export function buildRowIdSelect(sql: string, tableName: string, type: DatabaseType | undefined): string | null {
  if (!supportsRowId(type)) return null;
  const head = /^\s*SELECT\s+\*\s+FROM\s+/i;
  if (!head.test(sql)) return null;
  const projection =
    type === 'oracle'
      ? `SELECT ROWID AS "${ROW_ID_COLUMN}", ${tableName}.* FROM `
      : `SELECT ctid::text AS "${ROW_ID_COLUMN}", * FROM `;
  return sql.replace(head, projection);
}
