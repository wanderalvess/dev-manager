import { describe, expect, it, vi } from 'vitest';
import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import type { DatabaseContext } from './databaseContext';
import { deleteRow, insertRow, updateRow } from './databaseMutations';

const config = { id: 'c', name: 'c', type: 'oracle', host: 'h', port: 1, database: 'd', user: 'u' } as DatabaseConnectionConfig;
const ok: QueryResult = { success: true, columns: [], rows: [], rowCount: 0, executionTimeMs: 1, isQuery: false, affectedRows: 1 };

function ctxWith(executeQuery: ReturnType<typeof vi.fn>): DatabaseContext {
  return { executeQuery } as unknown as DatabaseContext;
}

describe('mutações do grid: executor da sessão', () => {
  it('sem executor usa a conexão compartilhada (executeQuery)', async () => {
    const executeQuery = vi.fn().mockResolvedValue(ok);
    await updateRow(ctxWith(executeQuery), config, 'T', { A: 1 }, { ID: 2 });
    expect(executeQuery).toHaveBeenCalledTimes(1);
    expect(executeQuery.mock.calls[0][1]).toBe('UPDATE T SET A = :p0 WHERE ID = :p1');
  });

  it('com executor a edição entra na sessão e NÃO passa pela conexão compartilhada', async () => {
    const executeQuery = vi.fn().mockResolvedValue(ok);
    const exec = vi.fn().mockResolvedValue(ok);

    await insertRow(ctxWith(executeQuery), config, 'T', { A: 1 }, exec);
    await updateRow(ctxWith(executeQuery), config, 'T', { A: 1 }, { ID: 2 }, exec);
    await deleteRow(ctxWith(executeQuery), config, 'T', { ID: 2 }, exec);

    expect(executeQuery).not.toHaveBeenCalled();
    expect(exec).toHaveBeenCalledTimes(3);
    expect(exec.mock.calls[0][0]).toBe('INSERT INTO T (A) VALUES (:p0)');
    expect(exec.mock.calls[1][1]).toEqual({ p0: 1, p1: 2 });
    expect(exec.mock.calls[2][0]).toBe('DELETE FROM T WHERE ID = :p0');
  });

  it('a validação de identificadores continua valendo com executor', async () => {
    const exec = vi.fn().mockResolvedValue(ok);
    const res = await deleteRow(ctxWith(vi.fn()), config, 'T; DROP TABLE X', { ID: 1 }, exec);
    expect(res.success).toBe(false);
    expect(exec).not.toHaveBeenCalled();
  });
});
