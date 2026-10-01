/**
 * Utilitários para formatação e análise visual de comandos SQL
 */

/**
 * Remove comentários e strings para análise tokenizada
 */
function tokenizeSql(sql: string): Array<{ text: string; isLiteralOrComment: boolean }> {
  const tokenRegex = /(\/\*[\s\S]*?\*\/|--[^\r\n]*|'(?:''|[^'])*')/g;
  const parts: Array<{ text: string; isLiteralOrComment: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(sql)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: sql.slice(lastIndex, match.index), isLiteralOrComment: false });
    }
    parts.push({ text: match[0], isLiteralOrComment: true });
    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < sql.length) {
    parts.push({ text: sql.slice(lastIndex), isLiteralOrComment: false });
  }

  return parts;
}

/**
 * Palavras-chave principais que iniciam novas linhas ou seções
 */
const MAJOR_CLAUSES = [
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LEFT JOIN',
  'RIGHT JOIN',
  'INNER JOIN',
  'CROSS JOIN',
  'FULL OUTER JOIN',
  'OUTER JOIN',
  'JOIN',
  'UNION ALL',
  'UNION',
  'INSERT INTO',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'DELETE',
  'CONNECT BY',
  'START WITH'
];

/**
 * Palavras-chave subordinadas com indentação
 */
const SUB_CLAUSES = ['AND', 'OR', 'ON'];

/**
 * Formata um comando SQL complexo adicionando quebras de linha e indentação inteligente
 * para facilitar a leitura de queries grandes.
 */
export function formatSql(sql: string): string {
  if (!sql || !sql.trim()) return sql;

  const tokens = tokenizeSql(sql);
  let formatted = '';

  for (const token of tokens) {
    if (token.isLiteralOrComment) {
      formatted += token.text;
      continue;
    }

    let text = token.text;

    // Normaliza múltiplos espaços e quebras em espaço simples
    text = text.replace(/\s+/g, ' ');

    // Aplica quebra antes de cláusulas principais
    for (const clause of MAJOR_CLAUSES) {
      const reg = new RegExp(`\\b${clause}\\b`, 'gi');
      text = text.replace(reg, `\n${clause.toUpperCase()}`);
    }

    // Aplica quebra e indentação para AND/OR/ON
    for (const sub of SUB_CLAUSES) {
      const reg = new RegExp(`\\b${sub}\\b`, 'gi');
      text = text.replace(reg, `\n  ${sub.toUpperCase()}`);
    }

    // Quebra itens de SELECT se houver vírgula seguida de espaço
    text = text.replace(/, /g, ',\n       ');

    formatted += text;
  }

  // Limpa linhas em branco repetidas e espaços nas pontas
  return formatted
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Calcula estatísticas do SQL para barra de status (linhas, colunas, caracteres)
 */
export function getSqlMetrics(sql: string, selectionStart?: number) {
  const lines = sql.split('\n');
  const lineCount = lines.length;
  const charCount = sql.length;

  let currentLine = 1;
  let currentColumn = 1;

  if (typeof selectionStart === 'number' && selectionStart >= 0) {
    const textBefore = sql.slice(0, selectionStart);
    const linesBefore = textBefore.split('\n');
    currentLine = linesBefore.length;
    currentColumn = (linesBefore[linesBefore.length - 1]?.length || 0) + 1;
  }

  return {
    lineCount,
    charCount,
    currentLine,
    currentColumn
  };
}
