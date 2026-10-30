import fs from 'fs';
import path from 'path';
import * as cron from 'node-cron';
import { ConfigService } from './ConfigService';
import { BackupService, isBackupFileOfConnection } from './BackupService';
import {
  AppSettings,
  BackupConfig,
  BackupHistoryEntry,
  BackupResult,
  BackupWebhookConfig,
  DatabaseConnectionConfig
} from '../../shared/types';
import { httpRequest } from '../utils/httpRequest';

/** Mesma pasta, ignorando maiúsculas (Windows) e barra no fim. */
function samePath(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const norm = (p: string) => path.resolve(p).replace(/[\\/]+$/, '').toLowerCase();
  return norm(a) === norm(b);
}

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

/** Diz se há um processo vivo com esse PID (o dono anterior do agendador pode ter caído sem limpar). */
function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err?.code === 'EPERM';
  }
}

export class BackupSchedulerService {
  private jobs = new Map<string, cron.ScheduledTask>();
  private drillJobs = new Map<string, cron.ScheduledTask>();
  private ownsLock = false;

  /** Chamado após cada execução agendada (sucesso ou falha), para notificar a UI. */
  public onResult?: (connectionName: string, result: BackupResult) => void;

  constructor(
    private configService: ConfigService,
    private backupService: BackupService,
    /**
     * Arquivo de trava entre processos. O app desktop e o servidor web leem o mesmo config.json:
     * sem a trava, os dois agendariam os mesmos jobs e cada horário rodaria dois dumps.
     */
    private lockFile?: string
  ) {}

  /** Garante que só um processo agenda os backups. Devolve false quando outro processo vivo já é o dono. */
  private acquireSchedulerLock(): boolean {
    if (!this.lockFile || this.ownsLock) return true;
    try {
      fs.mkdirSync(path.dirname(this.lockFile), { recursive: true });
      const owner = Number(fs.existsSync(this.lockFile) ? fs.readFileSync(this.lockFile, 'utf-8').trim() : NaN);
      if (Number.isInteger(owner) && owner !== process.pid && isProcessAlive(owner)) {
        console.warn(`[BackupScheduler] Agendamento de backups já ativo no processo ${owner}; este processo não agenda.`);
        return false;
      }
      fs.writeFileSync(this.lockFile, String(process.pid), 'utf-8');
      this.ownsLock = true;
      return true;
    } catch (err: any) {
      // Sem conseguir ler/gravar a trava, agenda mesmo assim: melhor um backup em dobro que nenhum.
      console.warn(`[BackupScheduler] Não foi possível usar a trava ${this.lockFile}: ${err?.message || err}`);
      return true;
    }
  }

  private releaseSchedulerLock(): void {
    if (!this.lockFile || !this.ownsLock) return;
    this.ownsLock = false;
    try {
      if (fs.readFileSync(this.lockFile, 'utf-8').trim() === String(process.pid)) fs.unlinkSync(this.lockFile);
    } catch {
      // Já removida ou ilegível: nada a liberar
    }
  }

  /**
   * Lê os agendamentos salvos e (re)inicia todos os jobs de cron ativos.
   * Chamado na inicialização do app, ao salvar uma configuração de backup e ao mudar as conexões.
   * Cada job guarda só o id da conexão: conexão e configuração são relidas a cada disparo,
   * então senha/host editados valem no próximo horário e uma conexão excluída para de rodar.
   */
  public rescheduleAll(): void {
    this.stopJobs();
    if (!this.acquireSchedulerLock()) return;

    const settings = this.configService.getSettings();
    const backupConfigs = settings.backupConfigs || [];
    const connections = settings.databaseConnections || [];

    for (const config of backupConfigs) {
      const connectionId = config.connectionId;
      if (!connections.some((c) => c.id === connectionId)) continue;

      if (config.cronExpression && config.enabled !== false) {
        if (!cron.validate(config.cronExpression)) {
          console.warn(`[BackupScheduler] Expressão cron inválida para ${connectionId}: ${config.cronExpression}`);
        } else {
          // noOverlap: um horário que chega com o backup anterior ainda rodando é pulado, não vira falha.
          const task = cron.schedule(config.cronExpression, () => this.runScheduledBackup(connectionId), { noOverlap: true });
          this.jobs.set(connectionId, task);
        }
      }

      if (config.restoreDrillCronExpression && config.restoreDrillEnabled !== false && config.restoreDrillScratchConnectionId) {
        if (!cron.validate(config.restoreDrillCronExpression)) {
          console.warn(`[BackupScheduler] Expressão cron de drill inválida para ${connectionId}: ${config.restoreDrillCronExpression}`);
        } else if (connections.some((c) => c.id === config.restoreDrillScratchConnectionId)) {
          const task = cron.schedule(config.restoreDrillCronExpression, () => this.runScheduledRestoreDrill(connectionId), {
            noOverlap: true
          });
          this.drillJobs.set(connectionId, task);
        }
      }
    }
  }

  private stopJobs(): void {
    for (const task of this.jobs.values()) task.stop();
    this.jobs.clear();
    for (const task of this.drillJobs.values()) task.stop();
    this.drillJobs.clear();
  }

  public stopAll(): void {
    this.stopJobs();
    this.releaseSchedulerLock();
  }

  /** Configuração e conexão atuais de um agendamento, ou null quando uma delas sumiu ou foi desativada. */
  private currentSchedule(connectionId: string): { config: BackupConfig; connection: DatabaseConnectionConfig; settings: AppSettings } | null {
    const settings = this.configService.getSettings();
    const config = (settings.backupConfigs || []).find((b) => b.connectionId === connectionId);
    const connection = (settings.databaseConnections || []).find((c) => c.id === connectionId);
    return config && connection ? { config, connection, settings } : null;
  }

  /**
   * Testa periodicamente (via cron) se o backup mais recente desta conexão em `config.destinationFolder`
   * é restaurável, contra a conexão scratch configurada — sem depender de alguém lembrar de
   * clicar em "Drill" manualmente. Se ainda não existe nenhum backup dela na pasta, não faz nada
   * (nem registra falha — não é um erro, só ainda não há o que testar).
   */
  private async runScheduledRestoreDrill(connectionId: string): Promise<void> {
    const current = this.currentSchedule(connectionId);
    if (!current || current.config.restoreDrillEnabled === false || !current.config.restoreDrillScratchConnectionId) return;
    const { config, connection, settings } = current;
    const scratchConnection = (settings.databaseConnections || []).find((c) => c.id === config.restoreDrillScratchConnectionId);
    if (!scratchConnection) return;

    try {
      const backups = await this.backupService.listBackups(config.destinationFolder, connection);
      if (backups.length === 0) return;
      await this.runRestoreDrill(scratchConnection, backups[0].filePath, 'scheduled', connection);
    } catch (err: any) {
      this.recordUnexpectedFailure(connection, 'restore-drill', err);
    }
  }

  /** Erro inesperado num disparo agendado: fica no histórico e avisa a UI, em vez de sumir no log. */
  private recordUnexpectedFailure(
    connection: DatabaseConnectionConfig,
    action: 'backup' | 'restore-drill',
    err: any
  ): void {
    const result: BackupResult = { success: false, message: `Erro inesperado no agendamento: ${err?.message || err}` };
    console.warn(`[BackupScheduler] ${result.message}`);
    try {
      this.recordHistory({ connectionId: connection.id, connectionName: connection.name, action, trigger: 'scheduled', result });
    } catch {
      // Se nem o histórico grava, sobra o log acima
    }
    if (action === 'backup') this.onResult?.(connection.name, result);
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
   * informada pelo usuário, registrando o resultado no mesmo histórico/webhooks usados por
   * backup e restore normais. `sourceConnection` é a conexão que gerou o backup: sem ela, é
   * deduzida pelo nome do arquivo. O BackupService recusa o drill sobre a própria origem.
   */
  public async runRestoreDrill(
    scratchConnection: DatabaseConnectionConfig,
    filePath: string,
    trigger: 'manual' | 'scheduled' = 'manual',
    sourceConnection?: DatabaseConnectionConfig
  ): Promise<BackupResult> {
    const settings = this.configService.getSettings();
    const configs = settings.backupConfigs || [];
    const source =
      sourceConnection ??
      (settings.databaseConnections || []).find((c) => isBackupFileOfConnection(path.basename(filePath), c));
    const sourceConfig = source ? configs.find((b) => b.connectionId === source.id) : undefined;
    const scratchConfig = configs.find((b) => b.connectionId === scratchConnection.id);

    const result = await this.backupService.runRestoreDrill(
      scratchConnection,
      filePath,
      {
        psqlPath: settings.psqlPath,
        impdpPath: settings.impdpPath,
        mysqlPath: settings.mysqlPath,
        pgRestorePath: settings.pgRestorePath,
        // O dump está na pasta do DIRECTORY usado no backup, que é o da origem.
        oracleDirectory: sourceConfig?.oracleDirectory ?? scratchConfig?.oracleDirectory,
        oracleSourceSchema: source?.type === 'oracle' ? source.user : undefined
      },
      source
    );

    // Fica no histórico da origem: é o backup dela que está sendo testado.
    this.recordHistory({
      connectionId: source?.id ?? scratchConnection.id,
      connectionName: source ? `${source.name} (teste em ${scratchConnection.name})` : scratchConnection.name,
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

  private async runScheduledBackup(connectionId: string): Promise<void> {
    const current = this.currentSchedule(connectionId);
    if (!current || current.config.enabled === false || !current.config.cronExpression) return;
    const { config, connection } = current;

    let result: BackupResult;
    try {
      result = await this.executeBackup(
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
    } catch (err: any) {
      this.recordUnexpectedFailure(connection, 'backup', err);
      return;
    }

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

    // A retenção vale para a pasta configurada: um backup avulso para outra pasta não apaga nada lá.
    if (result.success && previous && samePath(previous.destinationFolder, destinationFolder)) {
      await this.backupService.applyRetention(destinationFolder, connection, previous.retentionCount, previous.retentionDays);
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
    const res = await httpRequest(target.endpointUrl, { method: target.method || 'POST', headers, body: payload });
    // URL revogada responde 404/403: isso é falha, não "notificado com sucesso".
    if (!res.ok) throw new Error(`O webhook respondeu HTTP ${res.status} ${res.statusText}`.trim());
  }
}
