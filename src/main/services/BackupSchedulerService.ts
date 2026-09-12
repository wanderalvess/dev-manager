import * as cron from 'node-cron';
import { ConfigService } from './ConfigService';
import { BackupService } from './BackupService';
import { BackupConfig, DatabaseConnectionConfig } from '../../shared/types';

export class BackupSchedulerService {
  private jobs = new Map<string, cron.ScheduledTask>();

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

  private async runScheduledBackup(config: BackupConfig, connection: DatabaseConnectionConfig): Promise<void> {
    const settings = this.configService.getSettings();
    const result = await this.backupService.runBackup(connection, config.destinationFolder, settings.pgDumpPath);

    if (result.success && config.retentionCount) {
      await this.backupService.applyRetention(config.destinationFolder, config.retentionCount);
    }

    const latestSettings = this.configService.getSettings();
    const existing = latestSettings.backupConfigs || [];
    const updatedEntry: BackupConfig = {
      ...config,
      lastRunAt: new Date().toISOString(),
      lastSuccess: result.success,
      lastMessage: result.message
    };
    const updated = [updatedEntry, ...existing.filter((b) => b.connectionId !== config.connectionId)];
    this.configService.saveSettings({ backupConfigs: updated });

    if (!result.success) {
      console.warn(`[BackupScheduler] Falha no backup agendado de ${connection.name}: ${result.message}`);
    }
  }
}
