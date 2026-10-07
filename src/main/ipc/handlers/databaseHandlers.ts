import { ipcMain } from 'electron';
import * as cron from 'node-cron';
import {
  DatabaseConnectionConfig,
  DbObjectType,
  OracleTracerFilter,
  OracleCaptureOptions,
  BackupConfig,
  BackupWebhookConfig
} from '../../../shared/types';
import type { IpcContext } from '../ipcContext';

/** Banco de dados (Oracle, MySQL, Postgres) e backups. Canais: backup:*, db:* */
export function registerDatabaseHandlers(ctx: IpcContext): void {
  const { configService, databaseService, backupService, backupSchedulerService, oracleTracerCaptureService } = ctx;

  ipcMain.handle('db:parse-tnsnames', async (_, filePath?: string) => {
    return await databaseService.parseTnsNames(filePath);
  });

  ipcMain.handle('db:test-connection', async (_, config: DatabaseConnectionConfig) => {
    return await databaseService.testConnection(config);
  });

  ipcMain.handle('db:execute-query', async (_, config: DatabaseConnectionConfig, sql: string, maxRows?: number, binds?: Record<string, any>) => {
    return await databaseService.executeQuery(config, sql, maxRows, binds);
  });

  ipcMain.handle('db:get-table-details', async (_, config: DatabaseConnectionConfig, tableName: string) => {
    return await databaseService.getTableDetails(config, tableName);
  });

  ipcMain.handle('db:get-object-ddl', async (_, config: DatabaseConnectionConfig, objectType: DbObjectType, objectName: string) => {
    return await databaseService.getObjectDdl(config, objectType, objectName);
  });

  ipcMain.handle('db:list-objects', async (_, config: DatabaseConnectionConfig) => {
    try {
      return await databaseService.listObjects(config);
    } catch {
      return [];
    }
  });

  ipcMain.handle('db:session-open', async (_, config: DatabaseConnectionConfig, autoCommit?: boolean) => {
    return await databaseService.openSession(config, autoCommit ?? true);
  });

  ipcMain.handle('db:session-execute', async (_, sessionId: string, sql: string, maxRows?: number, binds?: Record<string, any>) => {
    return await databaseService.executeInSession(sessionId, sql, maxRows, binds);
  });

  ipcMain.handle('db:session-commit', async (_, sessionId: string) => databaseService.commitSession(sessionId));
  ipcMain.handle('db:session-rollback', async (_, sessionId: string) => databaseService.rollbackSession(sessionId));
  ipcMain.handle('db:session-set-autocommit', async (_, sessionId: string, autoCommit: boolean) =>
    databaseService.setSessionAutoCommit(sessionId, autoCommit)
  );
  ipcMain.handle('db:session-cancel', async (_, sessionId: string) => databaseService.cancelSession(sessionId));
  ipcMain.handle('db:session-close', async (_, sessionId: string) => databaseService.closeSession(sessionId));

  ipcMain.handle('db:explain-plan', async (_, config: DatabaseConnectionConfig, sql: string) => {
    return await databaseService.explainPlan(config, sql);
  });

  ipcMain.handle('db:list-tables', async (_, config: DatabaseConnectionConfig) => {
    return await databaseService.listTables(config);
  });

  ipcMain.handle('db:get-table-columns', async (_, config: DatabaseConnectionConfig, tableName: string) => {
    return await databaseService.getTableColumns(config, tableName);
  });

  ipcMain.handle('db:insert-row', async (_, config: DatabaseConnectionConfig, tableName: string, values: Record<string, any>, sessionId?: string) => {
    return await databaseService.insertRow(config, tableName, values, sessionId);
  });

  ipcMain.handle('db:update-row', async (_, config: DatabaseConnectionConfig, tableName: string, changes: Record<string, any>, where: Record<string, any>, sessionId?: string) => {
    return await databaseService.updateRow(config, tableName, changes, where, sessionId);
  });

  ipcMain.handle('db:delete-row', async (_, config: DatabaseConnectionConfig, tableName: string, where: Record<string, any>, sessionId?: string) => {
    return await databaseService.deleteRow(config, tableName, where, sessionId);
  });

  ipcMain.handle('db:get-oracle-active-sessions', async (_, config: DatabaseConnectionConfig, filter?: OracleTracerFilter) => {
    return await databaseService.getOracleActiveSessions(config, filter);
  });

  ipcMain.handle('db:get-oracle-recent-statements', async (_, config: DatabaseConnectionConfig, filter?: OracleTracerFilter) => {
    return await databaseService.getOracleRecentStatements(config, filter);
  });

  ipcMain.handle('db:get-oracle-statement-binds', async (_, config: DatabaseConnectionConfig, sqlId: string, sqlText?: string) => {
    return await databaseService.getOracleStatementBinds(config, sqlId, sqlText);
  });

  ipcMain.handle('db:start-oracle-capture', (_, config: DatabaseConnectionConfig, options: OracleCaptureOptions) => {
    try {
      return oracleTracerCaptureService.startCapture(config, options);
    } catch (err: any) {
      return {
        isCapturing: false,
        startedAt: null,
        intervalMs: 0,
        pollCount: 0,
        lastPolledAt: null,
        lastError: err?.message || 'Falha ao iniciar a captura.',
        statements: [],
        sessionEvents: []
      };
    }
  });

  ipcMain.handle('db:stop-oracle-capture', (_, connectionId: string) => {
    return oracleTracerCaptureService.stopCapture(connectionId);
  });

  ipcMain.handle('db:clear-oracle-capture', (_, connectionId: string) => {
    return oracleTracerCaptureService.clearCapture(connectionId);
  });

  ipcMain.handle('db:get-oracle-capture-state', (_, connectionId: string) => {
    return oracleTracerCaptureService.getCaptureState(connectionId);
  });

  ipcMain.handle(
    'db:run-backup',
    async (
      _,
      config: DatabaseConnectionConfig,
      destinationFolder: string,
      oracleDirectory?: string,
      compress?: boolean,
      useCustomCommand?: boolean,
      customCommand?: string
    ) => {
      return await backupSchedulerService.runManualBackup(config, destinationFolder, {
        oracleDirectory,
        compress,
        useCustomCommand,
        customCommand
      });
    }
  );

  ipcMain.handle('db:list-backups', async (_, destinationFolder: string) => {
    return await backupService.listBackups(destinationFolder);
  });

  ipcMain.handle('db:restore-backup', async (_, config: DatabaseConnectionConfig, filePath: string) => {
    return await backupSchedulerService.runManualRestore(config, filePath);
  });

  ipcMain.handle('db:save-backup-config', async (_, config: BackupConfig) => {
    if (config.cronExpression && !cron.validate(config.cronExpression)) {
      return { success: false, message: 'Expressão cron inválida.' };
    }

    const settings = configService.getSettings();
    const existing = settings.backupConfigs || [];
    const previous = existing.find((b) => b.connectionId === config.connectionId);
    const merged: BackupConfig = { ...previous, ...config };
    const updated = [merged, ...existing.filter((b) => b.connectionId !== config.connectionId)];
    configService.saveSettings({ backupConfigs: updated });
    backupSchedulerService.rescheduleAll();

    return { success: true, message: 'Agendamento salvo com sucesso.' };
  });

  ipcMain.handle('db:list-backup-history', async (_, connectionId?: string) => {
    return backupSchedulerService.getHistory(connectionId);
  });

  ipcMain.handle('db:run-restore-drill', async (_, scratchConnection: DatabaseConnectionConfig, filePath: string) => {
    return await backupSchedulerService.runRestoreDrill(scratchConnection, filePath);
  });

  ipcMain.handle('backup:test-webhook', async (_, webhook: BackupWebhookConfig) => {
    return await backupSchedulerService.testWebhook(webhook);
  });
}
