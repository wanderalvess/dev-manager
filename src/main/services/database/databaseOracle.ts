import path from 'path';
import fs from 'fs';
import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import { sanitizeRows } from '../../utils/databaseValueUtils';
import { normalizeSqlForExecution, stripLeadingComments } from '../../../shared/sqlStatementUtils';
import type { DatabaseContext, OracleConnection } from './databaseContext';

function initOracleThickClient(ctx: DatabaseContext, oracledb: any, libDir?: string): void {
  if (ctx.oracleClientInitialized) return;
  try {
    const options: { libDir?: string; binaryDir?: string; configDir?: string } = {};
    const trimmed = libDir?.trim();
    if (trimmed) {
      options.libDir = trimmed;
    }
    const binaryDir = ctx.getOracleBinaryDir();
    if (binaryDir) {
      options.binaryDir = binaryDir;
    }
    const tnsPath = ctx.configService?.getSettings().oracleTnsnamesPath?.trim();
    if (tnsPath && fs.existsSync(tnsPath)) {
      options.configDir = path.dirname(tnsPath);
    }
    oracledb.initOracleClient(options);
    ctx.oracleClientInitialized = true;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes('NJS-009') || msg.includes('already been called')) {
      ctx.oracleClientInitialized = true;
      return;
    }
    throw err;
  }
}

export async function getOracleConnection(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig
): Promise<OracleConnection> {
  let oracleModule: any;
  try {
    // Prioriza createRequire para módulos nativos C++ em ambiente ESM
    oracleModule = ctx.requireNative('oracledb');
  } catch {
    try {
      oracleModule = await import('oracledb');
    } catch {
      throw new Error("Driver do Oracle não instalado. Execute: npm install oracledb");
    }
  }

  const oracledb = oracleModule.default || oracleModule;

  // Configura tratamento nativo de LOBs no Oracle para carregar como strings/buffers em vez de streams
  try {
    if (oracledb.CLOB && (!oracledb.fetchAsString || !oracledb.fetchAsString.includes(oracledb.CLOB))) {
      oracledb.fetchAsString = [oracledb.CLOB];
    }
    if (oracledb.BLOB && (!oracledb.fetchAsBuffer || !oracledb.fetchAsBuffer.includes(oracledb.BLOB))) {
      oracledb.fetchAsBuffer = [oracledb.BLOB];
    }
  } catch {
    // Ignora caso a versão não suporte
  }

  // Configura TNS_ADMIN caso o tnsnames.ora esteja configurado
  const tnsPath = ctx.configService?.getSettings().oracleTnsnamesPath?.trim();
  if (tnsPath && fs.existsSync(tnsPath) && !process.env.TNS_ADMIN) {
    process.env.TNS_ADMIN = path.dirname(tnsPath);
  }

  // Se o usuário solicitou Thick Mode ou informou o caminho do Instant Client, inicializa antes de conectar
  if (config.oracleThickMode || config.oracleClientPath) {
    initOracleThickClient(ctx, oracledb, config.oracleClientPath);
  }

  // Montar string de conexão Oracle
  // Para Service Name: host:port/serviceName
  // Para SID: host:port:SID
  const separator = config.oracleMode === 'sid' ? ':' : '/';
  const connectString = `${config.host}:${config.port || 1521}${separator}${config.database}`;

  try {
    const conn = await oracledb.getConnection({
      user: config.user,
      password: config.password,
      connectString
    });
    return { conn, oracledb };
  } catch (err: any) {
    const msg = err?.message || String(err);
    // Se for NJS-138 (Thin mode rejeitado pelo Oracle 11g/anterior) e o cliente ainda não foi inicializado em Thick mode:
    // tenta automaticamente inicializar Thick Mode caso o Instant Client esteja disponível no PATH do sistema.
    if (msg.includes('NJS-138') && !ctx.oracleClientInitialized) {
      try {
        initOracleThickClient(ctx, oracledb, config.oracleClientPath);
        const conn = await oracledb.getConnection({
          user: config.user,
          password: config.password,
          connectString
        });
        return { conn, oracledb };
      } catch {
        // Se a tentativa de inicializar Thick falhar, relança o erro original NJS-138
        throw err;
      }
    }
    throw err;
  }
}

export async function testOracle(ctx: DatabaseContext, config: DatabaseConnectionConfig) {
  return ctx.withConnection(
    config,
    () => ctx.getOracleConnection(config),
    ({ conn }) => conn.close(),
    async ({ conn, oracledb }) => {
      try {
        const result = await conn.execute('SELECT * FROM v$version WHERE banner LIKE \'Oracle%\'', [], {
          outFormat: oracledb.OUT_FORMAT_OBJECT
        });
        const banner = (result.rows as any[])?.[0]?.BANNER ||
          (ctx.oracleClientInitialized
            ? 'Oracle Database Conectado (Thick Mode)'
            : 'Oracle Database Conectado (Thin Mode)');
        return { success: true, message: 'Conexão bem-sucedida ao Oracle!', version: banner };
      } catch {
        // Fallback caso usuário não tenha permissão no v$version
        return { success: true, message: 'Conexão bem-sucedida ao Oracle Database!' };
      }
    }
  );
}

export async function executeOracle(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  sql: string,
  maxRows: number,
  startTime: number,
  binds?: Record<string, any>
): Promise<QueryResult> {
  return ctx.withConnection(
    config,
    () => ctx.getOracleConnection(config),
    ({ conn }) => conn.close(),
    async ({ conn, oracledb }) => {
      const cleanSql = normalizeSqlForExecution(sql, 'oracle');
      const sqlWithoutComments = stripLeadingComments(cleanSql);
      const isSelect = /^(SELECT|WITH)\b/i.test(sqlWithoutComments);

      let sqlToExecute = cleanSql;
      let bindParams: any = [];

      if (binds && typeof binds === 'object' && Object.keys(binds).length > 0) {
        const hasSubstitutionVars = /(?<!&)&(?!=)[a-zA-Z_]|&&[a-zA-Z_]|@[a-zA-Z_]|\$\{[a-zA-Z_]|#\{[a-zA-Z_]/.test(cleanSql);
        if (hasSubstitutionVars) {
          sqlToExecute = ctx.interpolateBinds(cleanSql, binds);
          bindParams = [];
        } else {
          bindParams = binds;
        }
      }

      const execOptions: any = {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: !isSelect,
        // maxRows+1: a linha extra indica que o resultado foi truncado
        maxRows: isSelect ? maxRows + 1 : undefined
      };
      // callTimeout (ms) evita travamento de socket em consultas demoradas
      execOptions.callTimeout = 60000;

      const result = await conn.execute(sqlToExecute, bindParams, execOptions);

      const executionTimeMs = Date.now() - startTime;

      if (result.rows && result.metaData) {
        const columns = result.metaData.map((m: any) => m.name);
        const allRows = result.rows as Record<string, any>[];
        const rawRows = allRows.slice(0, maxRows);
        return {
          success: true,
          columns,
          rows: sanitizeRows(rawRows, columns),
          rowCount: rawRows.length,
          executionTimeMs,
          isQuery: true,
          truncated: allRows.length > maxRows
        };
      }

      return {
        success: true,
        columns: [],
        rows: [],
        rowCount: 0,
        affectedRows: result.rowsAffected ?? 0,
        executionTimeMs,
        isQuery: false
      };
    },
    true
  );
}
