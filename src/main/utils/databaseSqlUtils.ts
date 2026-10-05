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

/**
 * Monta a cláusula WHERE (com binds posicionais :p0, :p1...) a partir de um objeto de
 * condições de igualdade, tratando valores null como "IS NULL" (já que "coluna = NULL"
 * nunca casa em SQL). `startIndex` evita colisão de nomes de bind quando reaproveitado
 * junto de um SET (ver updateRow).
 */
export function buildEqualityWhereClause(
  where: Record<string, any>,
  binds: Record<string, any>,
  startIndex: number
): { clause: string; nextIndex: number } {
  let idx = startIndex;
  const parts = Object.entries(where).map(([col, val]) => {
    if (val === null || val === undefined) {
      return `${col} IS NULL`;
    }
    const key = `p${idx++}`;
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
