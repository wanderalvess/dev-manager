import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import { sanitizeRows } from '../../utils/databaseValueUtils';
import { applyRowLimit } from '../../../shared/sqlStatementUtils';
import type { DatabaseContext } from './databaseContext';

export async function getPgClient(config: DatabaseConnectionConfig) {
  let pgModule: any;
  try {
    pgModule = await import('pg');
  } catch {
    throw new Error("Driver do PostgreSQL não instalado. Execute: npm install pg @types/pg");
  }

  const { Client } = pgModule.default || pgModule;
  const client = new Client({
    host: config.host,
    port: config.port || 5432,
    database: config.database || 'postgres',
    user: config.user,
    password: config.password,
    ssl: config.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 7000,
    // Sem isto uma consulta travada ocupa a conexão compartilhada indefinidamente
    statement_timeout: 60000
  });

  await client.connect();
  return client;
}

export async function testPostgres(ctx: DatabaseContext, config: DatabaseConnectionConfig) {
  return ctx.withConnection(
    config,
    () => ctx.getPgClient(config),
    (client) => client.end(),
    async (client) => {
      const res = await client.query('SELECT version();');
      const version = res.rows[0]?.version || 'PostgreSQL Conectado com Sucesso';
      return { success: true, message: 'Conexão bem-sucedida ao PostgreSQL!', version };
    }
  );
}

/** Executa um comando numa conexão (cliente) PostgreSQL já aberta. */
export async function runPostgresStatement(
  ctx: DatabaseContext,
  client: any,
  sql: string,
  maxRows: number,
  startTime: number,
  binds?: Record<string, any>
): Promise<QueryResult> {
  const finalSql = applyRowLimit(ctx.interpolateBinds(sql, binds), 'postgres', maxRows);
  const res = await client.query(finalSql);
  const executionTimeMs = Date.now() - startTime;

  if (Array.isArray(res)) {
    // Múltiplos comandos
    const last = res[res.length - 1];
    const isQuery = Boolean(last.fields && last.fields.length > 0);
    const columns = isQuery ? last.fields.map((f: any) => f.name) : [];
    const allRows = isQuery ? last.rows || [] : [];
    const rawRows = allRows.slice(0, maxRows);
    return {
      success: true,
      columns,
      rows: sanitizeRows(rawRows, columns),
      rowCount: rawRows.length,
      affectedRows: !isQuery ? last.rowCount ?? undefined : undefined,
      executionTimeMs,
      isQuery,
      truncated: allRows.length > maxRows
    };
  }

  const isQuery = Boolean(res.fields && res.fields.length > 0);
  const columns = isQuery ? res.fields.map((f: any) => f.name) : [];
  const allRows = isQuery ? res.rows || [] : [];
  const rawRows = allRows.slice(0, maxRows);
  return {
    success: true,
    columns,
    rows: sanitizeRows(rawRows, columns),
    rowCount: rawRows.length,
    affectedRows: !isQuery ? res.rowCount ?? undefined : undefined,
    executionTimeMs,
    isQuery,
    truncated: allRows.length > maxRows
  };
}

export async function executePostgres(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  sql: string,
  maxRows: number,
  startTime: number,
  binds?: Record<string, any>
): Promise<QueryResult> {
  return ctx.withConnection(
    config,
    () => ctx.getPgClient(config),
    (client) => client.end(),
    (client) => runPostgresStatement(ctx, client, sql, maxRows, startTime, binds),
    true
  );
}
