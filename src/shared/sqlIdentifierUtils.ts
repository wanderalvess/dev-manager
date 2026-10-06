import type { SqlDialect } from './sqlStatementUtils';

const SIMPLE: Record<SqlDialect, RegExp> = {
  // PostgreSQL dobra para minúsculas: só é "simples" quem já está em minúsculas
  postgres: /^[a-z_][a-z0-9_$]*$/,
  // Oracle dobra para maiúsculas
  oracle: /^[A-Z][A-Z0-9_$#]*$/,
  mysql: /^[A-Za-z_][A-Za-z0-9_$]*$/
};

const RESERVED = new Set(['user', 'order', 'group', 'table', 'select', 'from', 'where', 'column', 'index', 'comment', 'session', 'level', 'date']);

function quotePart(part: string, dialect: SqlDialect): string {
  const needsQuote = !SIMPLE[dialect].test(part) || RESERVED.has(part.toLowerCase());
  if (!needsQuote) return part;
  if (dialect === 'mysql') return `\`${part.replace(/`/g, '``')}\``;
  return `"${part.replace(/"/g, '""')}"`;
}

/**
 * Nome de tabela pronto para usar num SQL. `public.Clientes` no PostgreSQL só funciona como `public."Clientes"`:
 * sem aspas o banco dobra para minúsculas e acusa que a relação não existe. Nomes comuns ficam como estão.
 * Aceita `schema.tabela`: cada parte é tratada separadamente.
 */
export function quoteTableName(name: string, dialect: SqlDialect): string {
  return name
    .split('.')
    .map((part) => (part.startsWith('"') || part.startsWith('`') ? part : quotePart(part, dialect)))
    .join('.');
}
