import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BackupSchedulerService, buildWebhookPayload, WebhookContext } from './BackupSchedulerService';
import { ConfigService } from './ConfigService';
import { BackupService } from './BackupService';
import { httpRequest } from '../utils/httpRequest';
import type { AppSettings, BackupConfig, BackupResult, BackupWebhookConfig, DatabaseConnectionConfig } from '../../shared/types';

vi.mock('../utils/httpRequest', () => ({
  httpRequest: vi.fn()
}));

function makeConnection(overrides: Partial<DatabaseConnectionConfig> = {}): DatabaseConnectionConfig {
  return {
    id: 'conn-1',
    name: 'Oracle Prod',
    type: 'oracle',
    host: 'localhost',
    port: 1521,
    database: 'XE',
    user: 'system',
    ...overrides
  };
}

function makeResult(overrides: Partial<BackupResult> = {}): BackupResult {
  return { success: true, message: 'Backup concluído.', filePath: 'C:\\backups\\dump.dmp', sizeBytes: 1024, ...overrides };
}

describe('buildWebhookPayload', () => {
  const ctx: WebhookContext = {
    connectionName: 'Oracle Prod',
    action: 'backup',
    trigger: 'scheduled',
    success: true,
    message: 'Backup concluído.',
    startedAt: '2026-01-01T02:00:00.000Z'
  };

  it('formata para slack como { text }', () => {
    const payload = JSON.parse(buildWebhookPayload('slack', ctx));
    expect(payload.text).toContain('Oracle Prod');
    expect(payload.text).toContain('✅');
    expect(payload.text).toContain('agendado');
  });

  it('formata para discord como { content }', () => {
    const payload = JSON.parse(buildWebhookPayload('discord', ctx));
    expect(payload.content).toContain('Oracle Prod');
  });

  it('formata para teams como MessageCard com cor conforme sucesso/falha', () => {
    const success = JSON.parse(buildWebhookPayload('teams', ctx));
    expect(success['@type']).toBe('MessageCard');
    expect(success.themeColor).toBe('2EB67D');

    const failure = JSON.parse(buildWebhookPayload('teams', { ...ctx, success: false }));
    expect(failure.themeColor).toBe('E01E5A');
  });

  it('formata "generic" (padrão) como o próprio contexto em JSON', () => {
    const payload = JSON.parse(buildWebhookPayload('generic', ctx));
    expect(payload).toEqual(ctx);
  });

  it('indica trigger manual no resumo quando não é agendado', () => {
    const payload = JSON.parse(buildWebhookPayload('slack', { ...ctx, trigger: 'manual' }));
    expect(payload.text).toContain('manual');
    expect(payload.text).not.toContain('agendado');
  });

  it('usa o ícone de falha quando success é false', () => {
    const payload = JSON.parse(buildWebhookPayload('slack', { ...ctx, success: false }));
    expect(payload.text).toContain('❌');
  });
});

describe('BackupSchedulerService', () => {
  let configService: ConfigService;
  let backupService: BackupService;
  let service: BackupSchedulerService;
  let settings: Partial<AppSettings>;

  beforeEach(() => {
    settings = {};
    configService = {
      getSettings: vi.fn(() => settings as AppSettings),
      saveSettings: vi.fn((patch: Partial<AppSettings>) => {
        settings = { ...settings, ...patch };
        return settings as AppSettings;
      })
    } as any;

    backupService = {
      runBackup: vi.fn(async () => makeResult()),
      applyRetention: vi.fn(async () => 0),
      restoreBackup: vi.fn(async () => makeResult({ message: 'Restauração concluída.' })),
      runRestoreDrill: vi.fn(async () => makeResult({ message: 'Drill concluído.' })),
      listBackups: vi.fn(async () => [])
    } as any;

    service = new BackupSchedulerService(configService, backupService);
    vi.mocked(httpRequest).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
      buffer: async () => Buffer.alloc(0)
    });
  });

  afterEach(() => {
    service.stopAll();
    vi.clearAllMocks();
  });

  describe('rescheduleAll', () => {
    it('agenda um job apenas para configs com cronExpression válida e conexão existente', () => {
      settings.databaseConnections = [makeConnection()];
      settings.backupConfigs = [
        { connectionId: 'conn-1', destinationFolder: 'C:\\backups', cronExpression: '0 2 * * *' } as BackupConfig
      ];

      service.rescheduleAll();
      expect((service as any).jobs.size).toBe(1);
      expect((service as any).jobs.has('conn-1')).toBe(true);
    });

    it('não agenda quando a expressão cron é inválida', () => {
      settings.databaseConnections = [makeConnection()];
      settings.backupConfigs = [
        { connectionId: 'conn-1', destinationFolder: 'C:\\backups', cronExpression: 'não-é-cron' } as BackupConfig
      ];

      service.rescheduleAll();
      expect((service as any).jobs.size).toBe(0);
    });

    it('não agenda quando a conexão referenciada não existe mais', () => {
      settings.databaseConnections = [];
      settings.backupConfigs = [
        { connectionId: 'conn-inexistente', destinationFolder: 'C:\\backups', cronExpression: '0 2 * * *' } as BackupConfig
      ];

      service.rescheduleAll();
      expect((service as any).jobs.size).toBe(0);
    });

    it('não agenda quando enabled é false, mesmo com cron válida', () => {
      settings.databaseConnections = [makeConnection()];
      settings.backupConfigs = [
        { connectionId: 'conn-1', destinationFolder: 'C:\\backups', cronExpression: '0 2 * * *', enabled: false } as BackupConfig
      ];

      service.rescheduleAll();
      expect((service as any).jobs.size).toBe(0);
    });

    it('substitui todos os jobs anteriores ao reagendar (não acumula)', () => {
      settings.databaseConnections = [makeConnection(), makeConnection({ id: 'conn-2', name: 'Postgres Dev' })];
      settings.backupConfigs = [
        { connectionId: 'conn-1', destinationFolder: 'C:\\backups', cronExpression: '0 2 * * *' } as BackupConfig
      ];
      service.rescheduleAll();
      expect((service as any).jobs.size).toBe(1);

      settings.backupConfigs = [
        { connectionId: 'conn-2', destinationFolder: 'C:\\backups', cronExpression: '0 3 * * *' } as BackupConfig
      ];
      service.rescheduleAll();
      expect((service as any).jobs.size).toBe(1);
      expect((service as any).jobs.has('conn-2')).toBe(true);
      expect((service as any).jobs.has('conn-1')).toBe(false);
    });
  });

  describe('runManualBackup / executeBackup', () => {
    it('executa o backup, aplica retenção somente em caso de sucesso e persiste o novo status na conexão', async () => {
      settings.backupConfigs = [];
      backupService.runBackup = vi.fn(async () => makeResult({ success: true }));

      const result = await service.runManualBackup(makeConnection(), 'C:\\backups', { retentionCount: 5 } as any);

      expect(result.success).toBe(true);
      // Sem configuração salva não há retenção a aplicar
      expect(backupService.applyRetention).not.toHaveBeenCalled();
      expect(settings.backupConfigs?.[0]).toMatchObject({
        connectionId: 'conn-1',
        destinationFolder: 'C:\\backups',
        lastSuccess: true
      });
    });

    it('NÃO aplica retenção quando o backup falha', async () => {
      backupService.runBackup = vi.fn(async () => makeResult({ success: false, message: 'Falhou.' }));

      const result = await service.runManualBackup(makeConnection(), 'C:\\backups');

      expect(result.success).toBe(false);
      expect(backupService.applyRetention).not.toHaveBeenCalled();
      expect(settings.backupConfigs?.[0]).toMatchObject({ lastSuccess: false, lastMessage: 'Falhou.' });
    });

    it('reaproveita retentionCount/retentionDays de uma config já salva quando não sobrescritos', async () => {
      settings.backupConfigs = [
        { connectionId: 'conn-1', destinationFolder: 'C:\\backups', retentionCount: 10, retentionDays: 30 } as BackupConfig
      ];

      await service.runManualBackup(makeConnection(), 'C:\\backups');

      expect(backupService.applyRetention).toHaveBeenCalledWith(
        'C:\\backups',
        expect.objectContaining({ id: 'conn-1' }),
        10,
        30
      );
    });

    it('não aplica a retenção quando o backup avulso vai para outra pasta', async () => {
      settings.backupConfigs = [
        { connectionId: 'conn-1', destinationFolder: 'C:\\backups', retentionCount: 1 } as BackupConfig
      ];

      await service.runManualBackup(makeConnection(), 'D:\\outra');

      expect(backupService.applyRetention).not.toHaveBeenCalled();
    });
  });

  describe('disparo agendado', () => {
    it('usa a conexão atual (senha trocada depois do agendamento) e pula a que foi excluída', async () => {
      settings.databaseConnections = [makeConnection({ password: 'antiga' })];
      settings.backupConfigs = [
        { connectionId: 'conn-1', destinationFolder: 'C:\\backups', cronExpression: '0 2 * * *' } as BackupConfig
      ];
      service.rescheduleAll();

      settings.databaseConnections = [makeConnection({ password: 'nova' })];
      await (service as any).runScheduledBackup('conn-1');
      expect(backupService.runBackup).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'nova' }),
        'C:\\backups',
        expect.anything()
      );

      vi.mocked(backupService.runBackup).mockClear();
      settings.databaseConnections = [];
      await (service as any).runScheduledBackup('conn-1');
      expect(backupService.runBackup).not.toHaveBeenCalled();
      expect(settings.backupConfigs).toHaveLength(1);
    });

    it('um erro inesperado vira falha no histórico em vez de sumir', async () => {
      settings.databaseConnections = [makeConnection()];
      settings.backupConfigs = [{ connectionId: 'conn-1', destinationFolder: 'C:\\backups', cronExpression: '0 2 * * *' } as BackupConfig];
      backupService.runBackup = vi.fn(async () => {
        throw new Error('EACCES');
      });
      const onResult = vi.fn();
      service.onResult = onResult;

      await (service as any).runScheduledBackup('conn-1');

      expect(service.getHistory()[0]).toMatchObject({ success: false, trigger: 'scheduled' });
      expect(service.getHistory()[0].message).toContain('EACCES');
      expect(onResult).toHaveBeenCalledWith('Oracle Prod', expect.objectContaining({ success: false }));
    });

    it('o drill agendado testa o backup mais recente da própria conexão, com o DIRECTORY e o schema dela', async () => {
      const source = makeConnection();
      const scratch = makeConnection({ id: 'scratch', name: 'Scratch', user: 'drill' });
      settings.databaseConnections = [source, scratch];
      settings.backupConfigs = [
        {
          connectionId: 'conn-1',
          destinationFolder: 'C:\\backups',
          oracleDirectory: 'BKP_DIR',
          restoreDrillCronExpression: '0 4 * * *',
          restoreDrillScratchConnectionId: 'scratch'
        } as BackupConfig
      ];
      backupService.listBackups = vi.fn(async () => [
        { fileName: 'x.dmp', filePath: 'C:\\backups\\x.dmp', sizeBytes: 1, createdAt: '2026-10-29T00:00:00.000Z' }
      ]);

      await (service as any).runScheduledRestoreDrill('conn-1');

      expect(backupService.listBackups).toHaveBeenCalledWith('C:\\backups', expect.objectContaining({ id: 'conn-1' }));
      expect(backupService.runRestoreDrill).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'scratch' }),
        'C:\\backups\\x.dmp',
        expect.objectContaining({ oracleDirectory: 'BKP_DIR', oracleSourceSchema: 'system' }),
        expect.objectContaining({ id: 'conn-1' })
      );
      expect(service.getHistory()[0]).toMatchObject({ connectionId: 'conn-1', action: 'restore-drill', trigger: 'scheduled' });
    });
  });

  describe('trava entre processos', () => {
    it('não agenda quando outro processo vivo já é o dono do agendador', () => {
      const lockFile = path.join(os.tmpdir(), `backup-scheduler-${Date.now()}.lock`);
      fs.writeFileSync(lockFile, String(process.ppid));
      const other = new BackupSchedulerService(configService, backupService, lockFile);
      settings.databaseConnections = [makeConnection()];
      settings.backupConfigs = [{ connectionId: 'conn-1', destinationFolder: 'C:\\backups', cronExpression: '0 2 * * *' } as BackupConfig];

      other.rescheduleAll();
      expect((other as any).jobs.size).toBe(0);

      fs.writeFileSync(lockFile, '999999999');
      other.rescheduleAll();
      expect((other as any).jobs.size).toBe(1);
      expect(fs.readFileSync(lockFile, 'utf-8')).toBe(String(process.pid));

      other.stopAll();
      expect(fs.existsSync(lockFile)).toBe(false);
    });

    it('registra uma entrada no histórico após cada backup', async () => {
      await service.runManualBackup(makeConnection(), 'C:\\backups');
      const history = service.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ connectionId: 'conn-1', action: 'backup', trigger: 'manual', success: true });
    });
  });

  describe('runManualRestore / runRestoreDrill', () => {
    it('registra o histórico com action "restore" e o filePath informado', async () => {
      await service.runManualRestore(makeConnection(), 'C:\\backups\\dump.dmp');
      const history = service.getHistory();
      expect(history[0]).toMatchObject({ action: 'restore', filePath: 'C:\\backups\\dump.dmp' });
    });

    it('registra o histórico com action "restore-drill" e trigger padrão manual', async () => {
      await service.runRestoreDrill(makeConnection({ id: 'conn-scratch' }), 'C:\\backups\\dump.dmp');
      const history = service.getHistory();
      expect(history[0]).toMatchObject({ action: 'restore-drill', trigger: 'manual', connectionId: 'conn-scratch' });
    });
  });

  describe('getHistory', () => {
    it('retorna o histórico completo quando nenhum connectionId é informado', async () => {
      await service.runManualBackup(makeConnection({ id: 'a' }), 'C:\\backups');
      await service.runManualBackup(makeConnection({ id: 'b' }), 'C:\\backups');
      expect(service.getHistory()).toHaveLength(2);
    });

    it('filtra por connectionId quando informado', async () => {
      await service.runManualBackup(makeConnection({ id: 'a' }), 'C:\\backups');
      await service.runManualBackup(makeConnection({ id: 'b' }), 'C:\\backups');
      const filtered = service.getHistory('b');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].connectionId).toBe('b');
    });

    it('mantém as entradas mais recentes primeiro', async () => {
      await service.runManualBackup(makeConnection({ id: 'a' }), 'C:\\backups');
      await service.runManualBackup(makeConnection({ id: 'b' }), 'C:\\backups');
      const history = service.getHistory();
      expect(history[0].connectionId).toBe('b');
      expect(history[1].connectionId).toBe('a');
    });
  });

  describe('notifyWebhooks (via runManualBackup)', () => {
    function makeWebhook(overrides: Partial<BackupWebhookConfig> = {}): BackupWebhookConfig {
      return { id: 'wh-1', name: 'Discord', endpointUrl: 'https://discord.example/webhook', enabled: true, ...overrides };
    }

    it('dispara o webhook quando não há filtro de events (dispara em sucesso e falha)', async () => {
      settings.backupWebhooks = [makeWebhook()];
      await service.runManualBackup(makeConnection(), 'C:\\backups');
      expect(httpRequest).toHaveBeenCalledTimes(1);
    });

    it('NÃO dispara o webhook quando desabilitado', async () => {
      settings.backupWebhooks = [makeWebhook({ enabled: false })];
      await service.runManualBackup(makeConnection(), 'C:\\backups');
      expect(httpRequest).not.toHaveBeenCalled();
    });

    it('dispara somente para o evento "success" quando events restringe a isso', async () => {
      settings.backupWebhooks = [makeWebhook({ events: ['success'] })];

      backupService.runBackup = vi.fn(async () => makeResult({ success: false }));
      await service.runManualBackup(makeConnection(), 'C:\\backups');
      expect(httpRequest).not.toHaveBeenCalled();

      backupService.runBackup = vi.fn(async () => makeResult({ success: true }));
      await service.runManualBackup(makeConnection(), 'C:\\backups');
      expect(httpRequest).toHaveBeenCalledTimes(1);
    });

    it('NÃO dispara quando events é um array vazio (nenhum evento habilitado)', async () => {
      settings.backupWebhooks = [makeWebhook({ events: [] })];
      await service.runManualBackup(makeConnection(), 'C:\\backups');
      expect(httpRequest).not.toHaveBeenCalled();
    });

    it('envia o header de autenticação quando authHeader/authValue estão configurados', async () => {
      settings.backupWebhooks = [makeWebhook({ authHeader: 'X-Api-Key', authValue: 'segredo123' })];
      await service.runManualBackup(makeConnection(), 'C:\\backups');

      expect(httpRequest).toHaveBeenCalledWith(
        'https://discord.example/webhook',
        expect.objectContaining({ headers: expect.objectContaining({ 'X-Api-Key': 'segredo123' }) })
      );
    });

    it('nunca propaga falha de webhook para o resultado do backup (falha de rede é apenas logada)', async () => {
      settings.backupWebhooks = [makeWebhook()];
      vi.mocked(httpRequest).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await service.runManualBackup(makeConnection(), 'C:\\backups');
      expect(result.success).toBe(true);
    });
  });

  describe('testWebhook', () => {
    it('retorna sucesso quando o endpoint responde normalmente', async () => {
      const res = await service.testWebhook({ id: 'wh-1', name: 'Teste', endpointUrl: 'https://x.example/hook', enabled: true });
      expect(res.success).toBe(true);
    });

    it('trata resposta HTTP de erro (URL revogada) como falha', async () => {
      vi.mocked(httpRequest).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '',
        buffer: async () => Buffer.alloc(0)
      } as any);
      const res = await service.testWebhook({ id: 'wh-1', name: 'Teste', endpointUrl: 'https://x.example/hook', enabled: true });
      expect(res.success).toBe(false);
      expect(res.message).toContain('HTTP 404');
    });

    it('retorna falha com a mensagem do erro quando o endpoint não responde', async () => {
      vi.mocked(httpRequest).mockRejectedValueOnce(new Error('timeout'));
      const res = await service.testWebhook({ id: 'wh-1', name: 'Teste', endpointUrl: 'https://x.example/hook', enabled: true });
      expect(res.success).toBe(false);
      expect(res.message).toContain('timeout');
    });
  });
});
