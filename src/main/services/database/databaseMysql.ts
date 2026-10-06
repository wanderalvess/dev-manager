import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import { sanitizeRows } from '../../utils/databaseValueUtils';
import { applyRowLimit } from '../../../shared/sqlStatementUtils';
import type { DatabaseContext } from './databaseContext';

export async function getMysqlConnection(config: DatabaseConnectionConfig) {
  let mysqlModule: any;
  try {
    mysqlModule = await import('mysql2/promise');
  } catch {
    throw new Error("Driver do MySQL não instalado. Execute: npm install mysql2");
  }

  const mysql = mysqlModule.default || mysqlModule;
  return await mysql.createConnection({
    host: config.host,
    port: config.port || 3306,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
    connectTimeout: 7000
  });
}

export async function testMysql(ctx: DatabaseContext, config: DatabaseConnectionConfig) {
  return ctx.withConnection(
    config,
    () => ctx.getMysqlConnection(config),
    (conn) => conn.end(),
    async (conn) => {
      const [rows] = await conn.query('SELECT VERSION() as version;');
      const version = (rows as any)?.[0]?.version || 'MySQL Conectado com Sucesso';
      return { success: true, message: 'Conexão bem-sucedida ao MySQL!', version: `MySQL ${version}` };
    }
  );
}

/** Executa um comando numa conexão MySQL já aberta. */
export async function runMysqlStatement(
  ctx: DatabaseContext,
  conn: any,
  sql: string,
  maxRows: number,
  startTime: number,
  binds?: Record<string, any>
): Promise<QueryResult> {
  const finalSql = applyRowLimit(ctx.interpolateBinds(sql, binds), 'mysql', maxRows);
  // timeout (ms) por consulta: sem ele uma query travada ocupa a conexão compartilhada indefinidamente
  const [result, fields] = await conn.query({ sql: finalSql, timeout: 60000 });
  const executionTimeMs = Date.now() - startTime;

  if (Array.isArray(result) && fields) {
    // É um SELECT / resultado com colunas
    const columns = (fields as any[]).map((f) => f.name);
    const rawRows = (result as Record<string, any>[]).slice(0, maxRows);
    return {
      success: true,
      columns,
      rows: sanitizeRows(rawRows, columns),
      rowCount: rawRows.length,
      executionTimeMs,
      isQuery: true,
      truncated: result.length > maxRows
    };
  }

  // É um UPDATE / INSERT / DELETE (OkPacket)
  const affectedRows = (result as any)?.affectedRows ?? 0;
  return {
    success: true,
    columns: [],
    rows: [],
    rowCount: 0,
    affectedRows,
    executionTimeMs,
    isQuery: false
  };
}

export async function executeMysql(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  sql: string,
  maxRows: number,
  startTime: number,
  binds?: Record<string, any>
): Promise<QueryResult> {
  return ctx.withConnection(
    config,
    () => ctx.getMysqlConnection(config),
    (conn) => conn.end(),
    (conn) => runMysqlStatement(ctx, conn, sql, maxRows, startTime, binds),
    true
  );
}
