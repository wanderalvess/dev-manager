import type { SqlDialect } from '../../../shared/sqlStatementUtils';

/** Palavras-chave (e expressões de duas palavras) sugeridas em qualquer contexto genérico. */
export const SQL_KEYWORDS_COMMON = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS NULL', 'IS NOT NULL',
  'ORDER BY', 'GROUP BY', 'HAVING', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN',
  'CROSS JOIN', 'ON', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'DISTINCT', 'AS',
  'UNION', 'UNION ALL', 'INTERSECT', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DESC', 'ASC',
  'WITH', 'MERGE INTO', 'USING', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE TABLE',
  'COMMIT', 'ROLLBACK', 'SAVEPOINT', 'NULLS FIRST', 'NULLS LAST', 'ALL', 'ANY'
];

const ORACLE_KEYWORDS = [
  'ROWNUM', 'ROWID', 'DUAL', 'FETCH FIRST', 'ROWS ONLY', 'OFFSET', 'CONNECT BY', 'START WITH', 'PRIOR',
  'MINUS', 'FOR UPDATE', 'FOR UPDATE NOWAIT', 'DECLARE', 'BEGIN', 'EXCEPTION', 'LOOP', 'END LOOP',
  'CREATE OR REPLACE', 'PROCEDURE', 'FUNCTION', 'PACKAGE', 'TRIGGER', 'SEQUENCE', 'SYNONYM',
  'PARTITION BY', 'OVER', 'KEEP', 'DENSE_RANK', 'NOCOPY', 'RETURNING INTO'
];

const POSTGRES_KEYWORDS = ['LIMIT', 'OFFSET', 'RETURNING', 'ILIKE', 'ON CONFLICT', 'DO NOTHING', 'DO UPDATE SET', 'LATERAL', 'FETCH FIRST'];
const MYSQL_KEYWORDS = ['LIMIT', 'OFFSET', 'SHOW TABLES', 'SHOW COLUMNS FROM', 'DESCRIBE', 'ON DUPLICATE KEY UPDATE', 'STRAIGHT_JOIN'];

export function keywordsFor(dialect: SqlDialect): string[] {
  const extra = dialect === 'oracle' ? ORACLE_KEYWORDS : dialect === 'postgres' ? POSTGRES_KEYWORDS : MYSQL_KEYWORDS;
  return [...SQL_KEYWORDS_COMMON, ...extra];
}

export interface SqlFunctionDef {
  name: string;
  /** Assinatura curta mostrada ao lado da sugestão. */
  signature: string;
}

const COMMON_FUNCTIONS: SqlFunctionDef[] = [
  { name: 'COUNT', signature: 'COUNT(expr | *)' },
  { name: 'SUM', signature: 'SUM(expr)' },
  { name: 'AVG', signature: 'AVG(expr)' },
  { name: 'MIN', signature: 'MIN(expr)' },
  { name: 'MAX', signature: 'MAX(expr)' },
  { name: 'COALESCE', signature: 'COALESCE(a, b, ...)' },
  { name: 'NULLIF', signature: 'NULLIF(a, b)' },
  { name: 'UPPER', signature: 'UPPER(texto)' },
  { name: 'LOWER', signature: 'LOWER(texto)' },
  { name: 'TRIM', signature: 'TRIM(texto)' },
  { name: 'REPLACE', signature: 'REPLACE(texto, de, para)' },
  { name: 'ABS', signature: 'ABS(n)' },
  { name: 'ROUND', signature: 'ROUND(n, casas)' },
  { name: 'CAST', signature: 'CAST(expr AS tipo)' },
  { name: 'ROW_NUMBER', signature: 'ROW_NUMBER() OVER (...)' },
  { name: 'RANK', signature: 'RANK() OVER (...)' }
];

const ORACLE_FUNCTIONS: SqlFunctionDef[] = [
  { name: 'NVL', signature: 'NVL(valor, padrão)' },
  { name: 'NVL2', signature: 'NVL2(valor, se_nulo_não, se_nulo)' },
  { name: 'DECODE', signature: 'DECODE(expr, busca, resultado, ..., padrão)' },
  { name: 'TO_CHAR', signature: "TO_CHAR(valor, 'formato')" },
  { name: 'TO_DATE', signature: "TO_DATE(texto, 'formato')" },
  { name: 'TO_NUMBER', signature: 'TO_NUMBER(texto)' },
  { name: 'TO_TIMESTAMP', signature: "TO_TIMESTAMP(texto, 'formato')" },
  { name: 'TRUNC', signature: 'TRUNC(data | número)' },
  { name: 'SUBSTR', signature: 'SUBSTR(texto, início, tamanho)' },
  { name: 'INSTR', signature: 'INSTR(texto, busca)' },
  { name: 'LENGTH', signature: 'LENGTH(texto)' },
  { name: 'LPAD', signature: 'LPAD(texto, tamanho, preenchimento)' },
  { name: 'RPAD', signature: 'RPAD(texto, tamanho, preenchimento)' },
  { name: 'LTRIM', signature: 'LTRIM(texto)' },
  { name: 'RTRIM', signature: 'RTRIM(texto)' },
  { name: 'INITCAP', signature: 'INITCAP(texto)' },
  { name: 'ADD_MONTHS', signature: 'ADD_MONTHS(data, n)' },
  { name: 'MONTHS_BETWEEN', signature: 'MONTHS_BETWEEN(d1, d2)' },
  { name: 'LAST_DAY', signature: 'LAST_DAY(data)' },
  { name: 'NEXT_DAY', signature: "NEXT_DAY(data, 'dia')" },
  { name: 'EXTRACT', signature: 'EXTRACT(YEAR FROM data)' },
  { name: 'SYSDATE', signature: 'SYSDATE' },
  { name: 'SYSTIMESTAMP', signature: 'SYSTIMESTAMP' },
  { name: 'CURRENT_DATE', signature: 'CURRENT_DATE' },
  { name: 'LISTAGG', signature: "LISTAGG(col, ',') WITHIN GROUP (ORDER BY col)" },
  { name: 'REGEXP_LIKE', signature: 'REGEXP_LIKE(texto, padrão)' },
  { name: 'REGEXP_SUBSTR', signature: 'REGEXP_SUBSTR(texto, padrão)' },
  { name: 'REGEXP_REPLACE', signature: 'REGEXP_REPLACE(texto, padrão, novo)' },
  { name: 'CEIL', signature: 'CEIL(n)' },
  { name: 'FLOOR', signature: 'FLOOR(n)' },
  { name: 'MOD', signature: 'MOD(n, m)' },
  { name: 'GREATEST', signature: 'GREATEST(a, b, ...)' },
  { name: 'LEAST', signature: 'LEAST(a, b, ...)' },
  { name: 'LAG', signature: 'LAG(col, n) OVER (...)' },
  { name: 'LEAD', signature: 'LEAD(col, n) OVER (...)' },
  { name: 'USER', signature: 'USER' },
  { name: 'SYS_GUID', signature: 'SYS_GUID()' }
];

const POSTGRES_FUNCTIONS: SqlFunctionDef[] = [
  { name: 'NOW', signature: 'NOW()' },
  { name: 'CURRENT_TIMESTAMP', signature: 'CURRENT_TIMESTAMP' },
  { name: 'DATE_TRUNC', signature: "DATE_TRUNC('campo', data)" },
  { name: 'TO_CHAR', signature: "TO_CHAR(valor, 'formato')" },
  { name: 'TO_DATE', signature: "TO_DATE(texto, 'formato')" },
  { name: 'STRING_AGG', signature: "STRING_AGG(col, ',')" },
  { name: 'ARRAY_AGG', signature: 'ARRAY_AGG(col)' },
  { name: 'SUBSTRING', signature: 'SUBSTRING(texto FROM início FOR tamanho)' },
  { name: 'LENGTH', signature: 'LENGTH(texto)' },
  { name: 'GENERATE_SERIES', signature: 'GENERATE_SERIES(início, fim)' }
];

const MYSQL_FUNCTIONS: SqlFunctionDef[] = [
  { name: 'NOW', signature: 'NOW()' },
  { name: 'IFNULL', signature: 'IFNULL(valor, padrão)' },
  { name: 'DATE_FORMAT', signature: "DATE_FORMAT(data, 'formato')" },
  { name: 'CONCAT', signature: 'CONCAT(a, b, ...)' },
  { name: 'GROUP_CONCAT', signature: 'GROUP_CONCAT(col)' },
  { name: 'SUBSTRING', signature: 'SUBSTRING(texto, início, tamanho)' },
  { name: 'LENGTH', signature: 'LENGTH(texto)' },
  { name: 'CURDATE', signature: 'CURDATE()' }
];

export function functionsFor(dialect: SqlDialect): SqlFunctionDef[] {
  const extra = dialect === 'oracle' ? ORACLE_FUNCTIONS : dialect === 'postgres' ? POSTGRES_FUNCTIONS : MYSQL_FUNCTIONS;
  return [...COMMON_FUNCTIONS, ...extra];
}

export interface SqlSnippetDef {
  /** Gatilho digitado pelo usuário (ex.: `sel`). */
  trigger: string;
  title: string;
  /** Corpo no formato de snippet do Monaco (`${1:padrão}` marca os pontos de parada do Tab). */
  body: string;
}

export function snippetsFor(dialect: SqlDialect): SqlSnippetDef[] {
  const limit =
    dialect === 'oracle'
      ? 'FETCH FIRST ${3:100} ROWS ONLY'
      : 'LIMIT ${3:100}';
  return [
    { trigger: 'sel', title: 'SELECT … FROM', body: `SELECT \${1:*}\nFROM \${2:tabela}\nWHERE \${4:1 = 1}\n${limit}` },
    { trigger: 'selc', title: 'SELECT COUNT(*)', body: 'SELECT COUNT(*)\nFROM ${1:tabela}\nWHERE ${2:1 = 1}' },
    { trigger: 'ins', title: 'INSERT INTO … VALUES', body: 'INSERT INTO ${1:tabela} (${2:colunas})\nVALUES (${3:valores})' },
    { trigger: 'upd', title: 'UPDATE … SET … WHERE', body: 'UPDATE ${1:tabela}\nSET ${2:coluna} = ${3:valor}\nWHERE ${4:condição}' },
    { trigger: 'del', title: 'DELETE FROM … WHERE', body: 'DELETE FROM ${1:tabela}\nWHERE ${2:condição}' },
    { trigger: 'join', title: 'JOIN … ON', body: 'JOIN ${1:tabela} ${2:t}\n  ON ${2:t}.${3:coluna} = ${4:outra}.${5:coluna}' },
    { trigger: 'cte', title: 'WITH (CTE)', body: 'WITH ${1:nome} AS (\n  SELECT ${2:*}\n  FROM ${3:tabela}\n)\nSELECT *\nFROM ${1:nome}' },
    { trigger: 'case', title: 'CASE WHEN', body: 'CASE\n  WHEN ${1:condição} THEN ${2:resultado}\n  ELSE ${3:padrão}\nEND' },
    ...(dialect === 'oracle'
      ? [
          { trigger: 'begin', title: 'Bloco PL/SQL', body: 'BEGIN\n  ${1:NULL};\nEND;\n/' },
          { trigger: 'decl', title: 'DECLARE … BEGIN', body: 'DECLARE\n  ${1:v_var} ${2:NUMBER};\nBEGIN\n  ${3:NULL};\nEND;\n/' }
        ]
      : [])
  ];
}
