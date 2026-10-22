import type { QueryResult } from '../../shared/types';

/**
 * Monta um erro padronizado de QueryResult para as operações de mutação de linha
 * (insertRow/updateRow/deleteRow) quando a validação falha antes de tocar o banco.
 */
export function mutationValidationError(error: string): QueryResult {
  return {
    success: false,
    columns: [],
    rows: [],
    rowCount: 0,
    executionTimeMs: 0,
    isQuery: false,
    error
  };
}

export type TemporalKind = 'date' | 'timestamp';

/** Como a grid recebe DATE/TIMESTAMP do Oracle: `Date` serializado em ISO UTC (ver sanitizeDbValue). */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

export const isIsoUtcString = (value: unknown): value is string => typeof value === 'string' && ISO_UTC.test(value);

/**
 * ISO UTC da grid → texto com a hora LOCAL (a mesma em que o driver leu o valor do banco) no formato fixo que o
 * TO_DATE/TO_TIMESTAMP recebem. Comparar a string ISO direto com coluna DATE depende do NLS_DATE_FORMAT e dá ORA-01861.
 */
export function isoUtcToOracleLocal(iso: string, kind: TemporalKind): string | null {
  if (!isIsoUtcString(iso)) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  const base = `${p(d.getFullYear(), 4)}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  return kind === 'timestamp' ? `${base}.${p(d.getMilliseconds(), 3)}` : base;
}

/**
 * Monta a cláusula WHERE (com binds posicionais :p0, :p1...) a partir de um objeto de
 * condições de igualdade, tratando valores null como "IS NULL" (já que "coluna = NULL"
 * nunca casa em SQL). `startIndex` evita colisão de nomes de bind quando reaproveitado
 * junto de um SET (ver updateRow).
 */
export function buildEqualityWhereClause(
  where: Record<string, any>,
  binds: Record<string, any>,
  startIndex: number,
  temporal?: Record<string, TemporalKind>
): { clause: string; nextIndex: number } {
  let idx = startIndex;
  const parts = Object.entries(where).map(([col, val]) => {
    if (val === null || val === undefined) {
      return `${col} IS NULL`;
    }
    const key = `p${idx++}`;
    const kind = temporal?.[col.toUpperCase()];
    const local = kind && typeof val === 'string' ? isoUtcToOracleLocal(val, kind) : null;
    if (kind && local) {
      binds[key] = local;
      if (kind === 'date') return `${col} = TO_DATE(:${key}, 'YYYY-MM-DD HH24:MI:SS')`;
      // O JS só guarda milissegundos: compara na janela de 1 ms para o TIMESTAMP com microssegundos não escapar.
      const ts = `TO_TIMESTAMP(:${key}, 'YYYY-MM-DD HH24:MI:SS.FF3')`;
      return `(${col} >= ${ts} AND ${col} < ${ts} + INTERVAL '0.001' SECOND)`;
    }
    binds[key] = val;
    return `${col} = :${key}`;
  });
  return { clause: parts.join(' AND '), nextIndex: idx };
}

/**
 * Realiza interpolação segura de parâmetros e variáveis (:VAR, &VAR, &&VAR, @VAR, ${VAR}, #{VAR})
 * para bancos que não usam objeto nativo (ex: MySQL/PG) ou para variáveis de substituição no Oracle.
 */
export function interpolateSqlBinds(sql: string, binds?: Record<string, any>): string {
  if (!binds || Object.keys(binds).length === 0) return sql;

  const literalsMap: Record<string, string> = {};
  for (const [key, rawVal] of Object.entries(binds)) {
    let replacement: string;
    if (rawVal === null || rawVal === undefined) {
      replacement = 'NULL';
    } else if (typeof rawVal === 'number') {
      replacement = String(rawVal);
    } else if (typeof rawVal === 'boolean') {
      replacement = rawVal ? 'TRUE' : 'FALSE';
    } else if (rawVal instanceof Date) {
      replacement = `'${rawVal.toISOString()}'`;
    } else {
      const str = String(rawVal);
      if (str.toUpperCase() === 'NULL') {
        replacement = 'NULL';
      } else {
        replacement = `'${str.replace(/'/g, "''")}'`;
      }
    }
    literalsMap[key.toUpperCase()] = replacement;
  }

  const tokenRegex = /(\/\*[\s\S]*?\*\/|--[^\r\n]*|'(?:''|[^'])*'|(?<!:):(?!=)[a-zA-Z_][a-zA-Z0-9_]*\b|&&[a-zA-Z_][a-zA-Z0-9_]*\b|(?<!&)&(?!=)[a-zA-Z_][a-zA-Z0-9_]*\b|@[a-zA-Z_][a-zA-Z0-9_]*\b|\$\{[a-zA-Z_][a-zA-Z0-9_]*\}|#\{[a-zA-Z_][a-zA-Z0-9_]*\})/gi;
  return sql.replace(tokenRegex, (match) => {
    if (match.startsWith('/*') || match.startsWith('--') || match.startsWith("'")) {
      return match;
    }

    let varName = '';
    if (match.startsWith('&&')) {
      varName = match.slice(2);
    } else if (match.startsWith('&') || match.startsWith(':') || match.startsWith('@')) {
      varName = match.slice(1);
    } else if ((match.startsWith('${') || match.startsWith('#{')) && match.endsWith('}')) {
      varName = match.slice(2, -1);
    }

    const upper = varName.toUpperCase().trim();
    if (upper && upper in literalsMap) {
      return literalsMap[upper];
    }

    return match;
  });
}
