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

describe('Oracle: datas no WHERE (ORA-01861)', () => {
  const iso = '2026-10-22T18:32:05.123Z';
  const d = new Date(iso);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  const localBase = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const cols = (...rows: Array<[string, string]>): QueryResult => ({
    ...ok,
    isQuery: true,
    rows: rows.map(([COLUMN_NAME, DATA_TYPE]) => ({ COLUMN_NAME, DATA_TYPE, NULLABLE: 'Y', IS_PK: 'N' }))
  });

  it('coluna DATE: compara com TO_DATE da hora local, não com a string ISO', async () => {
    const executeQuery = vi.fn().mockResolvedValue(cols(['ID', 'NUMBER'], ['DT_MOV', 'DATE']));
    const exec = vi.fn().mockResolvedValue(ok);
    await deleteRow(ctxWith(executeQuery), config, 'MOV', { ID: 7, DT_MOV: iso }, exec);
    expect(exec).toHaveBeenCalledWith(
      "DELETE FROM MOV WHERE ID = :p0 AND DT_MOV = TO_DATE(:p1, 'YYYY-MM-DD HH24:MI:SS')",
      { p0: 7, p1: localBase }
    );
  });

  it('coluna TIMESTAMP: janela de 1 ms com os milissegundos', async () => {
    const executeQuery = vi.fn().mockResolvedValue(cols(['CRIADO', 'TIMESTAMP(6)']));
    const exec = vi.fn().mockResolvedValue(ok);
    await deleteRow(ctxWith(executeQuery), config, 'LOG', { CRIADO: iso }, exec);
    const [sql, binds] = exec.mock.calls[0];
    expect(sql).toContain("CRIADO >= TO_TIMESTAMP(:p0, 'YYYY-MM-DD HH24:MI:SS.FF3')");
    expect(sql).toContain("INTERVAL '0.001' SECOND");
    expect(binds.p0).toBe(`${localBase}.123`);
  });

  it('coluna VARCHAR com texto parecido com data continua comparada como texto', async () => {
    const executeQuery = vi.fn().mockResolvedValue(cols(['OBS', 'VARCHAR2(30)']));
    const exec = vi.fn().mockResolvedValue(ok);
    await deleteRow(ctxWith(executeQuery), config, 'T', { OBS: iso }, exec);
    expect(exec).toHaveBeenCalledWith('DELETE FROM T WHERE OBS = :p0', { p0: iso });
  });

  it('UPDATE também converte o WHERE, mantendo a numeração dos binds do SET', async () => {
    const executeQuery = vi.fn().mockResolvedValue(cols(['DT_MOV', 'DATE']));
    const exec = vi.fn().mockResolvedValue(ok);
    await updateRow(ctxWith(executeQuery), config, 'MOV', { A: 1 }, { DT_MOV: iso }, exec);
    expect(exec).toHaveBeenCalledWith(
      "UPDATE MOV SET A = :p0 WHERE DT_MOV = TO_DATE(:p1, 'YYYY-MM-DD HH24:MI:SS')",
      { p0: 1, p1: localBase }
    );
  });

  it('sem data no WHERE, por ROWID ou em outro banco não consulta metadados', async () => {
    const executeQuery = vi.fn();
    const exec = vi.fn().mockResolvedValue(ok);
    await deleteRow(ctxWith(executeQuery), config, 'T', { ID: 1 }, exec);
    await deleteRow(ctxWith(executeQuery), config, 'T', { __ROWID__: 'AAAR3sAAEAAAACXAAA' }, exec);
    await deleteRow(ctxWith(executeQuery), { ...config, type: 'postgres' } as DatabaseConnectionConfig, 'T', { D: iso }, exec);
    expect(executeQuery).not.toHaveBeenCalled();
  });
});
