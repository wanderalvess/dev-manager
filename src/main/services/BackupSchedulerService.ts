import * as cron from 'node-cron';
import { ConfigService } from './ConfigService';
import { BackupService } from './BackupService';
import { BackupConfig, BackupHistoryEntry, BackupResult, BackupWebhookConfig, DatabaseConnectionConfig } from '../../shared/types';
import { httpRequest } from '../utils/httpRequest';

/** Quantidade máxima de entradas mantidas no histórico persistido de backups/restaurações. */
const MAX_HISTORY_ENTRIES = 200;

export interface WebhookContext {
  connectionName: string;
  action: 'backup' | 'restore' | 'restore-drill';
  trigger: 'manual' | 'scheduled';
  success: boolean;
  message: string;
  filePath?: string;
  sizeBytes?: number;
  durationMs?: number;
  startedAt: string;
}

const ACTION_LABELS: Record<WebhookContext['action'], string> = {
  backup: 'Backup',
  restore: 'Restauração',
  'restore-drill': 'Restore Drill'
};

/**
 * Monta o payload do webhook conforme a plataforma de destino. 'generic' manda todos os campos
 * como JSON (formato original, compatível com endpoints próprios); slack/discord/teams usam o
 * corpo esperado pelo webhook de entrada nativo de cada um, como texto simples formatado.
 */
export function buildWebhookPayload(platform: BackupWebhookConfig['platform'], ctx: WebhookContext): string {
  const icon = ctx.success ? '✅' : '❌';
  const summary = `${icon} ${ACTION_LABELS[ctx.action]} (${ctx.trigger === 'scheduled' ? 'agendado' : 'manual'}) — ${ctx.connectionName}: ${ctx.message}`;

  switch (platform) {
    case 'slack':
      return JSON.stringify({ text: summary });
    case 'discord':
      return JSON.stringify({ content: summary });
    case 'teams':
      return JSON.stringify({
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: ctx.success ? '2EB67D' : 'E01E5A',
        title: `${ACTION_LABELS[ctx.action]} — ${ctx.connectionName}`,
        text: summary
      });
    case 'generic':
    default:
      return JSON.stringify(ctx);
  }
}

export class BackupSchedulerService {
  private jobs = new Map<string, cron.ScheduledTask>();
  private drillJobs = new Map<string, cron.ScheduledTask>();

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
    for (const task of this.jobs.values()) task.stop();
    this.jobs.clear();
    for (const task of this.drillJobs.values()) task.stop();
    this.drillJobs.clear();

    const settings = this.configService.getSettings();
    const backupConfigs = settings.backupConfigs || [];
    const connections = settings.databaseConnections || [];

    for (const config of backupConfigs) {
      const connection = connections.find((c) => c.id === config.connectionId);
      if (!connection) continue;

      if (config.cronExpression && config.enabled !== false) {
        if (!cron.validate(config.cronExpression)) {
          console.warn(`[BackupScheduler] Expressão cron inválida para ${config.connectionId}: ${config.cronExpression}`);
        } else {
          const task = cron.schedule(config.cronExpression, () => {
            this.runScheduledBackup(config, connection);
          });
          this.jobs.set(config.connectionId, task);
        }
      }

      if (config.restoreDrillCronExpression && config.restoreDrillEnabled !== false && config.restoreDrillScratchConnectionId) {
        if (!cron.validate(config.restoreDrillCronExpression)) {
          console.warn(
            `[BackupScheduler] Expressão cron de drill inválida para ${config.connectionId}: ${config.restoreDrillCronExpression}`
          );
        } else {
          const scratchConnection = connections.find((c) => c.id === config.restoreDrillScratchConnectionId);
          if (scratchConnection) {
            const task = cron.schedule(config.restoreDrillCronExpression, () => {
              this.runScheduledRestoreDrill(config, scratchConnection);
            });
            this.drillJobs.set(config.connectionId, task);
          }
        }
      }
    }
  }

  public stopAll(): void {
    for (const task of this.jobs.values()) task.stop();
    this.jobs.clear();
    for (const task of this.drillJobs.values()) task.stop();
    this.drillJobs.clear();
  }

  /**
   * Testa periodicamente (via cron) se o backup mais recente de `config.destinationFolder` é
   * restaurável, contra a conexão scratch configurada — sem depender de alguém lembrar de
   * clicar em "Drill" manualmente. Se ainda não existe nenhum backup na pasta, não faz nada
   * (nem registra falha — não é um erro, só ainda não há o que testar).
   */
  private async runScheduledRestoreDrill(config: BackupConfig, scratchConnection: DatabaseConnectionConfig): Promise<void> {
    const backups = await this.backupService.listBackups(config.destinationFolder);
    if (backups.length === 0) return;

    const latest = backups[0];
    await this.runRestoreDrill(scratchConnection, latest.filePath, 'scheduled');
  }

  /**
   * Executa um backup manual (disparado pelo usuário via IPC/HTTP), com o mesmo tratamento
   * de retenção e histórico usado pelos backups agendados.
   */
  public async runManualBackup(
    connection: DatabaseConnectionConfig,
    destinationFolder: string,
    overrides?: {
      oracleDirectory?: string;
      compress?: boolean;
      useCustomCommand?: boolean;
      customCommand?: string;
    }
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

  /**
   * Executa uma restauração de teste ("drill") de um backup contra uma conexão "scratch"
   * informada pelo usuário (deve ser uma conexão descartável, o serviço não valida isso),
   * registrando o resultado no mesmo histórico/webhooks usados por backup e restore normais.
   */
  public async runRestoreDrill(
    scratchConnection: DatabaseConnectionConfig,
    filePath: string,
    trigger: 'manual' | 'scheduled' = 'manual'
  ): Promise<BackupResult> {
    const settings = this.configService.getSettings();
    const previous = (settings.backupConfigs || []).find((b) => b.connectionId === scratchConnection.id);

    const result = await this.backupService.runRestoreDrill(scratchConnection, filePath, {
      psqlPath: settings.psqlPath,
      impdpPath: settings.impdpPath,
      mysqlPath: settings.mysqlPath,
      pgRestorePath: settings.pgRestorePath,
      oracleDirectory: previous?.oracleDirectory
    });

    this.recordHistory({
      connectionId: scratchConnection.id,
      connectionName: scratchConnection.name,
      action: 'restore-drill',
      trigger,
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
      {
        oracleDirectory: config.oracleDirectory,
        compress: config.compress,
        useCustomCommand: config.useCustomCommand,
        customCommand: config.customCommand
      },
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
    overrides: {
      oracleDirectory?: string;
      compress?: boolean;
      useCustomCommand?: boolean;
      customCommand?: string;
    } | undefined,
    trigger: 'manual' | 'scheduled'
  ): Promise<BackupResult> {
    const settings = this.configService.getSettings();
    const existing = settings.backupConfigs || [];
    const previous = existing.find((b) => b.connectionId === connection.id);
    const effectiveOracleDirectory = overrides?.oracleDirectory ?? previous?.oracleDirectory;
    const effectiveCompress = overrides?.compress ?? previous?.compress;
    const effectiveUseCustomCommand = overrides?.useCustomCommand ?? previous?.useCustomCommand;
    const effectiveCustomCommand = overrides?.customCommand ?? previous?.customCommand;

    const result = await this.backupService.runBackup(connection, destinationFolder, {
      pgDumpPath: settings.pgDumpPath,
      expdpPath: settings.expdpPath,
      mysqldumpPath: settings.mysqldumpPath,
      oracleDirectory: effectiveOracleDirectory,
      compress: effectiveCompress,
      useCustomCommand: effectiveUseCustomCommand,
      customCommand: effectiveCustomCommand
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
      useCustomCommand: effectiveUseCustomCommand,
      customCommand: effectiveCustomCommand,
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
    action: 'backup' | 'restore' | 'restore-drill';
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
      checksumSha256: params.result.checksumSha256,
      startedAt: new Date().toISOString()
    };

    const updated = [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
    this.configService.saveSettings({ backupHistory: updated });

    this.notifyWebhooks(params.connectionName, params.action, params.trigger, params.result);
  }

  /**
   * Dispara os webhooks configurados (settings.backupWebhooks) que estejam habilitados e cujo
   * filtro de eventos inclua o resultado desta execução. Falhas de rede no webhook são só
   * logadas — nunca fazem a execução de backup/restore em si falhar.
   */
  private notifyWebhooks(
    connectionName: string,
    action: 'backup' | 'restore' | 'restore-drill',
    trigger: 'manual' | 'scheduled',
    result: BackupResult
  ): void {
    const webhooks = this.configService.getSettings().backupWebhooks || [];
    const eventKey = result.success ? 'success' : 'failure';
    const targets = webhooks.filter((w) => w.enabled && (!w.events || w.events.includes(eventKey)));
    if (targets.length === 0) return;

    const context: WebhookContext = {
      connectionName,
      action,
      trigger,
      success: result.success,
      message: result.message,
      filePath: result.filePath,
      sizeBytes: result.sizeBytes,
      durationMs: result.durationMs,
      startedAt: new Date().toISOString()
    };

    for (const target of targets) {
      this.sendWebhook(target, buildWebhookPayload(target.platform, context)).catch((err) => {
        console.warn(`[BackupScheduler] Falha ao notificar webhook "${target.name}": ${err?.message || err}`);
      });
    }
  }

  /** Envia um payload sintético para um webhook, usado pelo botão "Testar" da UI. */
  public async testWebhook(target: BackupWebhookConfig): Promise<{ success: boolean; message: string }> {
    const context: WebhookContext = {
      connectionName: 'Conexão de teste',
      action: 'backup',
      trigger: 'manual',
      success: true,
      message: 'Este é um envio de teste disparado manualmente pelo dev-manager.',
      startedAt: new Date().toISOString()
    };

    try {
      await this.sendWebhook(target, buildWebhookPayload(target.platform, context));
      return { success: true, message: 'Webhook notificado com sucesso.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao notificar webhook.' };
    }
  }

  private async sendWebhook(target: BackupWebhookConfig, payload: string): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (target.authHeader && target.authValue) {
      headers[target.authHeader.trim()] = target.authValue.trim();
    }
    await httpRequest(target.endpointUrl, { method: target.method || 'POST', headers, body: payload });
  }
}
