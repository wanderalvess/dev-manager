import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import { normalizeSqlForExecution } from '../../../shared/sqlStatementUtils';
import type { DatabaseContext } from './databaseContext';
import { testPostgres, executePostgres } from './databasePostgres';
import { testMysql, executeMysql } from './databaseMysql';
import { testOracle, executeOracle } from './databaseOracle';

/**
 * Testa a conectividade com o banco de dados especificado.
 */
export async function testConnection(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig
): Promise<{ success: boolean; message: string; version?: string }> {
  config = ctx.resolveConnectionConfig(config);
  try {
    if (!config.host || !config.port || !config.user) {
      return {
        success: false,
        message: 'Configuração incompleta: informe ao menos Host, Porta e Usuário.'
      };
    }

    switch (config.type) {
      case 'postgres':
        return await testPostgres(ctx, config);
      case 'mysql':
        return await testMysql(ctx, config);
      case 'oracle':
        return await testOracle(ctx, config);
      default:
        return { success: false, message: `Tipo de banco '${(config as any).type}' não suportado.` };
    }
  } catch (err: any) {
    return {
      success: false,
      message: await ctx.formatErrorMessage(err, config)
    };
  }
}

/**
 * Executa uma consulta (SELECT) ou comando de modificação (UPDATE, INSERT, DELETE, etc.).
 */
export async function executeQuery(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  sql: string,
  maxRows = 200,
  binds?: Record<string, any>
): Promise<QueryResult> {
  config = ctx.resolveConnectionConfig(config);
  maxRows = Number.isFinite(maxRows) && maxRows > 0 ? Math.floor(maxRows) : 200;
  const startTime = Date.now();
  const cleanSql = normalizeSqlForExecution(sql, config.type);

  if (!cleanSql) {
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      isQuery: false,
      error: 'O comando SQL não pode estar vazio.'
    };
  }

  try {
    switch (config.type) {
      case 'postgres':
        return await executePostgres(ctx, config, cleanSql, maxRows, startTime, binds);
      case 'mysql':
        return await executeMysql(ctx, config, cleanSql, maxRows, startTime, binds);
      case 'oracle':
        return await executeOracle(ctx, config, cleanSql, maxRows, startTime, binds);
      default:
        throw new Error(`Tipo de banco '${config.type}' não suportado.`);
    }
  } catch (err: any) {
    const executionTimeMs = Date.now() - startTime;
    return {
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs,
      isQuery: false,
      error: await ctx.formatErrorMessage(err, config)
    };
  }
}
