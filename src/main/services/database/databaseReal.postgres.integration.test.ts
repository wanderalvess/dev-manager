import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DatabaseConnectionConfig } from '../../../shared/types';
import { parseExplainPlan } from '../../../renderer/src/utils/explainPlanUtils';
import { DatabaseService } from '../DatabaseService';

/**
 * Roteiro de validação contra um PostgreSQL REAL (teste/homologação, nunca produção).
 * Só roda com as variáveis abaixo; a senha vem do ambiente e nunca é gravada em arquivo.
 *
 *   DM_IT_PG_HOST, DM_IT_PG_PORT, DM_IT_PG_DATABASE, DM_IT_PG_USER, DM_IT_PG_PASSWORD
 *   npx vitest run src/main/services/database/databaseReal.postgres.integration.test.ts
 *
 * Cria e remove apenas objetos com prefixo dm_validation_ no schema public.
 */
const env = process.env;
const enabled = Boolean(env.DM_IT_PG_HOST && env.DM_IT_PG_USER && env.DM_IT_PG_PASSWORD);

const T = 'dm_validation_t';
const CHILD = 'dm_validation_child';

describe.skipIf(!enabled)('Database Studio contra PostgreSQL real', () => {
  const svc = new DatabaseService();
  const config: DatabaseConnectionConfig = {
    id: 'it-pg',
    name: 'it-pg',
    type: 'postgres',
    host: env.DM_IT_PG_HOST ?? 'localhost',
    port: Number(env.DM_IT_PG_PORT ?? 5432),
    database: env.DM_IT_PG_DATABASE ?? 'postgres',
    user: env.DM_IT_PG_USER ?? '',
    password: env.DM_IT_PG_PASSWORD
  };

  const q = (sql: string, max = 200) => svc.executeQuery(config, sql, max);
  const count = async (table: string) => Number((await q(`SELECT COUNT(*) AS c FROM ${table}`)).rows[0].c);
  const cleanup = async () => {
    await q(`DROP TABLE IF EXISTS ${CHILD}`);
    await q(`DROP VIEW IF EXISTS dm_validation_v`);
    await q(`DROP TABLE IF EXISTS ${T} CASCADE`);
    await q(`DROP TABLE IF EXISTS dm_validation_ddl`);
    await q(`DROP FUNCTION IF EXISTS dm_validation_fn(integer)`);
    await q(`DROP FUNCTION IF EXISTS dm_validation_trg_fn()`);
  };

  beforeAll(async () => {
    await cleanup();
    const t = await q(
      `CREATE TABLE ${T} (id integer PRIMARY KEY, name varchar(50) NOT NULL, qty numeric(10,2) DEFAULT 0, created timestamp DEFAULT now())`
    );
    expect(t.error).toBeUndefined();
    const c = await q(
      `CREATE TABLE ${CHILD} (id integer PRIMARY KEY, t_id integer NOT NULL, CONSTRAINT dm_validation_fk FOREIGN KEY (t_id) REFERENCES ${T}(id) ON DELETE CASCADE)`
    );
    expect(c.error).toBeUndefined();
    await q(`CREATE INDEX dm_validation_idx ON ${T} (name)`);
    const f = await q(
      `CREATE FUNCTION dm_validation_trg_fn() RETURNS trigger AS $$ BEGIN NEW.qty := COALESCE(NEW.qty, 0); RETURN NEW; END; $$ LANGUAGE plpgsql`
    );
    expect(f.error).toBeUndefined();
    const tr = await q(`CREATE TRIGGER dm_validation_trg BEFORE INSERT ON ${T} FOR EACH ROW EXECUTE PROCEDURE dm_validation_trg_fn()`);
    expect(tr.error).toBeUndefined();
    await q(`CREATE VIEW dm_validation_v AS SELECT id, name FROM ${T}`);
  }, 60000);

  afterAll(async () => {
    await svc.closeAllSessions();
    await cleanup();
  }, 60000);

  it('(a) SELECT com muitas linhas marca truncated; exatamente maxRows não', async () => {
    const big = await q('SELECT g AS n FROM generate_series(1, 1000) g', 200);
    expect(big.success).toBe(true);
    expect(big.rowCount).toBe(200);
    expect(big.truncated).toBe(true);
    const exact = await q('SELECT g AS n FROM generate_series(1, 200) g', 200);
    expect(exact.rowCount).toBe(200);
    expect(exact.truncated).toBe(false);
  });

  it('(b) modo manual: contador, rollback, commit; DDL é transacional e pode ser desfeito', async () => {
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

    // DDL do PostgreSQL fica pendente e o rollback desfaz
    r = await svc.executeInSession(s.sessionId, 'CREATE TABLE dm_validation_ddl (x integer)');
    expect(r.success).toBe(true);
    expect(r.session.pendingStatements).toBe(1);
    await svc.rollbackSession(s.sessionId);
    const exists = await q(`SELECT to_regclass('dm_validation_ddl') AS t`);
    expect(exists.rows[0].t).toBeNull();

    // voltar para auto-commit confirma o que estava pendente
    await ins(3);
    expect((await svc.setSessionAutoCommit(s.sessionId, true)).pendingStatements).toBe(0);
    expect(await count(T)).toBe(2);

    await svc.closeSession(s.sessionId);
    await q(`DELETE FROM ${T}`);
  }, 60000);

  it('(c) cancelar pg_sleep(60) interrompe na hora e mantém a sessão utilizável', async () => {
    for (const auto of [true, false]) {
      const s = await svc.openSession(config, auto);
      const started = Date.now();
      // em modo manual o SELECT não abre transação; o comando roda direto e o cancel vale igual
      const pending = svc.executeInSession(s.sessionId, 'SELECT pg_sleep(60)');
      await new Promise((r) => setTimeout(r, 1000));
      await svc.cancelSession(s.sessionId);
      const res = await pending;
      expect(Date.now() - started).toBeLessThan(10000);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/cancel/i);
      const after = await svc.executeInSession(s.sessionId, 'SELECT 1 AS x');
      expect(after.success).toBe(true);
      expect(after.session.running).toBe(false);
      await svc.closeSession(s.sessionId);
    }
  }, 60000);

  it('(c2) cancelar dentro de transação aberta: a transação continua válida', async () => {
    const s = await svc.openSession(config, false);
    await svc.executeInSession(s.sessionId, `INSERT INTO ${T} (id, name) VALUES (50, 'keep')`);
    const pending = svc.executeInSession(s.sessionId, `UPDATE ${T} SET name = name WHERE id = 50 AND pg_sleep(60) IS NOT NULL`);
    await new Promise((r) => setTimeout(r, 1000));
    await svc.cancelSession(s.sessionId);
    const res = await pending;
    expect(res.success).toBe(false);
    const sel = await svc.executeInSession(s.sessionId, `SELECT name FROM ${T} WHERE id = 50`);
    expect(sel.success).toBe(true);
    expect(sel.rows[0].name).toBe('keep');
    await svc.commitSession(s.sessionId);
    expect(await count(T)).toBe(1);
    await svc.closeSession(s.sessionId);
    await q(`DELETE FROM ${T}`);
  }, 60000);

  it('(d) bloco DO e CREATE FUNCTION com $$ mantêm o corpo intacto', async () => {
    const s = await svc.openSession(config, true);
    const doBlock = await svc.executeInSession(
      s.sessionId,
      `DO $$ BEGIN INSERT INTO ${T} (id, name) VALUES (10, 'plpgsql'); END; $$;`
    );
    expect(doBlock.error).toBeUndefined();
    expect(await count(T)).toBe(1);

    const fn = await svc.executeInSession(
      s.sessionId,
      `CREATE OR REPLACE FUNCTION dm_validation_fn(p integer) RETURNS integer AS $$\nBEGIN\n  DELETE FROM ${T} WHERE id = p;\n  RETURN 1;\nEND;\n$$ LANGUAGE plpgsql;`
    );
    expect(fn.error).toBeUndefined();
    const call = await svc.executeInSession(s.sessionId, 'SELECT dm_validation_fn(10) AS r');
    expect(call.rows[0].r).toBe(1);
    expect(await count(T)).toBe(0);
    await svc.closeSession(s.sessionId);
  }, 60000);

  it('(e) erro dentro da transação não aborta o resto (SAVEPOINT por comando)', async () => {
    const s = await svc.openSession(config, false);
    const id = s.sessionId;
    expect((await svc.executeInSession(id, `INSERT INTO ${T} (id, name) VALUES (60, 'a')`)).success).toBe(true);
    const dup = await svc.executeInSession(id, `INSERT INTO ${T} (id, name) VALUES (60, 'dup')`);
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/duplicate|unique|duplicad/i);
    const bad = await svc.executeInSession(id, 'SELECT * FROM tabela_que_nao_existe');
    expect(bad.success).toBe(false);
    // transação continua utilizável e a primeira linha segue pendente
    const ok = await svc.executeInSession(id, `INSERT INTO ${T} (id, name) VALUES (61, 'b')`);
    expect(ok.success).toBe(true);
    expect(ok.session.pendingStatements).toBe(2);
    expect(Number((await svc.executeInSession(id, `SELECT COUNT(*) AS c FROM ${T}`)).rows[0].c)).toBe(2);
    await svc.commitSession(id);
    expect(await count(T)).toBe(2);
    await svc.closeSession(id);
    await q(`DELETE FROM ${T}`);
  }, 60000);

  it('(f) Descrever tabela: colunas, PK, FK, índices, trigger; DDL de tabela, view e função', async () => {
    const t = await svc.getTableDetails(config, T);
    expect(t.error).toBeUndefined();
    expect(t.success).toBe(true);
    expect(t.objectType).toBe('TABLE');
    expect(t.columns.find((c) => c.name === 'id')?.isPrimaryKey).toBe(true);
    expect(t.columns.find((c) => c.name === 'name')?.nullable).toBe(false);
    expect(t.columns.find((c) => c.name === 'qty')?.type).toBe('numeric(10,2)');
    expect(t.constraints.some((c) => c.kind === 'PRIMARY KEY')).toBe(true);
    expect(t.indexes.some((i) => i.name === 'dm_validation_idx')).toBe(true);
    const trg = t.triggers.find((x) => x.name === 'dm_validation_trg');
    expect(trg?.timing).toBe('BEFORE');
    expect(trg?.event).toBe('INSERT');

    const child = await svc.getTableDetails(config, `public.${CHILD}`);
    expect(child.error).toBeUndefined();
    const fk = child.constraints.find((c) => c.kind === 'FOREIGN KEY');
    expect(fk?.refTable).toContain(T);
    expect(fk?.refColumns).toEqual(['id']);
    expect(fk?.onDelete).toMatch(/CASCADE/i);

    const view = await svc.getTableDetails(config, 'dm_validation_v');
    expect(view.objectType).toBe('VIEW');

    const ddl = await svc.getObjectDdl(config, 'TABLE', T);
    expect(ddl.error).toBeUndefined();
    expect(ddl.ddl).toMatch(/CREATE TABLE/i);
    const vddl = await svc.getObjectDdl(config, 'VIEW', 'dm_validation_v');
    expect(vddl.ddl).toMatch(/SELECT/i);
    const fddl = await svc.getObjectDdl(config, 'FUNCTION', 'dm_validation_trg_fn');
    expect(fddl.error).toBeUndefined();
    expect(fddl.ddl).toMatch(/CREATE OR REPLACE FUNCTION/i);

    expect((await svc.getTableDetails(config, 'dm_validation_nao_existe')).success).toBe(false);

    const objs = await svc.listObjects(config);
    expect(objs.some((o) => o.name === `public.${T}` && o.type === 'TABLE')).toBe(true);
    expect(objs.some((o) => o.name === 'public.dm_validation_trg_fn' && o.type === 'FUNCTION')).toBe(true);
  }, 60000);

  it('(g) plano em árvore bate com o EXPLAIN em texto', async () => {
    await q(`INSERT INTO ${T} (id, name) SELECT g, 'n' || g FROM generate_series(1, 500) g`);
    await q(`ANALYZE ${T}`);
    const res = await svc.explainPlan(config, `SELECT * FROM ${T} t JOIN ${CHILD} c ON c.t_id = t.id WHERE t.name = 'n7'`);
    expect(res.error).toBeUndefined();
    expect(res.success).toBe(true);
    const plan = parseExplainPlan(res.planLines);
    expect(plan).not.toBeNull();
    expect(plan?.kind).toBe('postgres');
    expect(plan!.nodes.length).toBeGreaterThan(1);
    const raw = res.planLines.join('\n');
    for (const n of plan!.nodes) {
      if (n.object) expect(raw).toContain(n.object);
    }
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
