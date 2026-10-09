import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DatabaseConnectionConfig } from '../../../shared/types';
import { DatabaseService } from '../DatabaseService';

/**
 * Roteiro de validação contra um MySQL REAL (teste/homologação, nunca produção).
 * Só roda com as variáveis abaixo; a senha vem do ambiente e nunca é gravada em arquivo.
 *
 *   DM_IT_MYSQL_HOST, DM_IT_MYSQL_PORT, DM_IT_MYSQL_DATABASE, DM_IT_MYSQL_USER, DM_IT_MYSQL_PASSWORD
 *   npx vitest run src/main/services/database/databaseReal.mysql.integration.test.ts
 *
 * Cria e remove apenas objetos com prefixo dm_validation_ no database informado.
 */
const env = process.env;
const enabled = Boolean(env.DM_IT_MYSQL_HOST && env.DM_IT_MYSQL_USER && env.DM_IT_MYSQL_PASSWORD);

const T = 'dm_validation_t';
const CHILD = 'dm_validation_child';

describe.skipIf(!enabled)('Database Studio contra MySQL real', () => {
  const svc = new DatabaseService();
  const config: DatabaseConnectionConfig = {
    id: 'it-mysql',
    name: 'it-mysql',
    type: 'mysql',
    host: env.DM_IT_MYSQL_HOST ?? 'localhost',
    port: Number(env.DM_IT_MYSQL_PORT ?? 3306),
    database: env.DM_IT_MYSQL_DATABASE ?? 'test',
    user: env.DM_IT_MYSQL_USER ?? '',
    password: env.DM_IT_MYSQL_PASSWORD
  };

  const q = (sql: string, max = 200) => svc.executeQuery(config, sql, max);
  const count = async (table: string) => Number((await q(`SELECT COUNT(*) AS c FROM ${table}`)).rows[0].c);
  const cleanup = async () => {
    await q(`DROP TABLE IF EXISTS ${CHILD}`);
    await q(`DROP VIEW IF EXISTS dm_validation_v`);
    await q(`DROP TABLE IF EXISTS ${T}`);
    await q(`DROP PROCEDURE IF EXISTS dm_validation_proc`);
  };

  beforeAll(async () => {
    await cleanup();
    const t = await q(
      `CREATE TABLE ${T} (id INT PRIMARY KEY, name VARCHAR(50) NOT NULL, qty DECIMAL(10,2) DEFAULT 0, created DATETIME DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB COMMENT='tabela de validacao'`
    );
    expect(t.error).toBeUndefined();
    const c = await q(
      `CREATE TABLE ${CHILD} (id INT PRIMARY KEY, t_id INT NOT NULL, CONSTRAINT dm_validation_fk FOREIGN KEY (t_id) REFERENCES ${T}(id) ON DELETE CASCADE) ENGINE=InnoDB`
    );
    expect(c.error).toBeUndefined();
    await q(`CREATE INDEX dm_validation_idx ON ${T} (name)`);
    const tr = await q(`CREATE TRIGGER dm_validation_trg BEFORE INSERT ON ${T} FOR EACH ROW SET NEW.qty = IFNULL(NEW.qty, 0)`);
    expect(tr.error).toBeUndefined();
    await q(`CREATE VIEW dm_validation_v AS SELECT id, name FROM ${T}`);
  }, 60000);

  afterAll(async () => {
    await svc.closeAllSessions();
    await cleanup();
  }, 60000);

  it('(a) SELECT com muitas linhas marca truncated; exatamente maxRows não', async () => {
    const gen = (n: number) =>
      `WITH RECURSIVE s(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM s WHERE n < ${n}) SELECT n FROM s`;
    const probe = await q(gen(3));
    if (!probe.success) {
      // MySQL 5.7 não tem CTE: usa produto cruzado de uma tabela auxiliar
      await q(`INSERT INTO ${T} (id, name) SELECT a.i + b.i * 10 + c.i * 100 + 1, 'g' FROM (SELECT 0 i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a, (SELECT 0 i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b, (SELECT 0 i UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) c`);
      const big = await q(`SELECT id FROM ${T}`, 200);
      expect(big.rowCount).toBe(200);
      expect(big.truncated).toBe(true);
      const exact = await q(`SELECT id FROM ${T} WHERE id <= 200`, 200);
      expect(exact.rowCount).toBe(200);
      expect(exact.truncated).toBe(false);
      await q(`DELETE FROM ${T}`);
      return;
    }
    const big = await q(gen(1000).replace('< 1000', '< 1000'), 200);
    expect(big.success).toBe(true);
    expect(big.rowCount).toBe(200);
    expect(big.truncated).toBe(true);
    const exact = await q(gen(200), 200);
    expect(exact.rowCount).toBe(200);
    expect(exact.truncated).toBe(false);
  });

  it('(b) modo manual: contador, rollback, commit e commit implícito do DDL', async () => {
    const s = await svc.openSession(config, false);
    const ins = (id: number) => svc.executeInSession(s.sessionId, `INSERT INTO ${T} (id, name) VALUES (${id}, 'n${id}')`);

    let r = await ins(1);
    expect(r.error).toBeUndefined();
    expect(r.session.pendingStatements).toBe(1);
    expect(r.session.pendingRows).toBe(1);
    expect(await count(T)).toBe(0);

    r = await svc.executeInSession(s.sessionId, `UPDATE ${T} SET name = 'x' WHERE id = 1`);
    expect(r.session.pendingStatements).toBe(2);

    expect((await svc.rollbackSession(s.sessionId)).pendingStatements).toBe(0);
    expect(await count(T)).toBe(0);

    await ins(2);
    expect((await svc.commitSession(s.sessionId)).pendingStatements).toBe(0);
    expect(await count(T)).toBe(1);

    await ins(3);
    r = await svc.executeInSession(s.sessionId, `ALTER TABLE ${T} COMMENT = 'tabela de validacao'`);
    expect(r.success).toBe(true);
    expect(r.session.pendingStatements).toBe(0);
    expect(await count(T)).toBe(2);

    // voltar para auto-commit confirma o que estava pendente
    await ins(4);
    expect((await svc.setSessionAutoCommit(s.sessionId, true)).pendingStatements).toBe(0);
    expect(await count(T)).toBe(3);

    await svc.closeSession(s.sessionId);
    await q(`DELETE FROM ${T}`);
  }, 60000);

  it('(c) cancelar SELECT SLEEP(60) volta logo e mantém a sessão utilizável', async () => {
    for (const auto of [true, false]) {
      const s = await svc.openSession(config, auto);
      const started = Date.now();
      const pending = svc.executeInSession(s.sessionId, 'SELECT SLEEP(60) AS r');
      await new Promise((r) => setTimeout(r, 1000));
      await svc.cancelSession(s.sessionId);
      const res = await pending;
      // No MySQL, KILL QUERY em SLEEP() devolve 1 (sem erro); outras consultas voltam com ER_QUERY_INTERRUPTED
      expect(Date.now() - started).toBeLessThan(10000);
      const after = await svc.executeInSession(s.sessionId, 'SELECT 1 AS x');
      expect(after.success).toBe(true);
      expect(after.session.running).toBe(false);
      expect(res.session.running).toBe(false);
      await svc.closeSession(s.sessionId);
    }
  }, 60000);

  it('(d) CREATE PROCEDURE com BEGIN...END e CALL', async () => {
    const s = await svc.openSession(config, true);
    const proc = await svc.executeInSession(
      s.sessionId,
      `CREATE PROCEDURE dm_validation_proc(IN p INT)\nBEGIN\n  INSERT INTO ${T} (id, name) VALUES (p, 'proc');\n  UPDATE ${T} SET qty = 5 WHERE id = p;\nEND`
    );
    expect(proc.error).toBeUndefined();
    const call = await svc.executeInSession(s.sessionId, 'CALL dm_validation_proc(10)');
    expect(call.error).toBeUndefined();
    expect(await count(T)).toBe(1);
    await svc.closeSession(s.sessionId);
    await q(`DELETE FROM ${T}`);
  }, 60000);

  it('(f) Descrever tabela: colunas, PK, FK, índices, trigger; DDL', async () => {
    const t = await svc.getTableDetails(config, T);
    expect(t.error).toBeUndefined();
    expect(t.success).toBe(true);
    expect(t.comment).toBe('tabela de validacao');
    expect(t.columns.find((c) => c.name === 'id')?.isPrimaryKey).toBe(true);
    expect(t.columns.find((c) => c.name === 'name')?.nullable).toBe(false);
    expect(t.columns.find((c) => c.name === 'qty')?.type).toBe('decimal(10,2)');
    expect(t.constraints.some((c) => c.kind === 'PRIMARY KEY')).toBe(true);
    expect(t.indexes.some((i) => i.name === 'dm_validation_idx')).toBe(true);
    expect(t.triggers.find((x) => x.name === 'dm_validation_trg')?.timing).toBe('BEFORE');

    const child = await svc.getTableDetails(config, CHILD);
    const fk = child.constraints.find((c) => c.kind === 'FOREIGN KEY');
    expect(fk?.refTable).toContain(T);
    expect(fk?.refColumns).toEqual(['id']);
    expect(fk?.onDelete).toMatch(/CASCADE/i);

    expect((await svc.getTableDetails(config, 'dm_validation_v')).objectType).toBe('VIEW');

    const ddl = await svc.getObjectDdl(config, 'TABLE', T);
    expect(ddl.error).toBeUndefined();
    expect(ddl.ddl).toMatch(/CREATE TABLE/i);
    expect((await svc.getObjectDdl(config, 'VIEW', 'dm_validation_v')).ddl).toMatch(/VIEW/i);
    expect((await svc.getObjectDdl(config, 'TRIGGER', 'dm_validation_trg')).ddl).toMatch(/TRIGGER/i);

    expect((await svc.getTableDetails(config, 'dm_validation_nao_existe')).success).toBe(false);

    const objs = await svc.listObjects(config);
    expect(objs.some((o) => o.name === T && o.type === 'TABLE')).toBe(true);
    expect(objs.some((o) => o.name === 'dm_validation_trg' && o.type === 'TRIGGER')).toBe(true);
  }, 60000);

  it('(g) EXPLAIN devolve linhas tabulares', async () => {
    await q(`INSERT INTO ${T} (id, name) VALUES (1, 'x')`);
    const res = await svc.explainPlan(config, `SELECT * FROM ${T} WHERE id = 1`);
    expect(res.error).toBeUndefined();
    expect(res.success).toBe(true);
    expect(res.planLines.length).toBeGreaterThan(0);
    expect(res.planLines.join('\n')).toContain(T);
    await q(`DELETE FROM ${T}`);
  }, 60000);

  it('(h) mutações do grid em auto-commit e em modo manual', async () => {
    const i = await svc.insertRow(config, T, { id: 20, name: 'grid' });
    expect(i.error).toBeUndefined();
    expect(i.affectedRows).toBe(1);
    expect((await svc.updateRow(config, T, { name: 'grid2' }, { id: 20 })).affectedRows).toBe(1);
    expect((await q(`SELECT name FROM ${T} WHERE id = 20`)).rows[0].name).toBe('grid2');
    expect((await svc.deleteRow(config, T, { id: 20 })).affectedRows).toBe(1);

    const s = await svc.openSession(config, false);
    const sid = s.sessionId;
    expect((await svc.insertRow(config, T, { id: 21, name: 'a' }, sid)).affectedRows).toBe(1);
    expect((await svc.updateRow(config, T, { name: 'b' }, { id: 21 }, sid)).affectedRows).toBe(1);
    expect(svc.getSessionState(sid).pendingStatements).toBe(2);
    expect(await count(T)).toBe(0);
    await svc.rollbackSession(sid);
    expect(await count(T)).toBe(0);
    await svc.insertRow(config, T, { id: 22, name: 'c' }, sid);
    await svc.commitSession(sid);
    expect(await count(T)).toBe(1);
    expect((await svc.deleteRow(config, T, { id: 22 }, sid)).affectedRows).toBe(1);
    expect((await svc.updateRow(config, T, { name: 'z' }, { id: 999 }, sid)).affectedRows).toBe(0);
    await svc.commitSession(sid);
    await svc.closeSession(sid);
  }, 60000);

  it('(i) duas sessões mantêm transações e resultados independentes', async () => {
    const a = await svc.openSession(config, false);
    const b = await svc.openSession(config, false);
    await svc.executeInSession(a.sessionId, `INSERT INTO ${T} (id, name) VALUES (30, 'a')`);
    await svc.executeInSession(b.sessionId, `INSERT INTO ${T} (id, name) VALUES (31, 'b')`);
    const ra = await svc.executeInSession(a.sessionId, `SELECT id FROM ${T} ORDER BY id`);
    const rb = await svc.executeInSession(b.sessionId, `SELECT id FROM ${T} ORDER BY id`);
    expect(ra.rows.map((r) => r.id)).toEqual([30]);
    expect(rb.rows.map((r) => r.id)).toEqual([31]);
    await svc.rollbackSession(a.sessionId);
    expect(svc.getSessionState(b.sessionId).pendingStatements).toBe(1);
    await svc.rollbackSession(b.sessionId);
    await svc.closeSession(a.sessionId);
    await svc.closeSession(b.sessionId);
  }, 60000);
});
