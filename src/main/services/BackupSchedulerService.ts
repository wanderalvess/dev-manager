import * as cron from 'node-cron';
import { ConfigService } from './ConfigService';
import { BackupService } from './BackupService';
import { BackupConfig, BackupHistoryEntry, BackupResult, DatabaseConnectionConfig } from '../../shared/types';

/** Quantidade máxima de entradas mantidas no histórico persistido de backups/restaurações. */
const MAX_HISTORY_ENTRIES = 200;

export class BackupSchedulerService {
  private jobs = new Map<string, cron.ScheduledTask>();

  /** Chamado após cada execução agendada (sucesso ou falha), para notificar a UI. */
  public onResult?: (connectionName: string, result: BackupResult) => void;

  constructor(
    private configService: ConfigService,
    private backupService: BackupService
  ) {}

  /**
   * Lê os agendamentos salvos e (re)inicia todos os jobs de cron ativos.
   * Chamado na inicialização do app e sempre que uma configuração de backup é salva.
   */
  public rescheduleAll(): void {
    for (const task of this.jobs.values()) {
      task.stop();
    }
    this.jobs.clear();

    const settings = this.configService.getSettings();
    const backupConfigs = settings.backupConfigs || [];
    const connections = settings.databaseConnections || [];

    for (const config of backupConfigs) {
      if (!config.cronExpression || config.enabled === false) continue;
      if (!cron.validate(config.cronExpression)) {
        console.warn(`[BackupScheduler] Expressão cron inválida para ${config.connectionId}: ${config.cronExpression}`);
        continue;
      }

      const connection = connections.find((c) => c.id === config.connectionId);
      if (!connection) continue;

      const task = cron.schedule(config.cronExpression, () => {
        this.runScheduledBackup(config, connection);
      });
      this.jobs.set(config.connectionId, task);
    }
  }

  public stopAll(): void {
    for (const task of this.jobs.values()) {
      task.stop();
    }
    this.jobs.clear();
  }

  /**
   * Executa um backup manual (disparado pelo usuário via IPC/HTTP), com o mesmo tratamento
   * de retenção e histórico usado pelos backups agendados.
   */
  public async runManualBackup(
    connection: DatabaseConnectionConfig,
    destinationFolder: string,
    overrides?: { oracleDirectory?: string; compress?: boolean }
  ): Promise<BackupResult> {
    return this.executeBackup(connection, destinationFolder, overrides, 'manual');
  }

  /**
   * Executa uma restauração manual, registrando o resultado no histórico persistido.
   */
  public async runManualRestore(connection: DatabaseConnectionConfig, filePath: string): Promise<BackupResult> {
    const settings = this.configService.getSettings();
    const previous = (settings.backupConfigs || []).find((b) => b.connectionId === connection.id);

    const result = await this.backupService.restoreBackup(connection, filePath, {
      psqlPath: settings.psqlPath,
      impdpPath: settings.impdpPath,
      mysqlPath: settings.mysqlPath,
      pgRestorePath: settings.pgRestorePath,
      oracleDirectory: previous?.oracleDirectory
    });

    this.recordHistory({
      connectionId: connection.id,
      connectionName: connection.name,
      action: 'restore',
      trigger: 'manual',
      result,
      filePath
    });

    return result;
  }

  /** Lista o histórico persistido de backups/restaurações, mais recente primeiro. */
  public getHistory(connectionId?: string): BackupHistoryEntry[] {
    const history = this.configService.getSettings().backupHistory || [];
    return connectionId ? history.filter((h) => h.connectionId === connectionId) : history;
  }

  private async runScheduledBackup(config: BackupConfig, connection: DatabaseConnectionConfig): Promise<void> {
    const result = await this.executeBackup(
      connection,
      config.destinationFolder,
      { oracleDirectory: config.oracleDirectory, compress: config.compress },
      'scheduled'
    );

    if (!result.success) {
      console.warn(`[BackupScheduler] Falha no backup agendado de ${connection.name}: ${result.message}`);
    }

    this.onResult?.(connection.name, result);
  }

  /**
   * Núcleo compartilhado entre backup manual e agendado: executa o dump, aplica retenção
   * (por contagem e/ou idade), persiste o último status na conexão e grava uma entrada no
   * histórico. O lock de concorrência em si vive no BackupService (por connection.id).
   */
  private async executeBackup(
    connection: DatabaseConnectionConfig,
    destinationFolder: string,
    overrides: { oracleDirectory?: string; compress?: boolean } | undefined,
    trigger: 'manual' | 'scheduled'
  ): Promise<BackupResult> {
    const settings = this.configService.getSettings();
    const existing = settings.backupConfigs || [];
    const previous = existing.find((b) => b.connectionId === connection.id);
    const effectiveOracleDirectory = overrides?.oracleDirectory ?? previous?.oracleDirectory;
    const effectiveCompress = overrides?.compress ?? previous?.compress;

    const result = await this.backupService.runBackup(connection, destinationFolder, {
      pgDumpPath: settings.pgDumpPath,
      expdpPath: settings.expdpPath,
      mysqldumpPath: settings.mysqldumpPath,
      oracleDirectory: effectiveOracleDirectory,
      compress: effectiveCompress
    });

    if (result.success) {
      await this.backupService.applyRetention(destinationFolder, previous?.retentionCount, previous?.retentionDays);
    }

    const latestSettings = this.configService.getSettings();
    const latestExisting = latestSettings.backupConfigs || [];
    const updatedEntry: BackupConfig = {
      ...previous,
      connectionId: connection.id,
      destinationFolder,
      oracleDirectory: effectiveOracleDirectory,
      compress: effectiveCompress,
      lastRunAt: new Date().toISOString(),
      lastSuccess: result.success,
      lastMessage: result.message
    };
    const updated = [updatedEntry, ...latestExisting.filter((b) => b.connectionId !== connection.id)];
    this.configService.saveSettings({ backupConfigs: updated });

    this.recordHistory({
      connectionId: connection.id,
      connectionName: connection.name,
      action: 'backup',
      trigger,
      result
    });

    return result;
  }

  private recordHistory(params: {
    connectionId: string;
    connectionName: string;
    action: 'backup' | 'restore';
    trigger: 'manual' | 'scheduled';
    result: BackupResult;
    filePath?: string;
  }): void {
    const settings = this.configService.getSettings();
    const history = settings.backupHistory || [];

    const entry: BackupHistoryEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      connectionId: params.connectionId,
      connectionName: params.connectionName,
      action: params.action,
      trigger: params.trigger,
      success: params.result.success,
      message: params.result.message,
      filePath: params.result.filePath ?? params.filePath,
      sizeBytes: params.result.sizeBytes,
      durationMs: params.result.durationMs,
      startedAt: new Date().toISOString()
    };

    const updated = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
    this.configService.saveSettings({ backupHistory: updated });
  }
}
