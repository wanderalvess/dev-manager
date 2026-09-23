import { describe, expect, it } from 'vitest';
import { getDefaultBackupCommandTemplate, resolveBackupCommandPreview } from './backupCommandPreview';
import type { DatabaseConnectionConfig } from '../../../shared/types';

function makeConnection(overrides: Partial<DatabaseConnectionConfig> = {}): DatabaseConnectionConfig {
  return {
    id: 'c1',
    name: 'Meu Banco',
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    database: 'meudb',
    user: 'admin',
    password: 'segredo123',
    ...overrides
  };
}

const baseOptions = {
  backupFolder: 'C:\\Backups',
  backupCompress: false,
  backupOracleDirectory: 'DATA_PUMP_DIR',
  useCustomBackupCommand: false,
  customBackupCommand: '',
  showPassword: false
};

describe('getDefaultBackupCommandTemplate', () => {
  it('retorna o template de expdp para oracle', () => {
    expect(getDefaultBackupCommandTemplate('oracle')).toContain('expdp');
  });

  it('retorna o template de mysqldump para mysql', () => {
    expect(getDefaultBackupCommandTemplate('mysql')).toContain('mysqldump');
  });

  it('retorna o template de pg_dump para postgres', () => {
    expect(getDefaultBackupCommandTemplate('postgres')).toContain('pg_dump');
  });
});

describe('resolveBackupCommandPreview', () => {
  it('retorna string vazia quando não há conexão', () => {
    expect(resolveBackupCommandPreview(null, baseOptions)).toBe('');
    expect(resolveBackupCommandPreview(undefined, baseOptions)).toBe('');
  });

  it('comando padrão do postgres usa host/porta/usuário/database e nunca expõe a senha', () => {
    const cmd = resolveBackupCommandPreview(makeConnection(), baseOptions);
    expect(cmd).toContain('pg_dump -h localhost -p 5432 -U admin -d meudb');
    expect(cmd).not.toContain('segredo123');
  });

  it('compressão do postgres muda o formato de -F p para -F c', () => {
    const cmd = resolveBackupCommandPreview(makeConnection(), { ...baseOptions, backupCompress: true });
    expect(cmd).toContain('-F c');
  });

  it('comando padrão do mysql usa mysqldump com --result-file', () => {
    const cmd = resolveBackupCommandPreview(makeConnection({ type: 'mysql', port: 3306 }), baseOptions);
    expect(cmd).toContain('mysqldump -h localhost -P 3306 -u admin');
    expect(cmd).toContain('--result-file=');
  });

  it('comando padrão do oracle usa expdp com connectString e diretório, e adiciona compression=ALL quando comprimido', () => {
    const conn = makeConnection({ type: 'oracle', port: 1521, oracleMode: 'serviceName' });
    const cmd = resolveBackupCommandPreview(conn, baseOptions);
    expect(cmd).toContain('expdp admin@localhost:1521/meudb directory=DATA_PUMP_DIR');
    expect(cmd).not.toContain('compression=ALL');

    const compressed = resolveBackupCommandPreview(conn, { ...baseOptions, backupCompress: true });
    expect(compressed).toContain('compression=ALL');
  });

  it('modo SID do oracle usa ":" em vez de "/" no connectString', () => {
    const conn = makeConnection({ type: 'oracle', port: 1521, oracleMode: 'sid' });
    const cmd = resolveBackupCommandPreview(conn, baseOptions);
    expect(cmd).toContain('localhost:1521:meudb');
  });

  it('porta ausente cai para o padrão do tipo de banco (5432/3306/1521)', () => {
    const conn = makeConnection({ port: undefined as any });
    expect(resolveBackupCommandPreview(conn, baseOptions)).toContain('-p 5432');
  });

  it('comando customizado substitui todos os placeholders suportados', () => {
    const conn = makeConnection({ name: 'Prod DB!', database: 'meudb' });
    const template =
      '{user}:{password}@{host}:{port}/{database} conn={connectString} dir={directory} folder={folder} file={fileName} path={filePath} log={logFileName} logpath={logPath} ts={timestamp}';
    const cmd = resolveBackupCommandPreview(conn, {
      ...baseOptions,
      useCustomBackupCommand: true,
      customBackupCommand: template
    });

    expect(cmd).toContain('admin:****@localhost:5432/meudb');
    expect(cmd).toContain('conn=localhost:5432/meudb');
    expect(cmd).toContain('dir=DATA_PUMP_DIR');
    expect(cmd).toContain('folder=C:\\Backups');
    expect(cmd).toContain('ts=TIMESTAMP');
    expect(cmd).toMatch(/file=Prod_DB__meudb_TIMESTAMP\.sql/);
    expect(cmd).not.toContain('segredo123');
  });

  it('showPassword: true revela a senha real no placeholder {password}', () => {
    const cmd = resolveBackupCommandPreview(makeConnection(), {
      ...baseOptions,
      useCustomBackupCommand: true,
      customBackupCommand: '{password}',
      showPassword: true
    });
    expect(cmd).toBe('segredo123');
  });

  it('nome de arquivo sanitiza caracteres não alfanuméricos do nome da conexão', () => {
    const conn = makeConnection({ name: 'Prod / Homolog (Filial 01)' });
    const cmd = resolveBackupCommandPreview(conn, {
      ...baseOptions,
      useCustomBackupCommand: true,
      customBackupCommand: '{fileName}'
    });
    expect(cmd).not.toMatch(/[/()]/);
  });
});
