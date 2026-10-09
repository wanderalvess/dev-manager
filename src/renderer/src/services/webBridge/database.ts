import type {
  DatabaseConnectionConfig,
  ParseTnsNamesResult,
  QueryResult,
  DbObjectInfo,
  DbObjectType,
  DbSessionQueryResult,
  DbSessionState,
  ObjectDdlResult,
  TableDetails,
  ExplainPlanResult,
  OracleTracerFilter,
  OracleActiveSessionsResult,
  OracleRecentStatementsResult,
  OracleStatementBindsResult,
  OracleCaptureOptions,
  OracleCaptureState,
  DbTableColumnsResult,
  DbTablesResult,
  BackupConfig,
  BackupResult,
  BackupFileInfo,
  BackupHistoryEntry,
  BackupWebhookConfig
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Banco de Dados (Oracle, MySQL, Postgres). */
export function createDatabaseApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // Banco de Dados (Oracle, MySQL, Postgres)
    parseTnsNames: async (filePath?: string): Promise<ParseTnsNamesResult> => {
      return apiFetch('/api/db/tnsnames/parse', {
        method: 'POST',
        body: JSON.stringify({ filePath })
      });
    },

    testDbConnection: async (config: DatabaseConnectionConfig): Promise<{ success: boolean; message: string; version?: string }> => {
      return apiFetch('/api/db/test', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    executeDbQuery: async (config: DatabaseConnectionConfig, sql: string, maxRows?: number, binds?: Record<string, any>): Promise<QueryResult> => {
      return apiFetch('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({ config, sql, maxRows, binds })
      });
    },

    getDbTableDetails: async (config: DatabaseConnectionConfig, tableName: string): Promise<TableDetails> => {
      return apiFetch('/api/db/table-details', { method: 'POST', body: JSON.stringify({ config, tableName }) });
    },

    getDbObjectDdl: async (config: DatabaseConnectionConfig, objectType: DbObjectType, objectName: string): Promise<ObjectDdlResult> => {
      return apiFetch('/api/db/object-ddl', { method: 'POST', body: JSON.stringify({ config, objectType, objectName }) });
    },

    listDbObjects: async (config: DatabaseConnectionConfig): Promise<DbObjectInfo[]> => {
      return apiFetch('/api/db/objects', { method: 'POST', body: JSON.stringify({ config }) });
    },

    openDbSession: async (config: DatabaseConnectionConfig, autoCommit?: boolean): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/open', { method: 'POST', body: JSON.stringify({ config, autoCommit }) });
    },

    executeDbSession: async (sessionId: string, sql: string, maxRows?: number, binds?: Record<string, any>): Promise<DbSessionQueryResult> => {
      return apiFetch('/api/db/session/execute', { method: 'POST', body: JSON.stringify({ sessionId, sql, maxRows, binds }) });
    },

    commitDbSession: async (sessionId: string): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/commit', { method: 'POST', body: JSON.stringify({ sessionId }) });
    },

    rollbackDbSession: async (sessionId: string): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/rollback', { method: 'POST', body: JSON.stringify({ sessionId }) });
    },

    setDbSessionAutoCommit: async (sessionId: string, autoCommit: boolean): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/autocommit', { method: 'POST', body: JSON.stringify({ sessionId, autoCommit }) });
    },

    cancelDbSession: async (sessionId: string): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/cancel', { method: 'POST', body: JSON.stringify({ sessionId }) });
    },

    closeDbSession: async (sessionId: string): Promise<void> => {
      await apiFetch('/api/db/session/close', { method: 'POST', body: JSON.stringify({ sessionId }) });
    },

    explainDbPlan: async (config: DatabaseConnectionConfig, sql: string): Promise<ExplainPlanResult> => {
      return apiFetch('/api/db/explain', {
        method: 'POST',
        body: JSON.stringify({ config, sql })
      });
    },

    listDbTables: async (config: DatabaseConnectionConfig): Promise<DbTablesResult> => {
      return apiFetch('/api/db/tables', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    getDbTableColumns: async (config: DatabaseConnectionConfig, tableName: string): Promise<DbTableColumnsResult> => {
      return apiFetch('/api/db/columns', {
        method: 'POST',
        body: JSON.stringify({ config, tableName })
      });
    },

    insertDbRow: async (config: DatabaseConnectionConfig, tableName: string, values: Record<string, any>, sessionId?: string): Promise<QueryResult> => {
      return apiFetch('/api/db/row/insert', {
        method: 'POST',
        body: JSON.stringify({ config, tableName, values, sessionId })
      });
    },

    updateDbRow: async (config: DatabaseConnectionConfig, tableName: string, changes: Record<string, any>, where: Record<string, any>, sessionId?: string): Promise<QueryResult> => {
      return apiFetch('/api/db/row/update', {
        method: 'POST',
        body: JSON.stringify({ config, tableName, changes, where, sessionId })
      });
    },

    deleteDbRow: async (config: DatabaseConnectionConfig, tableName: string, where: Record<string, any>, sessionId?: string): Promise<QueryResult> => {
      return apiFetch('/api/db/row/delete', {
        method: 'POST',
        body: JSON.stringify({ config, tableName, where, sessionId })
      });
    },

    getOracleActiveSessions: async (config: DatabaseConnectionConfig, filter?: OracleTracerFilter): Promise<OracleActiveSessionsResult> => {
      return apiFetch('/api/db/oracle-active-sessions', {
        method: 'POST',
        body: JSON.stringify({ config, filter })
      });
    },

    getOracleRecentStatements: async (config: DatabaseConnectionConfig, filter?: OracleTracerFilter): Promise<OracleRecentStatementsResult> => {
      return apiFetch('/api/db/oracle-recent-statements', {
        method: 'POST',
        body: JSON.stringify({ config, filter })
      });
    },

    getOracleStatementBinds: async (config: DatabaseConnectionConfig, sqlId: string, sqlText?: string): Promise<OracleStatementBindsResult> => {
      return apiFetch('/api/db/oracle-statement-binds', {
        method: 'POST',
        body: JSON.stringify({ config, sqlId, sqlText })
      });
    },

    startOracleCapture: async (config: DatabaseConnectionConfig, options: OracleCaptureOptions): Promise<OracleCaptureState> => {
      return apiFetch('/api/db/oracle-capture/start', {
        method: 'POST',
        body: JSON.stringify({ config, options })
      });
    },

    stopOracleCapture: async (connectionId: string): Promise<OracleCaptureState> => {
      return apiFetch('/api/db/oracle-capture/stop', {
        method: 'POST',
        body: JSON.stringify({ connectionId })
      });
    },

    clearOracleCapture: async (connectionId: string): Promise<OracleCaptureState> => {
      return apiFetch('/api/db/oracle-capture/clear', {
        method: 'POST',
        body: JSON.stringify({ connectionId })
      });
    },

    getOracleCaptureState: async (connectionId: string): Promise<OracleCaptureState> => {
      return apiFetch('/api/db/oracle-capture/state', {
        method: 'POST',
        body: JSON.stringify({ connectionId })
      });
    },

    runDbBackup: async (
      config: DatabaseConnectionConfig,
      destinationFolder: string,
      oracleDirectory?: string,
      compress?: boolean,
      useCustomCommand?: boolean,
      customCommand?: string
    ): Promise<BackupResult> => {
      return apiFetch('/api/db/backup', {
        method: 'POST',
        body: JSON.stringify({ config, destinationFolder, oracleDirectory, compress, useCustomCommand, customCommand })
      });
    },

    listDbBackups: async (destinationFolder: string): Promise<BackupFileInfo[]> => {
      return apiFetch('/api/db/backups', {
        method: 'POST',
        body: JSON.stringify({ destinationFolder })
      });
    },

    saveDbBackupConfig: async (config: BackupConfig): Promise<{ success: boolean; message: string }> => {
      return apiFetch('/api/db/backup-config', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    restoreDbBackup: async (config: DatabaseConnectionConfig, filePath: string): Promise<BackupResult> => {
      return apiFetch('/api/db/restore', {
        method: 'POST',
        body: JSON.stringify({ config, filePath })
      });
    },

    onBackupScheduleResult: (callback: (data: { connectionName: string; result: BackupResult }) => void) => {
      return wsManager.subscribe('backup:schedule-result', callback);
    },

    listDbBackupHistory: async (connectionId?: string): Promise<BackupHistoryEntry[]> => {
      return apiFetch('/api/db/backup-history', {
        method: 'POST',
        body: JSON.stringify({ connectionId })
      });
    },

    runDbRestoreDrill: async (scratchConnection: DatabaseConnectionConfig, filePath: string): Promise<BackupResult> => {
      return apiFetch('/api/db/restore-drill', {
        method: 'POST',
        body: JSON.stringify({ scratchConnection, filePath })
      });
    },

    testBackupWebhook: async (webhook: BackupWebhookConfig): Promise<{ success: boolean; message: string }> => {
      return apiFetch('/api/backup/test-webhook', {
        method: 'POST',
        body: JSON.stringify(webhook)
      });
    }
  } satisfies Partial<ElectronAPI>;
}
