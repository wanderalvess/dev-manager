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

export type SqlStatementKind = 'select' | 'dml' | 'ddl' | 'plsql' | 'commit' | 'rollback' | 'savepoint' | 'other';

/** Remove comentários e literais de texto, para procurar palavras-chave sem falso positivo. */
function maskCommentsAndStrings(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\r\n]*/g, ' ')
    .replace(/'(?:''|[^'])*'/g, "''");
}

/**
 * Classifica o comando para a lógica de transação: DML deixa transação aberta no modo manual, DDL faz commit
 * implícito no Oracle, SELECT não altera nada (exceto `FOR UPDATE`, que trava linhas).
 */
export function classifySqlStatement(sql: string): SqlStatementKind {
  const body = maskCommentsAndStrings(stripLeadingComments(sql.trim())).trim();
  const first = (body.match(/^[A-Za-z]+/) || [''])[0].toUpperCase();

  if (isPlsqlBlock(sql) && first !== 'CREATE') return 'plsql';
  switch (first) {
    case 'SELECT':
      return /\bFOR\s+UPDATE\b/i.test(body) ? 'dml' : 'select';
    case 'WITH':
      return /\b(INSERT|UPDATE|DELETE|MERGE)\b/i.test(body) ? 'dml' : 'select';
    case 'INSERT':
    case 'UPDATE':
    case 'DELETE':
    case 'MERGE':
    case 'LOCK':
      return 'dml';
    case 'CREATE':
    case 'ALTER':
    case 'DROP':
    case 'TRUNCATE':
    case 'GRANT':
    case 'REVOKE':
    case 'RENAME':
    case 'COMMENT':
    case 'ANALYZE':
    case 'AUDIT':
    case 'FLASHBACK':
    case 'PURGE':
      return 'ddl';
    case 'CALL':
    case 'EXEC':
    case 'EXECUTE':
      return 'plsql';
    case 'COMMIT':
      return 'commit';
    case 'ROLLBACK':
      return /^ROLLBACK\s+(WORK\s+)?TO\b/i.test(body) ? 'savepoint' : 'rollback';
    case 'SAVEPOINT':
      return 'savepoint';
    default:
      return 'other';
  }
}

export interface RiskyStatement {
  reason: 'no-where' | 'ddl';
  verb: string;
}

/** Comando que merece confirmação antes de executar: UPDATE/DELETE sem WHERE ou DDL destrutivo. */
export function findRiskyStatement(sql: string): RiskyStatement | null {
  const body = maskCommentsAndStrings(stripLeadingComments(sql.trim())).trim();
  const first = (body.match(/^[A-Za-z]+/) || [''])[0].toUpperCase();
  if ((first === 'UPDATE' || first === 'DELETE') && !/\bWHERE\b/i.test(body)) {
    return { reason: 'no-where', verb: first };
  }
  if (first === 'TRUNCATE' || first === 'DROP') {
    return { reason: 'ddl', verb: first };
  }
  return null;
}
