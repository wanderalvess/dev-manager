import { describe, expect, it, vi } from 'vitest';
import type { DatabaseConnectionConfig } from '../../../shared/types';
import type { DatabaseContext } from './databaseContext';
import { DatabaseSessionManager, isConnectionLostError } from './databaseSessions';

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

function oracleHandle() {
  const conn = {
    execute: vi.fn().mockResolvedValue({ rowsAffected: 3 }),
    commit: vi.fn().mockResolvedValue(undefined),
    rollback: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    break: vi.fn().mockResolvedValue(undefined)
  };
  return { conn, oracledb: { OUT_FORMAT_OBJECT: 4002 } };
}

function pgClient() {
  return {
    query: vi.fn().mockImplementation(async (sql: string) => {
      if (/pg_backend_pid/.test(sql)) return { rows: [{ pid: 4242 }], fields: [{ name: 'pid' }] };
      return { fields: [], rows: [], rowCount: 1 };
    }),
    end: vi.fn().mockResolvedValue(undefined)
  };
}

function makeManager(handles: { oracle?: any; pg?: any; mysql?: any }) {
  const ctx = {
    resolveConnectionConfig: (c: DatabaseConnectionConfig) => c,
    getOracleConnection: vi.fn().mockResolvedValue(handles.oracle),
    getPgClient: vi.fn().mockResolvedValue(handles.pg),
    getMysqlConnection: vi.fn().mockResolvedValue(handles.mysql),
    formatErrorMessage: vi.fn().mockImplementation(async (e: any) => e.message),
    interpolateBinds: (sql: string) => sql
  } as unknown as DatabaseContext;
  return { ctx, manager: new DatabaseSessionManager(ctx) };
}

describe('sessão Oracle: modo manual', () => {
  it('DML fica pendente (sem auto-commit) e commit zera o contador', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);

    const res = await manager.execute(s.sessionId, "UPDATE t SET a = 1 WHERE id = 2");
    expect(h.conn.execute.mock.calls[0][2].autoCommit).toBe(false);
    expect(res.session.pendingStatements).toBe(1);
    expect(res.session.pendingRows).toBe(3);

    await manager.execute(s.sessionId, 'DELETE FROM t WHERE id = 9');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(2);
    expect(manager.getState(s.sessionId).pendingRows).toBe(6);

    const after = await manager.commit(s.sessionId);
    expect(h.conn.commit).toHaveBeenCalledTimes(1);
    expect(after.pendingStatements).toBe(0);
    expect(after.pendingRows).toBe(0);
  });

  it('rollback desfaz e zera o contador', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);
    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');

    const after = await manager.rollback(s.sessionId);
    expect(h.conn.rollback).toHaveBeenCalledTimes(1);
    expect(after.pendingStatements).toBe(0);
  });

  it('SELECT não deixa nada pendente', async () => {
    const h = oracleHandle();
    h.conn.execute.mockResolvedValue({ rows: [{ ID: 1 }], metaData: [{ name: 'ID' }] });
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);

    const res = await manager.execute(s.sessionId, 'SELECT * FROM t');
    expect(res.session.pendingStatements).toBe(0);
    expect(res.rows).toHaveLength(1);
  });

  it('DDL faz commit implícito no Oracle: o pendente anterior é zerado', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);
    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(1);

    await manager.execute(s.sessionId, 'CREATE TABLE x (id NUMBER)');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(0);
  });

  it('PL/SQL conta como alteração pendente e preserva o ponto e vírgula final', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);

    await manager.execute(s.sessionId, 'BEGIN\n  pkg.proc;\nEND;\n/');
    expect(h.conn.execute.mock.calls[0][0]).toBe('BEGIN\n  pkg.proc;\nEND;');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(1);
  });

  it('COMMIT / ROLLBACK digitados no editor também zeram o contador', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);
    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');
    await manager.execute(s.sessionId, 'COMMIT;');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(0);

    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (2)');
    await manager.execute(s.sessionId, 'ROLLBACK');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(0);
  });

  it('em auto-commit o driver grava na hora e nada fica pendente', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), true);

    const res = await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');
    expect(h.conn.execute.mock.calls[0][2].autoCommit).toBe(true);
    expect(res.session.pendingStatements).toBe(0);
  });
});

describe('troca de modo, fechamento e limites', () => {
  it('voltar para auto-commit confirma o que estava pendente', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);
    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');

    const state = await manager.setAutoCommit(s.sessionId, true);
    expect(h.conn.commit).toHaveBeenCalledTimes(1);
    expect(state.autoCommit).toBe(true);
    expect(state.pendingStatements).toBe(0);

    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (2)');
    expect(h.conn.execute.mock.calls[1][2].autoCommit).toBe(true);
  });

  it('fechar a sessão com alterações pendentes faz rollback antes de fechar a conexão', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);
    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');

    await manager.close(s.sessionId);
    expect(h.conn.rollback).toHaveBeenCalledTimes(1);
    expect(h.conn.close).toHaveBeenCalledTimes(1);
    expect(manager.size).toBe(0);
    expect(() => manager.getState(s.sessionId)).toThrow(/não encontrada/);
  });

  it('sessão ociosa sem pendência é fechada; com alterações pendentes nunca é fechada em silêncio', async () => {
    const clean = oracleHandle();
    const dirty = oracleHandle();
    const { manager, ctx } = makeManager({ oracle: clean });
    (ctx.getOracleConnection as any).mockResolvedValueOnce(clean).mockResolvedValueOnce(dirty);

    const a = await manager.open(cfg('oracle'), false);
    const b = await manager.open(cfg('oracle'), false);
    await manager.execute(b.sessionId, 'INSERT INTO t VALUES (1)');

    const closed = await manager.sweepIdle(Date.now() + 31 * 60 * 1000);
    expect(closed).toBe(1);
    expect(clean.conn.close).toHaveBeenCalledTimes(1);
    expect(dirty.conn.close).not.toHaveBeenCalled();
    expect(() => manager.getState(a.sessionId)).toThrow();
    expect(manager.getState(b.sessionId).pendingStatements).toBe(1);
  });

  it('limita o número de sessões abertas', async () => {
    const { manager } = makeManager({ oracle: oracleHandle() });
    for (let i = 0; i < 8; i++) await manager.open(cfg('oracle'));
    await expect(manager.open(cfg('oracle'))).rejects.toThrow(/Limite de 8 sessões/);
  });
});

describe('cancelamento e execução simultânea', () => {
  it('cancelar durante a execução chama conn.break e bloqueia um segundo comando na mesma sessão', async () => {
    const h = oracleHandle();
    let finish!: (v: unknown) => void;
    h.conn.execute.mockImplementation(() => new Promise((r) => (finish = r)));
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'));

    const running = manager.execute(s.sessionId, 'SELECT * FROM big');
    await Promise.resolve();
    expect(manager.getState(s.sessionId).running).toBe(true);

    const second = await manager.execute(s.sessionId, 'SELECT 1 FROM dual');
    expect(second.success).toBe(false);
    expect(second.error).toMatch(/em execução/);

    await manager.cancel(s.sessionId);
    expect(h.conn.break).toHaveBeenCalledTimes(1);

    finish({ rows: [], metaData: [{ name: 'ID' }] });
    await running;
    expect(manager.getState(s.sessionId).running).toBe(false);
  });

  it('cancelar sem consulta em andamento não faz nada', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'));
    await manager.cancel(s.sessionId);
    expect(h.conn.break).not.toHaveBeenCalled();
  });

  it('commit/rollback durante uma execução são recusados', async () => {
    const h = oracleHandle();
    h.conn.execute.mockImplementation(() => new Promise(() => {}));
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);
    void manager.execute(s.sessionId, 'UPDATE t SET a = 1 WHERE id = 1');
    await Promise.resolve();

    await expect(manager.commit(s.sessionId)).rejects.toThrow(/em execução/);
    await expect(manager.rollback(s.sessionId)).rejects.toThrow(/em execução/);
  });
});

describe('queda de conexão', () => {
  it('descarta a sessão e avisa que as alterações pendentes foram perdidas', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);
    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');
    h.conn.execute.mockRejectedValue(new Error('ORA-03113: end-of-file on communication channel'));

    const res = await manager.execute(s.sessionId, 'INSERT INTO t VALUES (2)');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/conexão da sessão foi perdida/);
    expect(res.error).toMatch(/alterações pendentes foram descartadas/);
    expect(manager.size).toBe(0);
  });

  it('erro comum de SQL mantém a sessão e as alterações pendentes', async () => {
    const h = oracleHandle();
    const { manager } = makeManager({ oracle: h });
    const s = await manager.open(cfg('oracle'), false);
    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');
    h.conn.execute.mockRejectedValue(new Error('ORA-00942: table or view does not exist'));

    const res = await manager.execute(s.sessionId, 'SELECT * FROM nada');
    expect(res.success).toBe(false);
    expect(res.session.pendingStatements).toBe(1);
    expect(manager.size).toBe(1);
  });

  it('isConnectionLostError distingue queda de conexão de erro de SQL', () => {
    expect(isConnectionLostError(new Error('ORA-03114: not connected to ORACLE'))).toBe(true);
    expect(isConnectionLostError(new Error('NJS-500: connection to the Oracle Database was broken'))).toBe(true);
    expect(isConnectionLostError(new Error('Connection terminated unexpectedly'))).toBe(true);
    expect(isConnectionLostError({ code: 'PROTOCOL_CONNECTION_LOST', message: 'x' })).toBe(true);
    expect(isConnectionLostError(new Error('ORA-00942: table or view does not exist'))).toBe(false);
    expect(isConnectionLostError(new Error('syntax error at or near "FORM"'))).toBe(false);
  });
});

describe('sessão PostgreSQL', () => {
  const statements = (client: ReturnType<typeof pgClient>) => client.query.mock.calls.map((c) => String(c[0]));

  it('manual: BEGIN + SAVEPOINT antes do DML, RELEASE depois, COMMIT confirma', async () => {
    const client = pgClient();
    const { manager } = makeManager({ pg: client });
    const s = await manager.open(cfg('postgres'), false);

    await manager.execute(s.sessionId, 'UPDATE t SET a = 1 WHERE id = 1');
    const calls = statements(client);
    expect(calls.indexOf('BEGIN')).toBeGreaterThan(-1);
    expect(calls.indexOf('SAVEPOINT dm_stmt')).toBeGreaterThan(calls.indexOf('BEGIN'));
    expect(calls).toContain('UPDATE t SET a = 1 WHERE id = 1');
    expect(calls).toContain('RELEASE SAVEPOINT dm_stmt');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(1);

    await manager.commit(s.sessionId);
    expect(statements(client)).toContain('COMMIT');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(0);
  });

  it('SELECT fora de transação não abre BEGIN', async () => {
    const client = pgClient();
    const { manager } = makeManager({ pg: client });
    const s = await manager.open(cfg('postgres'), false);

    await manager.execute(s.sessionId, 'SELECT 1');
    expect(statements(client)).not.toContain('BEGIN');
  });

  it('erro dentro da transação desfaz só o comando (ROLLBACK TO SAVEPOINT) e mantém o restante', async () => {
    const client = pgClient();
    const { manager } = makeManager({ pg: client });
    const s = await manager.open(cfg('postgres'), false);
    await manager.execute(s.sessionId, 'INSERT INTO t VALUES (1)');

    client.query.mockImplementation(async (sql: string) => {
      if (/^INSERT INTO t VALUES \(2\)/.test(sql)) throw new Error('duplicate key value');
      return { fields: [], rows: [], rowCount: 1 };
    });
    const res = await manager.execute(s.sessionId, 'INSERT INTO t VALUES (2)');

    expect(res.success).toBe(false);
    expect(statements(client)).toContain('ROLLBACK TO SAVEPOINT dm_stmt');
    expect(res.session.pendingStatements).toBe(1);
  });

  it('DDL é transacional no PostgreSQL: fica pendente e pode ser desfeito', async () => {
    const client = pgClient();
    const { manager } = makeManager({ pg: client });
    const s = await manager.open(cfg('postgres'), false);

    await manager.execute(s.sessionId, 'CREATE TABLE x (id int)');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(1);
  });

  it('cancelar usa pg_cancel_backend com o pid da sessão, por uma segunda conexão', async () => {
    const client = pgClient();
    let finish!: (v: unknown) => void;
    const killer = pgClient();
    const { manager, ctx } = makeManager({ pg: client });
    (ctx.getPgClient as any).mockResolvedValueOnce(client).mockResolvedValueOnce(killer);
    const s = await manager.open(cfg('postgres'));

    client.query.mockImplementation(() => new Promise((r) => (finish = r)));
    const running = manager.execute(s.sessionId, 'SELECT pg_sleep(60)');
    await Promise.resolve();
    await Promise.resolve();

    await manager.cancel(s.sessionId);
    expect(killer.query).toHaveBeenCalledWith('SELECT pg_cancel_backend($1)', [4242]);
    expect(killer.end).toHaveBeenCalled();

    finish({ fields: [], rows: [] });
    await running;
  });
});

describe('sessão MySQL', () => {
  it('abre em modo manual com SET autocommit = 0 e alterna ao mudar de modo', async () => {
    const conn = {
      threadId: 77,
      query: vi.fn().mockResolvedValue([{ affectedRows: 1 }, undefined]),
      end: vi.fn().mockResolvedValue(undefined)
    };
    const { manager } = makeManager({ mysql: conn });
    const s = await manager.open(cfg('mysql'), false);
    expect(conn.query).toHaveBeenCalledWith('SET autocommit = 0');

    await manager.execute(s.sessionId, 'DELETE FROM t WHERE id = 1');
    expect(manager.getState(s.sessionId).pendingStatements).toBe(1);

    await manager.setAutoCommit(s.sessionId, true);
    expect(conn.query).toHaveBeenCalledWith('COMMIT');
    expect(conn.query).toHaveBeenCalledWith('SET autocommit = 1');
  });

  it('cancelar usa KILL QUERY com o threadId da sessão', async () => {
    const conn = {
      threadId: 77,
      query: vi.fn().mockImplementation(() => new Promise(() => {})),
      end: vi.fn().mockResolvedValue(undefined)
    };
    const killer = { query: vi.fn().mockResolvedValue([{}, undefined]), end: vi.fn().mockResolvedValue(undefined) };
    const { manager, ctx } = makeManager({ mysql: conn });
    (ctx.getMysqlConnection as any).mockResolvedValueOnce(conn).mockResolvedValueOnce(killer);
    const s = await manager.open(cfg('mysql'));

    void manager.execute(s.sessionId, 'SELECT SLEEP(60)');
    await Promise.resolve();
    await manager.cancel(s.sessionId);
    expect(killer.query).toHaveBeenCalledWith('KILL QUERY 77');
  });
});
