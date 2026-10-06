// Utilitários puros de SQL compartilhados entre main e renderer.

export type SqlDialect = 'oracle' | 'postgres' | 'mysql';

const LEADING_COMMENTS = /^(\s*(--[^\r\n]*|\/\*[\s\S]*?\*\/)\s*)+/;

/** Remove comentários iniciais (`-- ...` e bloco) para inspecionar a primeira palavra do comando. */
export function stripLeadingComments(sql: string): string {
  return sql.replace(LEADING_COMMENTS, '');
}

const PLSQL_UNIT =
  /^CREATE\s+(OR\s+REPLACE\s+)?((NON)?EDITIONABLE\s+)?(PROCEDURE|FUNCTION|PACKAGE(\s+BODY)?|TRIGGER|TYPE(\s+BODY)?)\b/i;

/** Bloco anônimo (`BEGIN`/`DECLARE`) ou unidade armazenada PL/SQL: o `;` final faz parte da sintaxe. */
export function isPlsqlBlock(sql: string): boolean {
  const body = stripLeadingComments(sql.trim());
  return /^(DECLARE|BEGIN)\b/i.test(body) || PLSQL_UNIT.test(body);
}

/**
 * Prepara o texto do editor para execução: tira espaços, o `/` terminador de linha (estilo SQL*Plus) e o `;` final.
 * Em Oracle, blocos PL/SQL mantêm o `;` (`BEGIN ... END;` sem ele dá ORA-06550).
 */
export function normalizeSqlForExecution(sql: string, dialect: SqlDialect): string {
  let text = sql.trim();
  // `/` sozinho na última linha termina o bloco no SQL*Plus; o driver não aceita
  text = text.replace(/(\r?\n)[ \t]*\/[ \t]*$/, '').trimEnd();
  if (dialect === 'oracle' && isPlsqlBlock(text)) {
    return text;
  }
  return text.replace(/;+\s*$/, '');
}

const TOP_LEVEL_LIMIT = /\blimit\s+\d+(\s*(offset\s+\d+|,\s*\d+))?\s*;?\s*$/i;

/**
 * PostgreSQL e MySQL trazem todas as linhas antes de o app cortar. Para SELECT simples, acrescenta
 * `LIMIT maxRows+1` (a linha extra permite avisar que o resultado foi truncado). Oracle usa `maxRows` do driver.
 * Não mexe em comandos que já têm LIMIT, em `FOR UPDATE`, `INTO OUTFILE` ou CTE com DML.
 */
export function applyRowLimit(sql: string, dialect: SqlDialect, maxRows: number): string {
  if (dialect === 'oracle') return sql;
  const body = stripLeadingComments(sql.trim());
  if (!/^(SELECT|WITH)\b/i.test(body)) return sql;
  // Vários comandos no mesmo texto: o LIMIT cairia no último, que pode não ser um SELECT
  if (/;\s*\S/.test(body)) return sql;
  if (TOP_LEVEL_LIMIT.test(sql)) return sql;
  if (/\bFOR\s+(UPDATE|SHARE)\b/i.test(sql) || /\bINTO\s+(OUTFILE|DUMPFILE)\b/i.test(sql)) return sql;
  if (/^WITH\b/i.test(body) && /\b(INSERT|UPDATE|DELETE)\b/i.test(body)) return sql;
  // Nova linha: um comentário `--` no fim do texto engoliria o LIMIT
  return `${sql.trimEnd().replace(/;+$/, '')}\nLIMIT ${maxRows + 1}`;
}
