import { beforeEach, describe, expect, it, vi } from 'vitest';

const execFileMock = vi.hoisted(() => vi.fn());

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return { ...actual, execFile: execFileMock };
});

import { BackupService } from './BackupService';
import type { DatabaseConnectionConfig } from '../../shared/types';

const oracle: DatabaseConnectionConfig = {
  id: 'ora-restore-test',
  name: 'ORA',
  type: 'oracle',
  host: 'db.remoto',
  port: 1521,
  database: 'FREEPDB1',
  user: 'APPUSER',
  password: 'x'
};

describe('BackupService.restoreBackup (Oracle com dump no servidor)', () => {
  beforeEach(() => {
    execFileMock.mockReset();
    execFileMock.mockImplementation((_bin: string, _args: string[], _opts: unknown, cb: (e: Error | null, so: string, se: string) => void) => {
      queueMicrotask(() => cb(null, 'Job concluído', ''));
      return { stdin: { write: vi.fn(), end: vi.fn() } };
    });
  });

  it('nome simples de .dmp que não existe localmente segue para o impdp (servidor remoto)', async () => {
    const res = await new BackupService().restoreBackup(oracle, 'ORA_APPUSER_2026-10-16.dmp', { impdpPath: 'impdp' } as never);
    expect(res.success).toBe(true);
    expect(execFileMock).toHaveBeenCalledTimes(1);
    const args: string[] = execFileMock.mock.calls[0][1];
    expect(args).toEqual(expect.arrayContaining(['dumpfile=ORA_APPUSER_2026-10-16.dmp', 'directory=DATA_PUMP_DIR']));
  });

  it.each(['..\\segredo.dmp', '../segredo.dmp', 'pasta/outro.dmp', 'C:\\x\\dump.dmp', 'dump.sql', 'dump.dmp; rm -rf', '.dmp'])(
    'rejeita %s sem chamar o impdp',
    async (name) => {
      const res = await new BackupService().restoreBackup(oracle, name, { impdpPath: 'impdp' } as never);
      expect(res.success).toBe(false);
      expect(res.message).toBe('Arquivo de backup não encontrado.');
      expect(execFileMock).not.toHaveBeenCalled();
    }
  );

  it('o atalho vale só para Oracle: Postgres com nome de .dmp inexistente continua sendo rejeitado', async () => {
    const res = await new BackupService().restoreBackup({ ...oracle, type: 'postgres', id: 'pg-x' }, 'dump.dmp');
    expect(res.success).toBe(false);
    expect(res.message).toBe('Arquivo de backup não encontrado.');
    expect(execFileMock).not.toHaveBeenCalled();
  });
});
