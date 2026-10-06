import { describe, expect, it, vi } from 'vitest';
import type { DatabaseConnectionConfig } from '../../../shared/types';
import type { DatabaseContext } from './databaseContext';
import { executeOracle } from './databaseOracle';
import { executePostgres } from './databasePostgres';
import { executeMysql } from './databaseMysql';

const cfg = (type: DatabaseConnectionConfig['type']): DatabaseConnectionConfig => ({
  id: 'c',
  name: 'c',
  type,
  host: 'h',
  port: 1,
  database: 'd',
  user: 'u',
  password: 'p'
});

// Contexto mínimo: withConnection só repassa a conexão simulada para o driver
function ctxWith(conn: unknown): DatabaseContext {
  return {
    withConnection: async (_cfg: unknown, _get: unknown, _close: unknown, fn: (c: unknown) => Promise<unknown>) => fn(conn),
    interpolateBinds: (sql: string) => sql
  } as unknown as DatabaseContext;
}

const makeRows = (n: number) => Array.from({ length: n }, (_, i) => ({ ID: i + 1 }));

describe('executeOracle', () => {
  const oracledb = { OUT_FORMAT_OBJECT: 4002 };
  const run = (sql: string, maxRows: number, execute: ReturnType<typeof vi.fn>) =>
    executeOracle(ctxWith({ conn: { execute }, oracledb }), cfg('oracle'), sql, maxRows, Date.now());

  it('busca maxRows+1 e avisa truncamento quando há mais linhas que o limite', async () => {
    const execute = vi.fn().mockResolvedValue({ rows: makeRows(3), metaData: [{ name: 'ID' }] });
    const res = await run('SELECT * FROM t', 2, execute);

    expect(execute.mock.calls[0][2].maxRows).toBe(3);
    expect(res.rows).toHaveLength(2);
    expect(res.rowCount).toBe(2);
    expect(res.truncated).toBe(true);
  });

  it('não marca truncamento quando o resultado cabe exatamente no limite', async () => {
    const execute = vi.fn().mockResolvedValue({ rows: makeRows(2), metaData: [{ name: 'ID' }] });
    const res = await run('SELECT * FROM t', 2, execute);
    expect(res.rowCount).toBe(2);
    expect(res.truncated).toBe(false);
  });

  it('bloco PL/SQL chega ao driver com o ponto e vírgula final e com auto-commit', async () => {
    const execute = vi.fn().mockResolvedValue({ rowsAffected: 0 });
    await run('BEGIN\n  NULL;\nEND;\n/', 5, execute);

    expect(execute.mock.calls[0][0]).toBe('BEGIN\n  NULL;\nEND;');
    expect(execute.mock.calls[0][2].autoCommit).toBe(true);
    expect(execute.mock.calls[0][2].maxRows).toBeUndefined();
  });

  it('SELECT não usa auto-commit e perde o ponto e vírgula final', async () => {
    const execute = vi.fn().mockResolvedValue({ rows: [], metaData: [{ name: 'ID' }] });
    await run('-- c\nSELECT 1 FROM dual;', 5, execute);

    expect(execute.mock.calls[0][0]).toBe('-- c\nSELECT 1 FROM dual');
    expect(execute.mock.calls[0][2].autoCommit).toBe(false);
  });
});

describe('executePostgres', () => {
  it('acrescenta LIMIT maxRows+1, corta o excedente e avisa truncamento', async () => {
    const query = vi.fn().mockResolvedValue({ fields: [{ name: 'ID' }], rows: makeRows(3) });
    const res = await executePostgres(ctxWith({ query }), cfg('postgres'), 'SELECT * FROM t', 2, Date.now());

    expect(query).toHaveBeenCalledWith('SELECT * FROM t\nLIMIT 3');
    expect(res.rows).toHaveLength(2);
    expect(res.rowCount).toBe(2);
    expect(res.truncated).toBe(true);
  });

  it('não reescreve DML nem consultas que já têm LIMIT', async () => {
    const query = vi.fn().mockResolvedValue({ fields: [], rows: [], rowCount: 4 });
    await executePostgres(ctxWith({ query }), cfg('postgres'), 'UPDATE t SET a = 1', 2, Date.now());
    expect(query).toHaveBeenCalledWith('UPDATE t SET a = 1');

    query.mockClear();
    query.mockResolvedValue({ fields: [{ name: 'ID' }], rows: makeRows(1) });
    await executePostgres(ctxWith({ query }), cfg('postgres'), 'SELECT * FROM t LIMIT 1', 2, Date.now());
    expect(query).toHaveBeenCalledWith('SELECT * FROM t LIMIT 1');
  });
});

describe('executeMysql', () => {
  it('acrescenta LIMIT maxRows+1, usa timeout por consulta e avisa truncamento', async () => {
    const query = vi.fn().mockResolvedValue([makeRows(3), [{ name: 'ID' }]]);
    const res = await executeMysql(ctxWith({ query }), cfg('mysql'), 'SELECT * FROM t', 2, Date.now());

    expect(query).toHaveBeenCalledWith({ sql: 'SELECT * FROM t\nLIMIT 3', timeout: 60000 });
    expect(res.rows).toHaveLength(2);
    expect(res.rowCount).toBe(2);
    expect(res.truncated).toBe(true);
  });

  it('comando de modificação devolve linhas afetadas sem truncamento', async () => {
    const query = vi.fn().mockResolvedValue([{ affectedRows: 7 }, undefined]);
    const res = await executeMysql(ctxWith({ query }), cfg('mysql'), 'DELETE FROM t WHERE a = 1', 2, Date.now());
    expect(res.isQuery).toBe(false);
    expect(res.affectedRows).toBe(7);
    expect(res.truncated).toBeUndefined();
  });
});
