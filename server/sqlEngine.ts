import type { QueryResult } from '../src/shared/types';
import { state } from './state';

function interpolateBinds(sql: string, binds?: Record<string, any>): string {
  if (!binds || Object.keys(binds).length === 0) return sql;
  return sql.replace(/:([a-zA-Z0-9_]+)/g, (match, key) => {
    if (!(key in binds)) return match;
    const val = binds[key];
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return String(val);
    return `'${String(val).replace(/'/g, "''")}'`;
  });
}

function parseValue(raw: string): any {
  const trimmed = raw.trim();
  if (/^'.*'$/.test(trimmed)) return trimmed.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^null$/i.test(trimmed)) return null;
  return trimmed;
}

export function executeInMemorySql(rawSql: string, maxRows = 500, binds?: Record<string, any>): QueryResult {
  const start = Date.now();
  const sql = interpolateBinds(rawSql, binds).trim().replace(/;+\s*$/, '');
  if (!sql) {
    return { success: false, columns: [], rows: [], rowCount: 0, executionTimeMs: 0, error: 'SQL vazio.' };
  }

  const upper = sql.toUpperCase();

  if (upper === 'SHOW TABLES' || upper.startsWith('SELECT TABLE_NAME FROM')) {
    const rows = Object.keys(state.sqlTables).map((t) => ({
      TABLE_NAME: t,
      ROW_COUNT: state.sqlTables[t].length
    }));
    return { success: true, columns: ['TABLE_NAME', 'ROW_COUNT'], rows, rowCount: rows.length, executionTimeMs: Date.now() - start };
  }

  const descMatch = sql.match(/^(?:DESCRIBE|DESC)\s+([a-zA-Z0-9_]+)/i);
  if (descMatch) {
    const tbl = descMatch[1].toUpperCase();
    const rowsData = state.sqlTables[tbl];
    if (!rowsData) {
      return { success: false, columns: [], rows: [], rowCount: 0, executionTimeMs: Date.now() - start, error: `Tabela ou view "${tbl}" não encontrada.` };
    }
    const sample = rowsData[0] || {};
    const cols = Object.keys(sample).map((col) => ({
      COLUMN_NAME: col,
      DATA_TYPE: typeof sample[col] === 'number' ? 'NUMBER' : 'VARCHAR2(255)',
      NULLABLE: 'Y'
    }));
    return { success: true, columns: ['COLUMN_NAME', 'DATA_TYPE', 'NULLABLE'], rows: cols, rowCount: cols.length, executionTimeMs: Date.now() - start };
  }

  if (upper.startsWith('SELECT')) {
    if (/FROM\s+DUAL\b/i.test(sql)) {
      const expr = sql.replace(/^SELECT\s+/i, '').replace(/\s+FROM\s+DUAL.*$/i, '').trim();
      const row = { [expr || 'RESULT']: expr.replace(/^'|'$/g, '') || 'X' };
      return { success: true, columns: Object.keys(row), rows: [row], rowCount: 1, executionTimeMs: Date.now() - start };
    }

    const fromMatch = sql.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!fromMatch) {
      return {
        success: false,
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: Date.now() - start,
        error: 'Sintaxe não suportada no sandbox. Experimente: SELECT * FROM PCPEDC WHERE CODFILIAL = \'1\' ORDER BY NUMPED DESC'
      };
    }

    const [, colsExpr, tableRaw, whereExpr, orderCol, orderDir, limitRaw] = fromMatch;
    const tableName = tableRaw.toUpperCase();
    const tableRows = state.sqlTables[tableName];
    if (!tableRows) {
      return { success: false, columns: [], rows: [], rowCount: 0, executionTimeMs: Date.now() - start, error: `ORA-00942: tabela ou view "${tableName}" não existe` };
    }

    let resultRows = [...tableRows];

    if (whereExpr) {
      const conds = whereExpr.split(/\s+AND\s+/i);
      resultRows = resultRows.filter((row) =>
        conds.every((cond) => {
          const m = cond.trim().match(/^([a-zA-Z0-9_]+)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*(.+)$/i);
          if (!m) return true;
          const colKey = Object.keys(row).find((k) => k.toUpperCase() === m[1].toUpperCase());
          if (!colKey) return false;
          const left = row[colKey];
          const op = m[2].toUpperCase();
          const right = parseValue(m[3]);
          if (op === '=') return String(left) === String(right);
          if (op === '!=' || op === '<>') return String(left) !== String(right);
          if (op === '>') return Number(left) > Number(right);
          if (op === '<') return Number(left) < Number(right);
          if (op === '>=') return Number(left) >= Number(right);
          if (op === '<=') return Number(left) <= Number(right);
          if (op === 'LIKE') {
            const pattern = String(right).replace(/%/g, '.*').replace(/_/g, '.');
            return new RegExp(`^${pattern}$`, 'i').test(String(left));
          }
          return true;
        })
      );
    }

    if (orderCol) {
      const colKey = Object.keys(tableRows[0] || {}).find((k) => k.toUpperCase() === orderCol.toUpperCase()) || orderCol;
      const desc = (orderDir || 'ASC').toUpperCase() === 'DESC';
      resultRows.sort((a, b) => {
        const av = a[colKey];
        const bv = b[colKey];
        if (av === bv) return 0;
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        return (av < bv ? -1 : 1) * (desc ? -1 : 1);
      });
    }

    const limit = Math.min(maxRows, limitRaw ? Number(limitRaw) : maxRows);
    resultRows = resultRows.slice(0, limit);

    const selectedCols =
      colsExpr.trim() === '*'
        ? Object.keys(tableRows[0] || {})
        : colsExpr.split(',').map((c) => c.trim().split(/\s+AS\s+/i)[0].trim());

    const projected = resultRows.map((row) => {
      if (colsExpr.trim() === '*') return { ...row };
      const out: Record<string, any> = {};
      for (const c of selectedCols) {
        const key = Object.keys(row).find((k) => k.toUpperCase() === c.toUpperCase()) || c;
        out[key] = row[key];
      }
      return out;
    });

    const finalCols = projected[0] ? Object.keys(projected[0]) : selectedCols;
    return {
      success: true,
      columns: finalCols,
      rows: projected,
      rowCount: projected.length,
      executionTimeMs: Math.max(2, Date.now() - start)
    };
  }

  const insertMatch = sql.match(/^INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)$/i);
  if (insertMatch) {
    const tbl = insertMatch[1].toUpperCase();
    if (!state.sqlTables[tbl]) {
      return { success: false, columns: [], rows: [], rowCount: 0, executionTimeMs: 2, error: `Tabela "${tbl}" não encontrada.` };
    }
    const cols = insertMatch[2].split(',').map((s) => s.trim().toUpperCase());
    const vals = insertMatch[3].split(',').map(parseValue);
    const row: Record<string, any> = {};
    cols.forEach((c, idx) => { row[c] = vals[idx] ?? null; });
    state.sqlTables[tbl].push(row);
    return { success: true, columns: [], rows: [], rowCount: 1, affectedRows: 1, executionTimeMs: 4 };
  }

  const updateMatch = sql.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/i);
  if (updateMatch) {
    const tbl = updateMatch[1].toUpperCase();
    const rows = state.sqlTables[tbl];
    if (!rows) {
      return { success: false, columns: [], rows: [], rowCount: 0, executionTimeMs: 2, error: `Tabela "${tbl}" não encontrada.` };
    }
    const assignMatch = updateMatch[2].match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
    if (!assignMatch) {
      return { success: false, columns: [], rows: [], rowCount: 0, executionTimeMs: 2, error: 'Cláusula SET inválida.' };
    }
    const setCol = assignMatch[1].toUpperCase();
    const setVal = parseValue(assignMatch[2]);
    let affected = 0;
    for (const r of rows) {
      if (!updateMatch[3]) {
        r[setCol] = setVal;
        affected++;
      } else {
        const w = updateMatch[3].match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
        if (w && String(r[w[1].toUpperCase()]) === String(parseValue(w[2]))) {
          r[setCol] = setVal;
          affected++;
        }
      }
    }
    return { success: true, columns: [], rows: [], rowCount: affected, affectedRows: affected, executionTimeMs: 4 };
  }

  return {
    success: false,
    columns: [],
    rows: [],
    rowCount: 0,
    executionTimeMs: 2,
    error: 'Comando SQL não reconhecido pelo motor in-memory. Use SELECT, SHOW TABLES, DESCRIBE, INSERT ou UPDATE.'
  };
}
