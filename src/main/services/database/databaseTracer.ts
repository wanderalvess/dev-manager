import type {
  DatabaseConnectionConfig,
  OracleTracerFilter,
  OracleActiveSessionsResult,
  OracleRecentStatementsResult,
  OracleCapturedBind,
  OracleStatementBindsResult
} from '../../../shared/types';
import {
  buildActiveSessionsQuery,
  buildRecentStatementsQuery,
  mapActiveSessionRow,
  mapRecentStatementRow,
  buildBindCaptureQuery,
  groupCapturedBindsBySqlId,
  interpolateOracleSqlWithBinds
} from '../../utils/oracleTracerUtils';
import type { DatabaseContext } from './databaseContext';

/**
 * Statement Tracer: lista as sessões conectadas ao Oracle e a instrução SQL atual/última
 * executada por cada uma (join de v$session com v$sql via SQL_ID/PREV_SQL_ID). Serve para
 * responder "quem está rodando o quê agora" quando vários apps compartilham o mesmo banco.
 */
export async function getOracleActiveSessions(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  filter?: OracleTracerFilter
): Promise<OracleActiveSessionsResult> {
  const startTime = Date.now();
  if (config.type !== 'oracle') {
    return {
      success: false,
      sessions: [],
      executionTimeMs: 0,
      error: 'Statement Tracer disponível apenas para conexões Oracle.'
    };
  }

  const { sql, binds } = buildActiveSessionsQuery(filter);
  const res = await ctx.executeQuery(config, sql, filter?.limit ?? 200, binds);
  if (!res.success || !res.rows) {
    return {
      success: false,
      sessions: [],
      executionTimeMs: Date.now() - startTime,
      error: res.error || 'Falha ao consultar sessões ativas no Oracle.'
    };
  }

  const sessions = res.rows.map(mapActiveSessionRow);

  // Enriquecer com binds de v$sql_bind_capture para as sessões que possuem SQL_ID
  const sqlIds = Array.from(new Set(sessions.map((s) => s.sqlId).filter((id): id is string => Boolean(id))));
  if (sqlIds.length > 0) {
    try {
      const bindMap = await ctx.getOracleBindsForSqlIds(config, sqlIds.slice(0, 50));
      for (const session of sessions) {
        if (!session.sqlId) continue;
        const sessionBinds = bindMap.get(session.sqlId);
        if (sessionBinds && sessionBinds.length > 0) {
          session.binds = sessionBinds;
          if (session.sqlText) {
            session.interpolatedSql = interpolateOracleSqlWithBinds(session.sqlText, sessionBinds);
          }
        }
      }
    } catch (err) {
      console.warn('[DatabaseService] Falha ao enriquecer sessões com binds:', err);
    }
  }

  return {
    success: true,
    sessions,
    executionTimeMs: Date.now() - startTime
  };
}

/**
 * Statement Tracer: lista as instruções SQL mais recentes no cursor cache do Oracle
 * (v$sql), mostrando o que rodou no banco mesmo que a sessão que executou já tenha
 * encerrado — útil para correlacionar "qual query rodou quando cliquei nesse botão".
 */
export async function getOracleRecentStatements(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  filter?: OracleTracerFilter
): Promise<OracleRecentStatementsResult> {
  const startTime = Date.now();
  if (config.type !== 'oracle') {
    return {
      success: false,
      statements: [],
      executionTimeMs: 0,
      error: 'Statement Tracer disponível apenas para conexões Oracle.'
    };
  }

  const { sql, binds } = buildRecentStatementsQuery(filter);
  const res = await ctx.executeQuery(config, sql, filter?.limit ?? 200, binds);
  if (!res.success || !res.rows) {
    return {
      success: false,
      statements: [],
      executionTimeMs: Date.now() - startTime,
      error: res.error || 'Falha ao consultar SQL recente no Oracle.'
    };
  }

  const statements = res.rows.map(mapRecentStatementRow);

  // Enriquecer com binds de v$sql_bind_capture para os SQL_IDs encontrados
  const sqlIds = Array.from(new Set(statements.map((s) => s.sqlId).filter(Boolean)));
  if (sqlIds.length > 0) {
    try {
      const bindMap = await ctx.getOracleBindsForSqlIds(config, sqlIds.slice(0, 50));
      for (const stmt of statements) {
        const stmtBinds = bindMap.get(stmt.sqlId);
        if (stmtBinds && stmtBinds.length > 0) {
          stmt.binds = stmtBinds;
          stmt.interpolatedSql = interpolateOracleSqlWithBinds(stmt.sqlText, stmtBinds);
        }
      }
    } catch (err) {
      console.warn('[DatabaseService] Falha ao enriquecer statements com binds:', err);
    }
  }

  return {
    success: true,
    statements,
    executionTimeMs: Date.now() - startTime
  };
}

/**
 * Consulta os parâmetros de bind registrados na view v$sql_bind_capture para uma lista de SQL_IDs.
 */
export async function getOracleBindsForSqlIds(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  sqlIds: string[]
): Promise<Map<string, OracleCapturedBind[]>> {
  if (config.type !== 'oracle' || !sqlIds || sqlIds.length === 0) {
    return new Map();
  }

  try {
    const { sql, binds } = buildBindCaptureQuery(sqlIds);
    const res = await ctx.executeQuery(config, sql, 2000, binds);
    if (!res.success || !res.rows) {
      return new Map();
    }
    return groupCapturedBindsBySqlId(res.rows);
  } catch (err) {
    console.warn('[DatabaseService] Falha ao consultar v$sql_bind_capture:', err);
    return new Map();
  }
}

/**
 * Consulta os parâmetros de bind (v$sql_bind_capture) para um SQL_ID específico e gera o SQL interpolado.
 */
export async function getOracleStatementBinds(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  sqlId: string,
  sqlText?: string
): Promise<OracleStatementBindsResult> {
  const startTime = Date.now();
  if (config.type !== 'oracle') {
    return {
      success: false,
      sqlId,
      binds: [],
      executionTimeMs: 0,
      error: 'Statement Tracer disponível apenas para conexões Oracle.'
    };
  }

  try {
    const bindMap = await ctx.getOracleBindsForSqlIds(config, [sqlId]);
    const binds = bindMap.get(sqlId) || [];
    const interpolatedSql = sqlText && binds.length > 0 ? interpolateOracleSqlWithBinds(sqlText, binds) : undefined;

    return {
      success: true,
      sqlId,
      binds,
      interpolatedSql,
      executionTimeMs: Date.now() - startTime
    };
  } catch (err: any) {
    return {
      success: false,
      sqlId,
      binds: [],
      executionTimeMs: Date.now() - startTime,
      error: err?.message || 'Falha ao consultar parâmetros de bind no Oracle.'
    };
  }
}
