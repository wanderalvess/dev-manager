import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import {
  BackupService,
  buildBackupPlaceholders,
  buildCustomCommandArgv,
  interpolateBackupTemplate,
  isBackupFileOfConnection,
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
    const deleted = await service.applyRetention(dir, { name: 'App', database: 'app', user: 'u' }, 2, 30);
    expect(deleted).toBe(1);

    const remaining = (await fs.promises.readdir(dir)).sort();
    expect(remaining).toEqual(['middle.sql', 'newest.sql']);

    await fs.promises.rm(dir, { recursive: true, force: true });
  });

  it('retenção só apaga backups da própria conexão: outras conexões e scripts na mesma pasta ficam', async () => {
    const service = new BackupService();
    const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'backup-retention-shared-'));
    const day = 24 * 60 * 60 * 1000;
    const files = [
      ['A_vendas_2026-10-01T02-00-00-000Z.sql', 1],
      ['A_vendas_2026-10-02T02-00-00-000Z.sql', 2],
      ['A_vendas_2026-10-03T02-00-00-000Z.sql', 3],
      ['B_estoque_2026-10-04T02-00-00-000Z.sql', 4],
      ['B_estoque_2026-10-05T02-00-00-000Z.sql', 5],
      ['script_manual.sql', 6]
    ] as const;
    for (const [name, ageDays] of files) {
      const full = path.join(dir, name);
      await fs.promises.writeFile(full, 'x');
      const when = new Date(Date.now() - ageDays * day);
      await fs.promises.utimes(full, when, when);
    }

    const deleted = await service.applyRetention(dir, { name: 'A', database: 'vendas', user: 'app' }, 1);

    expect(deleted).toBe(2);
    expect((await fs.promises.readdir(dir)).sort()).toEqual([
      'A_vendas_2026-10-01T02-00-00-000Z.sql',
      'B_estoque_2026-10-04T02-00-00-000Z.sql',
      'B_estoque_2026-10-05T02-00-00-000Z.sql',
      'script_manual.sql'
    ]);
    await fs.promises.rm(dir, { recursive: true, force: true });
  });

  it('reconhece os arquivos gerados pelos backups de uma conexão', () => {
    const conn = { name: 'Oracle Local', database: 'orcl', user: 'local' };
    expect(isBackupFileOfConnection('Oracle_Local_local_2026-10-29T12-00-00-000Z.dmp', conn)).toBe(true);
    expect(isBackupFileOfConnection('Oracle_Local_orcl_2026-10-29T12-00-00-000Z.sql', conn)).toBe(true);
    expect(isBackupFileOfConnection('Oracle_Local_2_orcl_2026-10-29T12-00-00-000Z.sql', conn)).toBe(false);
    expect(isBackupFileOfConnection('Oracle_Local_local_ontem.dmp', conn)).toBe(false);
    expect(isBackupFileOfConnection('outra_local_2026-10-29T12-00-00-000Z.dmp', conn)).toBe(false);
  });

  it('substitui os placeholders numa passada só: um valor com "{filePath}" não é trocado de novo', () => {
    const placeholders = buildBackupPlaceholders(
      { id: 'p', name: 'P', type: 'postgres', host: 'h', port: 5432, database: 'db', user: 'u', password: '{filePath}' },
      'C:\\bk'
    );
    expect(interpolateBackupTemplate('{password}|{desconhecido}', placeholders)).toBe('{filePath}|{desconhecido}');
  });

  describe('restore drill', () => {
    const source: DatabaseConnectionConfig = { id: 'src', name: 'Vendas', type: 'postgres', host: 'db', port: 5432, database: 'vendas', user: 'app' };
    const scratch: DatabaseConnectionConfig = { id: 'scr', name: 'Scratch', type: 'postgres', host: 'db', port: 5432, database: 'scratch', user: 'app' };
    const file = path.join(os.tmpdir(), 'Vendas_vendas_2026-10-29T12-00-00-000Z.sql');

    it('recusa a própria conexão de origem, informada ou com outro id mas mesmo banco', async () => {
      const service = new BackupService();
      const restore = vi.spyOn(service, 'restoreBackup');
      const same = await service.runRestoreDrill({ ...source, id: 'copia' }, file, undefined, source);
      expect(same.success).toBe(false);
      expect(same.message).toContain('é a origem deste backup');
      expect(restore).not.toHaveBeenCalled();
    });

    it('recusa quando o nome do arquivo mostra que o backup é da própria conexão scratch', async () => {
      const service = new BackupService();
      const result = await service.runRestoreDrill(source, file);
      expect(result.success).toBe(false);
      expect(result.message).toContain('é a origem deste backup');
    });

    it('recusa conexão de produção e conexão de outro tipo', async () => {
      const service = new BackupService();
      expect((await service.runRestoreDrill({ ...scratch, isProduction: true }, file, undefined, source)).message).toContain('produção');
      expect((await service.runRestoreDrill({ ...scratch, type: 'oracle' }, file, undefined, source)).message).toContain('mesmo tipo');
    });

    it('segue para a restauração quando o destino é outro banco do mesmo tipo', async () => {
      const service = new BackupService();
      const restore = vi.spyOn(service, 'restoreBackup').mockResolvedValue({ success: false, message: 'x' });
      await service.runRestoreDrill(scratch, file, undefined, source);
      expect(restore).toHaveBeenCalledWith(expect.objectContaining({ id: 'scr' }), file, undefined);
    });
  });

  it('recusa restaurar um arquivo de outro tipo de banco (ex.: .dmp do Oracle no PostgreSQL)', async () => {
    const service = new BackupService();
    const dmp = path.join(os.tmpdir(), `restore-tipo-${Date.now()}.dmp`);
    await fs.promises.writeFile(dmp, 'x');
    const result = await service.restoreBackup(
      { id: 'p', name: 'PG', type: 'postgres', host: 'h', port: 5432, database: 'db', user: 'u' },
      dmp
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain('.sql ou .dump');
    await fs.promises.rm(dmp, { force: true });
  });

  it('não preenche a senha salva quando o host informado difere da conexão salva com o mesmo id', () => {
    const saved: DatabaseConnectionConfig = { id: 'c1', name: 'C', type: 'postgres', host: 'db', port: 5432, database: 'd', user: 'u', password: 'segredo' };
    const configService = { getSettings: () => ({ databaseConnections: [saved] }) } as any;
    const service = new BackupService(configService);

    expect(service.resolveConnectionConfig({ ...saved, password: undefined }).password).toBe('segredo');
    expect(service.resolveConnectionConfig({ ...saved, password: undefined, host: 'atacante' }).password).toBeUndefined();
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

  it('valores com espaço ou aspas continuam sendo um único argumento (sem injetar argumentos)', () => {
    const config: DatabaseConnectionConfig = {
      id: 'c', name: 'n', type: 'oracle', host: 'h', port: 1521, database: 'XE', user: 'sys',
      password: 'pa ss" extra=1 --evil'
    };
    const placeholders = buildBackupPlaceholders(config, 'C:\\Backups', {});
    const argv = buildCustomCommandArgv('expdp {user}/{password}@{connectString} dumpfile={fileName}', placeholders);

    expect(argv).toHaveLength(3);
    expect(argv[1]).toBe('sys/pa ss" extra=1 --evil@h:1521/XE');
    expect(argv[2]).toBe('dumpfile=' + placeholders.fileName);
  });

  it('restauração MySQL com .gz corrompido termina com resultado, sem derrubar o processo', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-manager-restore-'));
    try {
      const dump = path.join(dir, 'corrompido.sql.gz');
      fs.writeFileSync(dump, Buffer.from('isto nao e um gzip valido, so lixo'.repeat(50)));
      const service = new BackupService();
      const config: DatabaseConnectionConfig = {
        id: 'conn-gz', name: 'gz', type: 'mysql', host: 'localhost', port: 3306, database: 'db', user: 'u'
      };

      // O "mysql" é o próprio node: sai logo, então o stdin quebra (EPIPE) enquanto o gunzip falha.
      const result = await service.restoreBackup(config, dump, { mysqlPath: process.execPath });
      expect(typeof result.success).toBe('boolean');
    } finally {
      // Assíncrono de propósito: o handle do arquivo só fecha com o event loop livre (no Windows)
      await fs.promises.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
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
