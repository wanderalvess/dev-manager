import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import { sanitizeRows } from '../../utils/databaseValueUtils';
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
    connectionTimeoutMillis: 7000
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
    async (client) => {
      const finalSql = ctx.interpolateBinds(sql, binds);
      const res = await client.query(finalSql);
      const executionTimeMs = Date.now() - startTime;

      if (Array.isArray(res)) {
        // Múltiplos comandos
        const last = res[res.length - 1];
        const isQuery = Boolean(last.fields && last.fields.length > 0);
        const columns = isQuery ? last.fields.map((f: any) => f.name) : [];
        const rawRows = isQuery ? (last.rows || []).slice(0, maxRows) : [];
        return {
          success: true,
          columns,
          rows: sanitizeRows(rawRows, columns),
          rowCount: isQuery ? (last.rows ? last.rows.length : 0) : 0,
          affectedRows: !isQuery ? last.rowCount ?? undefined : undefined,
          executionTimeMs,
          isQuery
        };
      }

      const isQuery = Boolean(res.fields && res.fields.length > 0);
      const columns = isQuery ? res.fields.map((f: any) => f.name) : [];
      const rawRows = isQuery ? (res.rows || []).slice(0, maxRows) : [];
      return {
        success: true,
        columns,
        rows: sanitizeRows(rawRows, columns),
        rowCount: isQuery ? (res.rows ? res.rows.length : 0) : 0,
        affectedRows: !isQuery ? res.rowCount ?? undefined : undefined,
        executionTimeMs,
        isQuery
      };
    },
    true
  );
}
