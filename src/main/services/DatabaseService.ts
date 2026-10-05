import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import {
  DatabaseConnectionConfig,
  QueryResult,
  TableColumnInfo,
  ExplainPlanResult,
  OracleTracerFilter,
  OracleActiveSessionsResult,
  OracleRecentStatementsResult,
  OracleCapturedBind,
  OracleStatementBindsResult,
  ParseTnsNamesResult
} from '../../shared/types';
import { interpolateSqlBinds } from '../utils/databaseSqlUtils';
import type { ConfigService } from './ConfigService';
import type { CachedConnection, DatabaseContext } from './database/databaseContext';
import * as connection from './database/databaseConnection';
import * as queries from './database/databaseQueries';
import * as mutations from './database/databaseMutations';
import * as metadata from './database/databaseMetadata';
import * as explain from './database/databaseExplain';
import * as tracer from './database/databaseTracer';
import * as tns from './database/databaseTns';
import { getPgClient } from './database/databasePostgres';
import { getMysqlConnection } from './database/databaseMysql';
import { getOracleConnection } from './database/databaseOracle';
import { formatErrorMessage } from './database/databaseErrors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = __dirname;
}
if (typeof (globalThis as any).__filename === 'undefined') {
  (globalThis as any).__filename = __filename;
}

/**
 * Fachada fina: mantém o estado (configService, cache de conexões, flag do thick client) e a
 * API pública; a lógica vive em ./database/*. Os módulos recebem `this.ctx`, cujas chamadas
 * voltam pela instância (late-binding), preservando a interceptação por vi.spyOn nos métodos
 * (inclusive privados). Caminhos relativos a __dirname/import.meta.url ficam aqui de propósito.
 */
export class DatabaseService {
  // Guarda a Promise da conexão (não o valor já resolvido) para que duas chamadas
  // concorrentes com a mesma cacheKey (ex: testConnection + listTables disparados
  // juntos pela UI) aguardem a MESMA conexão em vez de cada uma abrir a sua e uma
  // sobrescrever silenciosamente a outra no Map (vazando um handle nunca fechado).
  private connCache = new Map<string, Promise<CachedConnection>>();
  private static readonly IDLE_MS = 30000;
  private static oracleClientInitialized = false;
  private readonly ctx: DatabaseContext;

  constructor(private configService?: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- necessário para os getters/setters do estado privado
    const self = this;
    this.ctx = {
      get configService() { return self.configService; },
      connCache: self.connCache,
      idleMs: DatabaseService.IDLE_MS,
      get oracleClientInitialized() { return DatabaseService.oracleClientInitialized; },
      set oracleClientInitialized(value: boolean) { DatabaseService.oracleClientInitialized = value; },
      resolveConnectionConfig: (c) => self.resolveConnectionConfig(c),
      withConnection: (c, getConn, closeConn, fn, reuse) => self.withConnection(c, getConn, closeConn, fn, reuse),
      getPgClient: (c) => self.getPgClient(c),
      getMysqlConnection: (c) => self.getMysqlConnection(c),
      getOracleConnection: (c) => self.getOracleConnection(c),
      getOracleBinaryDir: () => self.getOracleBinaryDir(),
      requireNative: (id) => createRequire(import.meta.url)(id),
      executeQuery: (c, sql, maxRows, binds) => self.executeQuery(c, sql, maxRows, binds),
      interpolateBinds: (sql, binds) => self.interpolateBinds(sql, binds),
      formatErrorMessage: (err, c) => self.formatErrorMessage(err, c),
      getOracleBindsForSqlIds: (c, ids) => self.getOracleBindsForSqlIds(c, ids)
    };
  }

  public resolveConnectionConfig(config: DatabaseConnectionConfig): DatabaseConnectionConfig {
    return connection.resolveConnectionConfig(this.ctx, config);
  }

  private async withConnection<T, R>(
    config: DatabaseConnectionConfig,
    getConn: () => Promise<T>,
    closeConn: (conn: T) => Promise<void>,
    fn: (conn: T) => Promise<R>,
    reuse = false
  ): Promise<R> {
    return connection.withConnection(this.ctx, config, getConn, closeConn, fn, reuse);
  }

  public async testConnection(
    config: DatabaseConnectionConfig
  ): Promise<{ success: boolean; message: string; version?: string }> {
    return queries.testConnection(this.ctx, config);
  }

  public async executeQuery(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows = 200,
    binds?: Record<string, any>
  ): Promise<QueryResult> {
    return queries.executeQuery(this.ctx, config, sql, maxRows, binds);
  }

  public async insertRow(
    config: DatabaseConnectionConfig,
    tableName: string,
    values: Record<string, any>
  ): Promise<QueryResult> {
    return mutations.insertRow(this.ctx, config, tableName, values);
  }

  public async updateRow(
    config: DatabaseConnectionConfig,
    tableName: string,
    changes: Record<string, any>,
    where: Record<string, any>
  ): Promise<QueryResult> {
    return mutations.updateRow(this.ctx, config, tableName, changes, where);
  }

  public async deleteRow(
    config: DatabaseConnectionConfig,
    tableName: string,
    where: Record<string, any>
  ): Promise<QueryResult> {
    return mutations.deleteRow(this.ctx, config, tableName, where);
  }

  public interpolateBinds(sql: string, binds?: Record<string, any>): string {
    return interpolateSqlBinds(sql, binds);
  }

  public async listTables(config: DatabaseConnectionConfig): Promise<string[]> {
    return metadata.listTables(this.ctx, config);
  }

  public async getTableColumns(
    config: DatabaseConnectionConfig,
    tableName: string
  ): Promise<TableColumnInfo[]> {
    return metadata.getTableColumns(this.ctx, config, tableName);
  }

  public async explainPlan(config: DatabaseConnectionConfig, sql: string): Promise<ExplainPlanResult> {
    return explain.explainPlan(this.ctx, config, sql);
  }

  public async getOracleActiveSessions(
    config: DatabaseConnectionConfig,
    filter?: OracleTracerFilter
  ): Promise<OracleActiveSessionsResult> {
    return tracer.getOracleActiveSessions(this.ctx, config, filter);
  }

  public async getOracleRecentStatements(
    config: DatabaseConnectionConfig,
    filter?: OracleTracerFilter
  ): Promise<OracleRecentStatementsResult> {
    return tracer.getOracleRecentStatements(this.ctx, config, filter);
  }

  public async getOracleBindsForSqlIds(
    config: DatabaseConnectionConfig,
    sqlIds: string[]
  ): Promise<Map<string, OracleCapturedBind[]>> {
    return tracer.getOracleBindsForSqlIds(this.ctx, config, sqlIds);
  }

  public async getOracleStatementBinds(
    config: DatabaseConnectionConfig,
    sqlId: string,
    sqlText?: string
  ): Promise<OracleStatementBindsResult> {
    return tracer.getOracleStatementBinds(this.ctx, config, sqlId, sqlText);
  }

  public async parseTnsNames(filePath?: string): Promise<ParseTnsNamesResult> {
    return tns.parseTnsNames(this.ctx, filePath);
  }

  private async getPgClient(config: DatabaseConnectionConfig) {
    return getPgClient(config);
  }

  private async getMysqlConnection(config: DatabaseConnectionConfig) {
    return getMysqlConnection(config);
  }

  private async getOracleConnection(config: DatabaseConnectionConfig) {
    return getOracleConnection(this.ctx, config);
  }

  private async formatErrorMessage(err: any, config: DatabaseConnectionConfig): Promise<string> {
    return formatErrorMessage(err, config);
  }

  // Os caminhos dependem da posição deste arquivo (__dirname), por isso não saem da fachada.
  private getOracleBinaryDir(): string | undefined {
    try {
      const candidates = [
        path.join(process.cwd(), 'node_modules', 'oracledb', 'build', 'Release'),
        path.join(__dirname, '..', '..', '..', 'node_modules', 'oracledb', 'build', 'Release'),
        path.join(__dirname, '..', 'node_modules', 'oracledb', 'build', 'Release')
      ];
      if (typeof (process as any).resourcesPath === 'string') {
        candidates.push(
          path.join((process as any).resourcesPath, 'app.asar.unpacked', 'node_modules', 'oracledb', 'build', 'Release'),
          path.join((process as any).resourcesPath, 'node_modules', 'oracledb', 'build', 'Release')
        );
      }
      return candidates.find((dir) => fs.existsSync(dir));
    } catch {
      return undefined;
    }
  }
}
