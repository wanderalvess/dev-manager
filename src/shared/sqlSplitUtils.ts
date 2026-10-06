import { isPlsqlBlock, stripLeadingComments } from './sqlStatementUtils';

export interface SqlStatementRange {
  /** Texto do comando, já sem espaços nas pontas (mantém o `;` final, que o PL/SQL exige). */
  text: string;
  /** Posição inicial no texto original. */
  start: number;
  /** Posição logo após o terminador (`;`) ou do fim do comando. */
  end: number;
  /** Terminou em `;` ou numa linha `/`. Sem isso o comando ainda está sendo digitado. */
  terminated: boolean;
}

const Q_QUOTE_CLOSERS: Record<string, string> = { '[': ']', '(': ')', '{': '}', '<': '>' };

/**
 * Divide o texto do editor em comandos. Respeita texto entre aspas, comentários e `q'[...]'`; blocos PL/SQL
 * (`BEGIN`, `DECLARE`, `CREATE PROCEDURE...`) só terminam numa linha com apenas `/`, como no SQL*Plus.
 * Uma linha com apenas `/` também encerra um comando comum.
 */
export function splitSqlStatements(sql: string): SqlStatementRange[] {
  const result: SqlStatementRange[] = [];
  const len = sql.length;
  let i = 0;

  const lineBounds = (pos: number): { from: number; to: number } => {
    let from = pos;
    while (from > 0 && sql[from - 1] !== '\n') from--;
    let to = pos;
    while (to < len && sql[to] !== '\n') to++;
    return { from, to };
  };

  /** `/` sozinho na linha (espaços ao redor são permitidos). */
  const isSlashLine = (pos: number): boolean => {
    const { from, to } = lineBounds(pos);
    return sql.slice(from, to).trim() === '/';
  };

  const skipBlank = () => {
    while (i < len) {
      if (/\s/.test(sql[i])) {
        i++;
      } else if (sql.startsWith('--', i)) {
        while (i < len && sql[i] !== '\n') i++;
      } else if (sql.startsWith('/*', i)) {
        const close = sql.indexOf('*/', i + 2);
        i = close === -1 ? len : close + 2;
      } else {
        break;
      }
    }
  };

  while (i < len) {
    skipBlank();
    if (i >= len) break;
    // `;` ou `/` soltos entre comandos não formam comando
    if (sql[i] === ';' || (sql[i] === '/' && isSlashLine(i))) {
      i++;
      continue;
    }

    const start = i;
    const plsql = isPlsqlBlock(sql.slice(start, start + 400));
    let end = len;
    let terminatorEnd = len;
    let found = false;

    while (i < len && !found) {
      const ch = sql[i];
      if (ch === "'") {
        i++;
        while (i < len) {
          if (sql[i] === "'" && sql[i + 1] === "'") {
            i += 2;
          } else if (sql[i] === "'") {
            i++;
            break;
          } else {
            i++;
          }
        }
      } else if ((ch === 'q' || ch === 'Q') && sql[i + 1] === "'" && i + 2 < len && !/[A-Za-z0-9_]/.test(sql[i - 1] ?? ' ')) {
        const open = sql[i + 2];
        const closer = Q_QUOTE_CLOSERS[open] ?? open;
        const close = sql.indexOf(closer + "'", i + 3);
        i = close === -1 ? len : close + 2;
      } else if (ch === '"') {
        i++;
        while (i < len && sql[i] !== '"') i++;
        i++;
      } else if (sql.startsWith('--', i)) {
        while (i < len && sql[i] !== '\n') i++;
      } else if (sql.startsWith('/*', i)) {
        const close = sql.indexOf('*/', i + 2);
        i = close === -1 ? len : close + 2;
      } else if (ch === '/' && isSlashLine(i)) {
        end = i;
        terminatorEnd = i + 1;
        found = true;
      } else if (ch === ';' && !plsql) {
        end = i + 1;
        terminatorEnd = i + 1;
        found = true;
      } else {
        i++;
      }
    }

    const raw = sql.slice(start, end);
    const text = raw.trim();
    // só comentários ou vazio: ignora
    if (text && stripLeadingComments(text).trim()) {
      const trimmedEnd = start + raw.trimEnd().length;
      result.push({ text, start, end: found && sql[end - 1] === ';' ? end : trimmedEnd, terminated: found });
    }
    i = found ? terminatorEnd : len;
  }
  return result;
}

/** Comando sob o cursor: o que contém a posição; entre dois comandos, o anterior (como o Ctrl+Enter do SQL Developer). */
export function findStatementAt(sql: string, offset: number): SqlStatementRange | null {
  const statements = splitSqlStatements(sql);
  if (statements.length === 0) return null;
  const inside = statements.find((s) => offset >= s.start && offset <= s.end);
  if (inside) return inside;
  const before = [...statements].reverse().find((s) => s.end < offset);
  return before ?? statements[0];
}
