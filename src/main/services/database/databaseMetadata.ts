import type { DatabaseConnectionConfig, TableColumnInfo } from '../../../shared/types';
import type { DatabaseContext } from './databaseContext';

// Teto de segurança da listagem de tabelas. Schemas de ERP passam fácil de alguns
// milhares de tabelas, então o limite precisa ficar bem acima do de consultas comuns.
const MAX_LISTED_TABLES = 50000;

/**
 * Lista as tabelas disponíveis no schema/banco de dados conectado.
 */
export async function listTables(ctx: DatabaseContext, config: DatabaseConnectionConfig): Promise<string[]> {
  try {
    let query = '';
    if (config.type === 'oracle') {
      query = 'SELECT table_name FROM user_tables ORDER BY table_name';
    } else if (config.type === 'postgres') {
      query =
        "SELECT table_schema || '.' || table_name AS table_name FROM information_schema.tables " +
        "WHERE table_schema NOT IN ('pg_catalog', 'information_schema') ORDER BY table_schema, table_name";
    } else if (config.type === 'mysql') {
      query = 'SHOW TABLES';
    }

    const res = await ctx.executeQuery(config, query, MAX_LISTED_TABLES);
    if (!res.success || !res.rows) return [];

    return res.rows.map((row) => {
      const firstKey = Object.keys(row)[0];
      return String(row[firstKey]);
    });
  } catch {
    return [];
  }
}

/**
 * Lista as colunas e tipos de dados de uma tabela específica.
 */
export async function getTableColumns(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  tableName: string
): Promise<TableColumnInfo[]> {
  const cleanTable = tableName.trim().replace(/[^a-zA-Z0-9_$.]/g, '');
  if (!cleanTable) return [];

  try {
    if (config.type === 'oracle') {
      const upperTable = cleanTable.toUpperCase();
      const query = `
          SELECT
            c.COLUMN_NAME,
            c.DATA_TYPE,
            c.DATA_LENGTH,
            c.DATA_PRECISION,
            c.DATA_SCALE,
            c.NULLABLE,
            CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'Y' ELSE 'N' END AS IS_PK
          FROM USER_TAB_COLS c
          LEFT JOIN (
            SELECT cc.COLUMN_NAME
            FROM USER_CONSTRAINTS uc
            JOIN USER_CONS_COLUMNS cc ON uc.CONSTRAINT_NAME = cc.CONSTRAINT_NAME
            WHERE uc.CONSTRAINT_TYPE = 'P'
              AND uc.TABLE_NAME = '${upperTable}'
          ) pk ON c.COLUMN_NAME = pk.COLUMN_NAME
          WHERE c.TABLE_NAME = '${upperTable}'
            AND c.HIDDEN_COLUMN = 'NO'
          ORDER BY c.COLUMN_ID
        `;
      const res = await ctx.executeQuery(config, query, 300);
      if (!res.success || !res.rows) return [];

      return res.rows.map((r: any) => {
        let typeStr = String(r.DATA_TYPE || '');
        if (r.DATA_PRECISION) {
          typeStr += `(${r.DATA_PRECISION}${r.DATA_SCALE ? ',' + r.DATA_SCALE : ''})`;
        } else if (r.DATA_LENGTH && ['VARCHAR2', 'CHAR', 'RAW'].includes(r.DATA_TYPE)) {
          typeStr += `(${r.DATA_LENGTH})`;
        }
        return {
          name: String(r.COLUMN_NAME || ''),
          type: typeStr,
          nullable: r.NULLABLE === 'Y',
          isPrimaryKey: r.IS_PK === 'Y',
          length: r.DATA_LENGTH
        };
      });
    } else if (config.type === 'postgres') {
      const dotIdx = cleanTable.lastIndexOf('.');
      const schemaPart = dotIdx >= 0 ? cleanTable.slice(0, dotIdx) : 'public';
      const tablePart = dotIdx >= 0 ? cleanTable.slice(dotIdx + 1) : cleanTable;
      const query = `
          SELECT
            c.column_name,
            c.data_type,
            c.is_nullable,
            c.character_maximum_length,
            c.column_default,
            CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_pk
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT ku.column_name, ku.table_name, ku.table_schema
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage ku
              ON tc.constraint_name = ku.constraint_name AND tc.table_schema = ku.table_schema
            WHERE tc.constraint_type = 'PRIMARY KEY'
          ) pk ON c.table_name = pk.table_name AND c.table_schema = pk.table_schema AND c.column_name = pk.column_name
          WHERE LOWER(c.table_name) = LOWER('${tablePart}') AND LOWER(c.table_schema) = LOWER('${schemaPart}')
          ORDER BY c.ordinal_position
        `;
      const res = await ctx.executeQuery(config, query, 300);
      if (!res.success || !res.rows) return [];

      return res.rows.map((r: any) => ({
        name: String(r.column_name || ''),
        type: r.character_maximum_length ? `${r.data_type}(${r.character_maximum_length})` : String(r.data_type || ''),
        nullable: r.is_nullable === 'YES',
        isPrimaryKey: r.is_pk === 'YES',
        length: r.character_maximum_length,
        defaultValue: r.column_default ? String(r.column_default) : undefined
      }));
    } else if (config.type === 'mysql') {
      const query = `SHOW FULL COLUMNS FROM \`${cleanTable}\``;
      const res = await ctx.executeQuery(config, query, 300);
      if (!res.success || !res.rows) return [];

      return res.rows.map((r: any) => ({
        name: String(r.Field || Object.values(r)[0] || ''),
        type: String(r.Type || ''),
        nullable: r.Null === 'YES',
        isPrimaryKey: r.Key === 'PRI',
        defaultValue: r.Default !== null && r.Default !== undefined ? String(r.Default) : undefined
      }));
    }
    return [];
  } catch (err) {
    console.warn(`[DatabaseService] Erro ao obter colunas da tabela ${cleanTable}:`, err);
    return [];
  }
}
