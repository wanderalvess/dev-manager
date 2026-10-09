/**
 * Utilitários para manipulação e detecção de Parâmetros e Variáveis no SQL
 * Suporta:
 *  - Bind Variables nativas (:PARAMETRO)
 *  - Variáveis de substituição do SQL*Plus / WinThor (&PARAMETRO e &&PARAMETRO)
 *  - Variáveis de scripts (@PARAMETRO)
 *  - Placeholders de templates (${PARAMETRO} e #{PARAMETRO})
 */

export type SqlVariablePrefix = ':' | '&' | '&&' | '@' | '${}' | '#{}';

export interface SqlVariableInfo {
  name: string;
  prefix: SqlVariablePrefix;
  raw: string;
}

export interface BindInputState {
  name: string;
  value: string;
  type: 'auto' | 'string' | 'number' | 'date' | 'list' | 'null';
  prefix?: SqlVariablePrefix;
  raw?: string;
}

/**
 * Extrai informações detalhadas de todas as variáveis e parâmetros encontrados no SQL,
 * identificando o prefixo utilizado (:PARAM, &PARAM, &&PARAM, @PARAM, ${PARAM}, #{PARAM}).
 */
export function extractSqlVariables(sql: string): SqlVariableInfo[] {
  if (!sql || !sql.trim()) return [];

  // Regex que busca literais e comentários ou variáveis fora deles
  const tokenRegex = /(\/\*[\s\S]*?\*\/|--[^\r\n]*|'(?:''|[^'])*'|(?<!:):(?!=)([a-zA-Z_][a-zA-Z0-9_]*)\b|&&([a-zA-Z_][a-zA-Z0-9_]*)\b|(?<!&)&(?!=)([a-zA-Z_][a-zA-Z0-9_]*)\b|@([a-zA-Z_][a-zA-Z0-9_]*)\b|\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|#\{([a-zA-Z_][a-zA-Z0-9_]*)\})/gi;

  const seen = new Set<string>();
  const results: SqlVariableInfo[] = [];

  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(sql)) !== null) {
    const full = match[0];
    if (full.startsWith('/*') || full.startsWith('--') || full.startsWith("'")) {
      continue;
    }

    let prefix: SqlVariablePrefix = ':';
    let varName = '';

    if (full.startsWith('&&')) {
      prefix = '&&';
      varName = full.slice(2);
    } else if (full.startsWith('&')) {
      prefix = '&';
      varName = full.slice(1);
    } else if (full.startsWith('@')) {
      prefix = '@';
      varName = full.slice(1);
    } else if (full.startsWith('${') && full.endsWith('}')) {
      prefix = '${}';
      varName = full.slice(2, -1);
    } else if (full.startsWith('#{') && full.endsWith('}')) {
      prefix = '#{}';
      varName = full.slice(2, -1);
    } else if (full.startsWith(':')) {
      prefix = ':';
      varName = full.slice(1);
    }

    const normalized = varName.toUpperCase().trim();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      results.push({
        name: normalized,
        prefix,
        raw: full
      });
    }
  }

  return results;
}

/**
 * Extrai os nomes únicos de todas as variáveis e parâmetros do SQL em caixa alta.
 * Mantém retrocompatibilidade total com as chamadas existentes de extractBindVariables.
 */
export function extractBindVariables(sql: string): string[] {
  return extractSqlVariables(sql).map((v) => v.name);
}

/**
 * Converte o valor digitado pelo usuário para o tipo primitivo JavaScript apropriado
 */
export function castBindValue(val: string, type: 'auto' | 'string' | 'number' | 'date' | 'list' | 'null'): any {
  if (type === 'null') return null;
  if (val === null || val === undefined) return null;

  const trimmed = typeof val === 'string' ? val.trim() : String(val);

  if (type === 'number') {
    const num = Number(trimmed);
    return isNaN(num) ? trimmed : num;
  }

  if (type === 'string') {
    return val;
  }

  if (type === 'date') {
    return trimmed;
  }

  if (type === 'list') {
    return trimmed;
  }

  // Auto
  if (trimmed === '' || trimmed.toUpperCase() === 'NULL') {
    return null;
  }

  // Verifica se é número inteiro ou decimal
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  return val;
}

/**
 * Formata um valor para inserção literal segura no SQL
 */
function formatLiteral(val: any, type: 'auto' | 'string' | 'number' | 'date' | 'list' | 'null' = 'auto'): string {
  if (val === null || val === undefined) {
    return 'NULL';
  }

  if (type === 'list') {
    const str = String(val).trim();
    if (!str) return 'NULL';
    // Se já estiver formatado com parênteses ou aspas, respeita
    // Caso seja uma lista de itens separados por vírgula (ex: 1, 2, 3 ou 'A', 'B')
    const items = str.split(',').map((it) => it.trim());
    const formattedItems = items.map((it) => {
      if (!it) return "''";
      if (/^-?\d+(\.\d+)?$/.test(it)) return it; // número
      if ((it.startsWith("'") && it.endsWith("'")) || (it.startsWith('"') && it.endsWith('"'))) {
        return it; // já possui aspas
      }
      return `'${it.replace(/'/g, "''")}'`;
    });
    return formattedItems.join(', ');
  }

  const casted = typeof val === 'string' ? castBindValue(val, type) : val;

  if (casted === null || casted === undefined) {
    return 'NULL';
  }
  if (typeof casted === 'number') {
    return String(casted);
  }
  if (typeof casted === 'boolean') {
    return casted ? '1' : '0';
  }

  const str = String(casted);
  if (type === 'auto' && str.toUpperCase() === 'NULL') {
    return 'NULL';
  }

  return `'${str.replace(/'/g, "''")}'`;
}

/**
 * Substitui as variáveis de bind e de substituição (:VAR, &VAR, &&VAR, @VAR, ${VAR}, #{VAR})
 * diretamente no SQL por literais formatados.
 * Preserva literais de string e comentários intactos.
 */
export function substituteBindVariables(
  sql: string,
  binds: Record<string, { value: any; type?: 'auto' | 'string' | 'number' | 'date' | 'list' | 'null' } | any>
): string {
  if (!sql) return sql;

  const literalsMap: Record<string, string> = {};

  for (const [key, rawEntry] of Object.entries(binds)) {
    let rawVal: any;
    let type: any = 'auto';

    if (rawEntry && typeof rawEntry === 'object' && 'value' in rawEntry) {
      rawVal = rawEntry.value;
      type = rawEntry.type || 'auto';
    } else {
      rawVal = rawEntry;
    }

    literalsMap[key.toUpperCase()] = formatLiteral(rawVal, type);
  }

  // Tokeniza preservando strings e comentários intactos, e capturando qualquer variável
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

const BIND_CACHE_KEY = 'devManager:sqlBindCache';

/**
 * Carrega o histórico de valores de bind salvos no localStorage
 */
export function loadBindCache(): Record<string, string> {
  try {
    const data = localStorage.getItem(BIND_CACHE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/**
 * Persiste novos valores no histórico de bind cache
 */
export function saveBindCache(values: Record<string, string>): void {
  try {
    const current = loadBindCache();
    const updated = { ...current, ...values };
    localStorage.setItem(BIND_CACHE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
}
