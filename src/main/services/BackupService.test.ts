import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  BackupService,
  buildBackupPlaceholders,
  interpolateBackupTemplate,
  parseCommandLineTokens,
  maskSensitiveText
} from './BackupService';
import { DatabaseConnectionConfig } from '../../shared/types';

describe('BackupService', () => {
  it('impede backup/restauração concorrentes na mesma conexão', async () => {
    const service = new BackupService();
    const config: DatabaseConnectionConfig = {
      id: 'conn-lock-test',
      name: 'Conexão de teste',
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'nao_existe',
      user: 'user'
    };

    // Ambas as chamadas iniciam de forma síncrona (mesmo tick) antes de qualquer await interno,
    // então a segunda deve sempre encontrar o lock já adquirido pela primeira.
    const [first, second] = await Promise.all([
      service.runBackup(config, os.tmpdir()),
      service.runBackup(config, os.tmpdir())
    ]);

    const blocked = [first, second].filter((r) => r.message.includes('em andamento'));
    expect(blocked).toHaveLength(1);
  });

  it('libera o lock após a execução, permitindo rodar novamente em seguida', async () => {
    const service = new BackupService();
    const config: DatabaseConnectionConfig = {
      id: 'conn-lock-release',
      name: 'Conexão de teste',
      type: 'unsupported-type' as any,
      host: 'localhost',
      port: 5432,
      database: 'db',
      user: 'user'
    };

    const first = await service.runBackup(config, os.tmpdir());
    expect(first.message).not.toContain('em andamento');

    const second = await service.runBackup(config, os.tmpdir());
    expect(second.message).not.toContain('em andamento');
  });

  it('aplica retenção combinando contagem e idade máxima em dias', async () => {
    const service = new BackupService();
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'backup-retention-'));

    const now = Date.now();
    const entries = [
      { fileName: 'newest.sql', ageMs: 0 },
      { fileName: 'middle.sql', ageMs: 5 * 24 * 60 * 60 * 1000 },
      { fileName: 'old.sql', ageMs: 40 * 24 * 60 * 60 * 1000 }
    ];
    for (const entry of entries) {
      await fs.promises.writeFile(path.join(dir, entry.fileName), 'conteudo');
    }

    vi.spyOn(service, 'listBackups').mockResolvedValue(
      entries.map((entry) => ({
        fileName: entry.fileName,
        filePath: path.join(dir, entry.fileName),
        sizeBytes: 1,
        createdAt: new Date(now - entry.ageMs).toISOString()
      }))
    );

    // retentionCount=2 mantém os 2 mais recentes; retentionDays=30 apaga o que passou de 30 dias.
    // 'old.sql' viola os dois critérios; nenhum outro viola qualquer um deles.
    const deleted = await service.applyRetention(dir, 2, 30);
    expect(deleted).toBe(1);

    const remaining = (await fs.promises.readdir(dir)).sort();
    expect(remaining).toEqual(['middle.sql', 'newest.sql']);

    await fs.promises.rm(dir, { recursive: true, force: true });
  });

  it('interpola placeholders corretamente no template de backup', () => {
    const config: DatabaseConnectionConfig = {
      id: 'conn-oracle-test',
      name: 'Oracle Prod',
      type: 'oracle',
      host: '192.168.1.100',
      port: 1521,
      database: 'ORCL',
      user: 'WINTHOR',
      password: 'secret_password_123',
      oracleMode: 'serviceName'
    };

    const destFolder = 'C:\\Backups\\Oracle';
    const placeholders = buildBackupPlaceholders(config, destFolder, { oracleDirectory: 'MEU_DIR' });

    const template = 'expdp {user}@{connectString} directory={directory} dumpfile={fileName} logfile={logFileName} schemas={user} version=11.2';
    const resolved = interpolateBackupTemplate(template, placeholders);

    expect(resolved).toContain('WINTHOR@192.168.1.100:1521/ORCL');
    expect(resolved).toContain('directory=MEU_DIR');
    expect(resolved).toContain('schemas=WINTHOR');
    expect(resolved).toContain('version=11.2');
  });

  it('tokeniza argumentos de linha de comando respeitando aspas sem invocar shell', () => {
    const cmd = 'exp user/pwd@host:1521/xe file="C:\\Minha Pasta\\backup.dmp" log="C:\\Minha Pasta\\backup.log" buffer=65536';
    const tokens = parseCommandLineTokens(cmd);

    expect(tokens).toEqual([
      'exp',
      'user/pwd@host:1521/xe',
      'file=C:\\Minha Pasta\\backup.dmp',
      'log=C:\\Minha Pasta\\backup.log',
      'buffer=65536'
    ]);
  });

  it('mascara senhas sensíveis em saídas de log e mensagens de erro', () => {
    const sensitive = 'minha_senha_secreta';
    const output = 'Erro ao conectar com user/minha_senha_secreta@localhost:1521: ORA-01017';
    const masked = maskSensitiveText(output, sensitive);

    expect(masked).not.toContain('minha_senha_secreta');
    expect(masked).toBe('Erro ao conectar com user/****@localhost:1521: ORA-01017');
  });

  it('rejeita comando customizado que não contém a tag obrigatória {filePath}', async () => {
    const service = new BackupService();
    const config: DatabaseConnectionConfig = {
      id: 'conn-custom-test',
      name: 'Teste',
      type: 'oracle',
      host: 'localhost',
      port: 1521,
      database: 'XE',
      user: 'system'
    };

    const result = await service.runCustomCommandBackup(
      config,
      os.tmpdir(),
      'expdp {user}@{connectString} schemas={user}'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('{filePath}');
  });

  it('bloqueia caracteres de injeção de shell no comando customizado', async () => {
    const service = new BackupService();
    const config: DatabaseConnectionConfig = {
      id: 'conn-injection-test',
      name: 'Teste',
      type: 'oracle',
      host: 'localhost',
      port: 1521,
      database: 'XE',
      user: 'system'
    };

    const result = await service.runCustomCommandBackup(
      config,
      os.tmpdir(),
      'exp {user} file="{filePath}" && rm -rf /'
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('caracteres não permitidos');
  });
});
