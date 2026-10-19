import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, execFile: execFileMock };
});

import { BackupService } from './BackupService';
import type { DatabaseConnectionConfig } from '../../shared/types';

const config: DatabaseConnectionConfig = {
  id: 'pg-args-test',
  name: 'PG',
  type: 'postgres',
  host: '127.0.0.1',
  port: 5432,
  database: 'appdb',
  user: 'postgres',
  password: 'x'
};

describe('BackupService.backupPostgres: argumentos do pg_dump', () => {
  beforeEach(() => {
    execFileMock.mockReset();
    // Simula o pg_dump gerando o arquivo -f e terminando com sucesso
    execFileMock.mockImplementation((_bin: string, args: string[], _opts: unknown, cb: (e: Error | null, so: string, se: string) => void) => {
      const out = args[args.indexOf('-f') + 1];
      fs.writeFileSync(out, '-- dump');
      cb(null, '', '');
    });
  });

  it('dump em SQL puro usa --clean --if-exists para poder ser restaurado sobre uma base existente', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-pg-'));
    try {
      const res = await new BackupService().runBackup(config, dir, { pgDumpPath: 'pg_dump' } as never);
      expect(res.success).toBe(true);
      const args: string[] = execFileMock.mock.calls[0][1];
      expect(args).toEqual(expect.arrayContaining(['-F', 'p', '--clean', '--if-exists']));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('dump compactado (-Fc) não recebe --clean: a limpeza fica a cargo do pg_restore', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dm-pg-'));
    try {
      const res = await new BackupService().runBackup(config, dir, { pgDumpPath: 'pg_dump', compress: true } as never);
      expect(res.success).toBe(true);
      const args: string[] = execFileMock.mock.calls[0][1];
      expect(args).toEqual(expect.arrayContaining(['-F', 'c']));
      expect(args).not.toContain('--clean');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
