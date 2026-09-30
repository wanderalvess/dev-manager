import { OracleCapturedBind } from './types';

/**
 * Formata um valor de bind como literal SQL válido (escapando aspas, números sem aspas, NULL, etc.).
 */
export function formatBindValueLiteral(value: string | null | undefined, datatype?: string | null): string {
  if (value === null || value === undefined) return 'NULL';
  const trimmed = value.trim();
  if (trimmed.toUpperCase() === 'NULL') return 'NULL';

  const dtUpper = (datatype || '').toUpperCase();
  const isNumberType =
    dtUpper.includes('NUMBER') ||
    dtUpper.includes('INT') ||
    dtUpper.includes('FLOAT') ||
    dtUpper.includes('DECIMAL');

  if (isNumberType || (!datatype && /^-?\d+(\.\d+)?$/.test(trimmed))) {
    const num = Number(trimmed);
    if (!isNaN(num)) return trimmed;
  }

  const safeStr = trimmed.replace(/'/g, "''");
  return `'${safeStr}'`;
}

/**
 * Interpola uma instrução SQL com os valores de bind capturados, substituindo
 * variáveis posicionais (:1, :2), placeholders JDBC/Hibernate (?) ou binds nomeados (:CODROTA).
 * Preserva literais de string ('...') e comentários de bloco/linha intactos.
 */
export function interpolateOracleSqlWithBinds(sql: string, binds: OracleCapturedBind[]): string {
  if (!sql || !binds || binds.length === 0) return sql;

  const nameMap = new Map<string, string>();
  const posMap = new Map<number, string>();

  for (const b of binds) {
    const literal = formatBindValueLiteral(b.value, b.datatype);
    if (b.name) {
      const cleanName = b.name.replace(/^:/, '').toUpperCase();
      nameMap.set(cleanName, literal);
      nameMap.set(`:${cleanName}`, literal);
    }
    if (b.position > 0) {
      posMap.set(b.position, literal);
      nameMap.set(String(b.position), literal);
      nameMap.set(`:${b.position}`, literal);
    }
  }

  // Tokenizador que preserva blocos de comentários e strings literais intactos
  // 1: /* ... */
  // 2: -- ...
  // 3: '...'
  // 4: ? (placeholder JDBC/Hibernate)
  // 5: :VAR (bind por nome ou número, ignorando :: e :=)
  const tokenRegex = /(\/\*[\s\S]*?\*\/|--[^\r\n]*|'(?:''|[^'])*'|\?|(?<!:):(?!=)([a-zA-Z0-9_$]+)\b)/g;

  let questionIndex = 1;

  return sql.replace(tokenRegex, (match, namedGroup) => {
    if (match.startsWith('/*') || match.startsWith('--') || match.startsWith("'")) {
      return match;
    }

    if (match === '?') {
      const replacement = posMap.get(questionIndex);
      questionIndex += 1;
      return replacement !== undefined ? replacement : match;
    }

    if (match.startsWith(':')) {
      const varName = (namedGroup || match.slice(1)).toUpperCase();
      if (nameMap.has(varName)) {
        return nameMap.get(varName)!;
      }
      if (nameMap.has(`:${varName}`)) {
        return nameMap.get(`:${varName}`)!;
      }
    }

    return match;
  });
}
