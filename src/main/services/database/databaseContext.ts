import type { DatabaseConnectionConfig, OracleCapturedBind, QueryResult } from '../../../shared/types';
import type { ConfigService } from '../ConfigService';

export interface CachedConnection {
  conn: any;
  close: (conn: any) => Promise<void>;
  timer: ReturnType<typeof setTimeout>;
  queue: Promise<any>;
  /** Execuções em andamento ou na fila: o timer de ociosidade só conta quando zera. */
  active: number;
}

export type OracleConnection = { conn: any; oracledb: any };

/**
 * Contexto mínimo que os módulos extraídos de DatabaseService usam. A fachada passa uma
 * implementação que delega para a própria instância (late-binding), de modo que
 * vi.spyOn/mocks em métodos da instância (inclusive privados) continuem interceptando
 * as chamadas internas.
 */
export interface DatabaseContext {
  readonly configService?: ConfigService;
  readonly connCache: Map<string, Promise<CachedConnection>>;
  readonly idleMs: number;
  oracleClientInitialized: boolean;
  resolveConnectionConfig(config: DatabaseConnectionConfig): DatabaseConnectionConfig;
  withConnection<T, R>(
    config: DatabaseConnectionConfig,
    getConn: () => Promise<T>,
    closeConn: (conn: T) => Promise<void>,
    fn: (conn: T) => Promise<R>,
    reuse?: boolean
  ): Promise<R>;
  getPgClient(config: DatabaseConnectionConfig): Promise<any>;
  getMysqlConnection(config: DatabaseConnectionConfig): Promise<any>;
  getOracleConnection(config: DatabaseConnectionConfig): Promise<OracleConnection>;
  getOracleBinaryDir(): string | undefined;
  /** require() ancorado em import.meta.url da fachada (resolução de módulos nativos). */
  requireNative(id: string): any;
  executeQuery(
    config: DatabaseConnectionConfig,
    sql: string,
    maxRows?: number,
    binds?: Record<string, any>
  ): Promise<QueryResult>;
  interpolateBinds(sql: string, binds?: Record<string, any>): string;
  formatErrorMessage(err: any, config: DatabaseConnectionConfig): Promise<string>;
  getOracleBindsForSqlIds(
    config: DatabaseConnectionConfig,
    sqlIds: string[]
  ): Promise<Map<string, OracleCapturedBind[]>>;
}
