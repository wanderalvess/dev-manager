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

describe('mutações sem PK: identificação por ROWID/ctid', () => {
  const pg = { ...config, type: 'postgres' } as DatabaseConnectionConfig;
  const mysql = { ...config, type: 'mysql' } as DatabaseConnectionConfig;
  const rid = 'AAAR3sAAEAAAACXAAA';

  it('Oracle: UPDATE usa ROWID = :bind e não lista colunas no WHERE', async () => {
    const exec = vi.fn().mockResolvedValue(ok);
    await updateRow(ctxWith(vi.fn()), config, 'HR.T', { A: 1 }, { __ROWID__: rid }, exec);
    expect(exec).toHaveBeenCalledWith('UPDATE HR.T SET A = :p0 WHERE ROWID = :p1', { p0: 1, p1: rid });
  });

  it('Oracle: DELETE usa ROWID = :p0', async () => {
    const exec = vi.fn().mockResolvedValue(ok);
    await deleteRow(ctxWith(vi.fn()), config, 'T', { __ROWID__: rid }, exec);
    expect(exec).toHaveBeenCalledWith('DELETE FROM T WHERE ROWID = :p0', { p0: rid });
  });

  it('PostgreSQL: usa ctid e aceita só o formato (bloco,posição)', async () => {
    const exec = vi.fn().mockResolvedValue(ok);
    await updateRow(ctxWith(vi.fn()), pg, 'T', { A: 1 }, { __ROWID__: '(0,12)' }, exec);
    expect(exec).toHaveBeenCalledWith('UPDATE T SET A = :p0 WHERE ctid = :p1', { p0: 1, p1: '(0,12)' });

    const bad = await deleteRow(ctxWith(vi.fn()), pg, 'T', { __ROWID__: "(0,1)' OR '1'='1" }, exec);
    expect(bad.success).toBe(false);
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it('rejeita valor ausente, não-string ou inválido sem tocar o banco', async () => {
    const exec = vi.fn().mockResolvedValue(ok);
    for (const value of [null, undefined, '', 42, 'a b; DROP']) {
      const res = await deleteRow(ctxWith(vi.fn()), config, 'T', { __ROWID__: value }, exec);
      expect(res.success).toBe(false);
    }
    expect(exec).not.toHaveBeenCalled();
  });

  it('não combina ROWID com outras colunas e MySQL não suporta', async () => {
    const exec = vi.fn().mockResolvedValue(ok);
    expect((await deleteRow(ctxWith(vi.fn()), config, 'T', { __ROWID__: rid, ID: 1 }, exec)).success).toBe(false);
    expect((await deleteRow(ctxWith(vi.fn()), mysql, 'T', { __ROWID__: rid }, exec)).success).toBe(false);
    expect(exec).not.toHaveBeenCalled();
  });

  it('WHERE vazio e identificador inválido continuam bloqueados', async () => {
    const exec = vi.fn().mockResolvedValue(ok);
    expect((await updateRow(ctxWith(vi.fn()), config, 'T', { A: 1 }, {}, exec)).success).toBe(false);
    expect((await deleteRow(ctxWith(vi.fn()), config, 'T', {}, exec)).success).toBe(false);
    expect((await deleteRow(ctxWith(vi.fn()), config, 'T', { 'ID; DROP': 1 }, exec)).success).toBe(false);
    expect((await updateRow(ctxWith(vi.fn()), config, 'T; X', { A: 1 }, { __ROWID__: rid }, exec)).success).toBe(false);
    expect(exec).not.toHaveBeenCalled();
  });
});
