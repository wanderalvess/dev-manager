/**
 * Utilitários para manipulação e detecção de Bind Variables (:PARAMETROS) no SQL
 */

export interface BindInputState {
  name: string;
  value: string;
  type: 'auto' | 'string' | 'number' | 'date' | 'null';
}

/**
 * Remove comentários (-- e /* *\/) e literais de string ('...') para análise sintática limpa
 */
export function stripCommentsAndLiterals(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // comentários de bloco /* ... */
    .replace(/--[^\r\n]*/g, ' ')       // comentários de linha -- ...
    .replace(/'(?:''|[^'])*'/g, "''");  // literais entre aspas simples '...'
}

/**
 * Extrai os nomes das variáveis de bind do SQL (ex: :CODPROD, :CODFILIAL),
 * ignorando comentários, literais, operador de atribuição ':=' e casts '::'.
 */
export function extractBindVariables(sql: string): string[] {
  if (!sql || !sql.trim()) return [];

  const cleaned = stripCommentsAndLiterals(sql);

  // Procura por :NOME_VARIAVEL
  // (?<!:): não precedido por ':' (evita :: do postgres)
  // :(?!=): não seguido por '=' (evita := do PL/SQL)
  // ([a-zA-Z_][a-zA-Z0-9_]*): nome identificador padrão Oracle/SQL
  const regex = /(?<!:):(?!=)([a-zA-Z_][a-zA-Z0-9_]*)\b/gi;
  const matches = cleaned.match(regex);
  if (!matches) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const m of matches) {
    // Remove o ':' inicial e normaliza para uppercase
    const varName = m.slice(1).toUpperCase();
    if (!seen.has(varName)) {
      seen.add(varName);
      result.push(varName);
    }
  }

  return result;
}

/**
 * Converte o valor digitado pelo usuário para o tipo primitivo JavaScript apropriado
 */
export function castBindValue(val: string, type: 'auto' | 'string' | 'number' | 'date' | 'null'): any {
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
 * Substitui as variáveis de bind diretamente no SQL por literais formatados.
 * Útil para o desenvolvedor que deseja ver/copiar a query resolvida inline no editor.
 */
export function substituteBindVariables(
  sql: string,
  binds: Record<string, { value: any; type?: 'auto' | 'string' | 'number' | 'date' | 'null' } | any>
): string {
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

    const casted = typeof rawVal === 'string' ? castBindValue(rawVal, type) : rawVal;

    let literal = 'NULL';
    if (casted === null || casted === undefined) {
      literal = 'NULL';
    } else if (typeof casted === 'number') {
      literal = String(casted);
    } else if (typeof casted === 'boolean') {
      literal = casted ? '1' : '0';
    } else {
      const str = String(casted).replace(/'/g, "''");
      literal = `'${str}'`;
    }
    literalsMap[key.toUpperCase()] = literal;
  }

  // Tokeniza preservando strings e comentários intactos, e substituindo apenas :VAR fora deles
  const tokenRegex = /(\/\*[\s\S]*?\*\/|--[^\r\n]*|'(?:''|[^'])*'|(?<!:):(?!=)[a-zA-Z_][a-zA-Z0-9_]*\b)/g;

  return sql.replace(tokenRegex, (match) => {
    if (match.startsWith('/*') || match.startsWith('--') || match.startsWith("'")) {
      return match;
    }
    if (match.startsWith(':')) {
      const varName = match.slice(1).toUpperCase();
      if (varName in literalsMap) {
        return literalsMap[varName];
      }
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
