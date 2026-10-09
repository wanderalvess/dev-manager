import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DatabaseConnectionConfig } from '../../../shared/types';
import { parseExplainPlan } from '../../../renderer/src/utils/explainPlanUtils';
import { DatabaseService } from '../DatabaseService';

/**
 * Roteiro de validação contra um Oracle REAL (teste/homologação, nunca produção).
 * Só roda com as variáveis abaixo definidas; a senha vem do ambiente e nunca é gravada em arquivo.
 *
 *   DM_IT_ORACLE_HOST, DM_IT_ORACLE_PORT, DM_IT_ORACLE_SERVICE, DM_IT_ORACLE_USER, DM_IT_ORACLE_PASSWORD
 *   npx vitest run src/main/services/database/databaseReal.oracle.integration.test.ts
 *
 * Cria e remove apenas objetos com prefixo DM_VALIDATION_ no schema do usuário informado.
 */
const env = process.env;
const enabled = Boolean(env.DM_IT_ORACLE_HOST && env.DM_IT_ORACLE_USER && env.DM_IT_ORACLE_PASSWORD);

const T = 'DM_VALIDATION_T';
const CHILD = 'DM_VALIDATION_CHILD';
const PROC = 'DM_VALIDATION_PROC';

describe.skipIf(!enabled)('Database Studio contra Oracle real', () => {
  const svc = new DatabaseService();
  const config: DatabaseConnectionConfig = {
    id: 'it-oracle',
    name: 'it-oracle',
    type: 'oracle',
    host: env.DM_IT_ORACLE_HOST ?? 'localhost',
    port: Number(env.DM_IT_ORACLE_PORT ?? 1521),
    database: env.DM_IT_ORACLE_SERVICE ?? 'FREEPDB1',
    user: env.DM_IT_ORACLE_USER ?? '',
    password: env.DM_IT_ORACLE_PASSWORD,
    oracleMode: 'serviceName'
  };

  const q = (sql: string, max = 200) => svc.executeQuery(config, sql, max);
  const count = async (table: string) => Number((await q(`SELECT COUNT(*) AS C FROM ${table}`)).rows[0].C);
  const dropQuiet = async (sql: string) => {
    await q(sql);
  };

  beforeAll(async () => {
    await dropQuiet(`DROP TABLE ${CHILD} PURGE`);
    await dropQuiet(`DROP TABLE ${T} PURGE`);
    await dropQuiet(`DROP PROCEDURE ${PROC}`);
    const t = await q(
      `CREATE TABLE ${T} (ID NUMBER(10) PRIMARY KEY, NAME VARCHAR2(50) NOT NULL, QTY NUMBER(10,2) DEFAULT 0, CREATED DATE DEFAULT SYSDATE)`
    );
    expect(t.error).toBeUndefined();
    const c = await q(
      `CREATE TABLE ${CHILD} (ID NUMBER(10) PRIMARY KEY, T_ID NUMBER(10) NOT NULL, CONSTRAINT DM_VALIDATION_FK FOREIGN KEY (T_ID) REFERENCES ${T}(ID))`
    );
    expect(c.error).toBeUndefined();
    await q(`CREATE INDEX DM_VALIDATION_IDX ON ${T} (NAME)`);
    await q(
      `CREATE OR REPLACE TRIGGER DM_VALIDATION_TRG BEFORE INSERT ON ${T} FOR EACH ROW BEGIN :NEW.QTY := NVL(:NEW.QTY, 0); END;`
    );
  }, 60000);

  afterAll(async () => {
    await svc.closeAllSessions();
    await dropQuiet(`DROP TABLE ${CHILD} PURGE`);
    await dropQuiet(`DROP TABLE ${T} PURGE`);
    await dropQuiet(`DROP PROCEDURE ${PROC}`);
  }, 60000);

  it('(a) SELECT com muitas linhas marca truncated; exatamente maxRows não', async () => {
    const big = await q('SELECT LEVEL AS N FROM DUAL CONNECT BY LEVEL <= 1000', 200);
    expect(big.success).toBe(true);
    expect(big.rowCount).toBe(200);
    expect(big.truncated).toBe(true);
    const exact = await q('SELECT LEVEL AS N FROM DUAL CONNECT BY LEVEL <= 200', 200);
    expect(exact.rowCount).toBe(200);
    expect(exact.truncated).toBe(false);
    const one = await q('SELECT 1 AS X FROM DUAL');
    expect(one.rows[0].X).toBe(1);
  });

  it('(b) modo manual: contador, rollback, commit e commit implícito do DDL', async () => {
    const s = await svc.openSession(config, false);
    const ins = (id: number) => svc.executeInSession(s.sessionId, `INSERT INTO ${T} (ID, NAME) VALUES (${id}, 'n${id}')`);

    let r = await ins(1);
    expect(r.success).toBe(true);
    expect(r.session.pendingStatements).toBe(1);
    expect(r.session.pendingRows).toBe(1);
    // outra conexão não enxerga a linha não confirmada
    expect(await count(T)).toBe(0);

    r = await svc.executeInSession(s.sessionId, `UPDATE ${T} SET NAME = 'x' WHERE ID = 1`);
    expect(r.session.pendingStatements).toBe(2);

    expect((await svc.rollbackSession(s.sessionId)).pendingStatements).toBe(0);
    expect(await count(T)).toBe(0);

    await ins(2);
    expect((await svc.commitSession(s.sessionId)).pendingStatements).toBe(0);
    expect(await count(T)).toBe(1);

    // DDL faz commit implícito do que estava pendente
    await ins(3);
    r = await svc.executeInSession(s.sessionId, `COMMENT ON TABLE ${T} IS 'validacao'`);
    expect(r.success).toBe(true);
    expect(r.session.pendingStatements).toBe(0);
    expect(await count(T)).toBe(2);

    await svc.closeSession(s.sessionId);
    await q(`DELETE FROM ${T}`);
  }, 60000);

  it('(c) cancelar consulta pesada interrompe na hora e mantém a sessão utilizável', async () => {
    const s = await svc.openSession(config, true);
    const started = Date.now();
    const pending = svc.executeInSession(
      s.sessionId,
      `SELECT COUNT(*) AS C FROM (SELECT LEVEL a FROM DUAL CONNECT BY LEVEL <= 3000) x, (SELECT LEVEL b FROM DUAL CONNECT BY LEVEL <= 3000) y WHERE REGEXP_LIKE(TO_CHAR(a*b), '^(1|2)+9$')`
    );
    await new Promise((r) => setTimeout(r, 1500));
    await svc.cancelSession(s.sessionId);
    const res = await pending;
    expect(Date.now() - started).toBeLessThan(10000);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ORA-01013/);
    const after = await svc.executeInSession(s.sessionId, 'SELECT 1 AS X FROM DUAL');
    expect(after.success).toBe(true);
    expect(after.session.running).toBe(false);
    await svc.closeSession(s.sessionId);
  }, 60000);

  it('(c2) cancelar PL/SQL em DBMS_SESSION.SLEEP: o erro ORA-01013 chega e a sessão segue utilizável', async () => {
    // O break do driver Thin pode só ser atendido quando o sleep termina (sem entrega OOB, ex.: NAT do Docker
    // Desktop). O teste não exige interrupção imediata, só que o cancelamento nunca deixe a sessão presa.
    const s = await svc.openSession(config, true);
    const started = Date.now();
    const pending = svc.executeInSession(s.sessionId, 'BEGIN DBMS_SESSION.SLEEP(8); END;');
    await new Promise((r) => setTimeout(r, 1000));
    await svc.cancelSession(s.sessionId);
    const res = await pending;
    console.info(`SLEEP cancelado após ${Date.now() - started} ms`);
    expect(Date.now() - started).toBeLessThan(20000);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/ORA-01013/);
    expect((await svc.executeInSession(s.sessionId, 'SELECT 1 AS X FROM DUAL')).success).toBe(true);
    await svc.closeSession(s.sessionId);
  }, 60000);

  it('(d) bloco PL/SQL anônimo e CREATE PROCEDURE mantêm o ponto-e-vírgula', async () => {
    const s = await svc.openSession(config, true);
    const anon = await svc.executeInSession(
      s.sessionId,
      `BEGIN INSERT INTO ${T} (ID, NAME) VALUES (10, 'plsql'); END;`
    );
    expect(anon.error).toBeUndefined();
    expect(anon.success).toBe(true);
    expect(await count(T)).toBe(1);

    const proc = await svc.executeInSession(
      s.sessionId,
      `CREATE OR REPLACE PROCEDURE ${PROC}(P_ID IN NUMBER) AS\nBEGIN\n  DELETE FROM ${T} WHERE ID = P_ID;\nEND;\n/`
    );
    expect(proc.error).toBeUndefined();
    expect(proc.success).toBe(true);
    const call = await svc.executeInSession(s.sessionId, `BEGIN ${PROC}(10); END;`);
    expect(call.success).toBe(true);
    expect(await count(T)).toBe(0);
    await svc.closeSession(s.sessionId);
  }, 60000);

  it('(f) Descrever tabela: colunas, PK, FK, índices e trigger; DDL via DBMS_METADATA', async () => {
    const t = await svc.getTableDetails(config, T);
    expect(t.error).toBeUndefined();
    expect(t.success).toBe(true);
    const id = t.columns.find((c) => c.name === 'ID');
    expect(id?.isPrimaryKey).toBe(true);
    expect(t.columns.find((c) => c.name === 'NAME')?.nullable).toBe(false);
    expect(t.columns.find((c) => c.name === 'QTY')?.type).toBe('NUMBER(10,2)');
    expect(t.constraints.some((c) => c.kind === 'PRIMARY KEY')).toBe(true);
    expect(t.indexes.some((i) => i.name === 'DM_VALIDATION_IDX')).toBe(true);
    expect(t.triggers.some((x) => x.name === 'DM_VALIDATION_TRG')).toBe(true);

    const child = await svc.getTableDetails(config, CHILD);
    const fk = child.constraints.find((c) => c.kind === 'FOREIGN KEY');
    expect(fk?.refTable).toContain(T);
    expect(fk?.refColumns).toEqual(['ID']);

    const ddl = await svc.getObjectDdl(config, 'TABLE', T);
    expect(ddl.error).toBeUndefined();
    expect(ddl.ddl).toMatch(/CREATE TABLE/i);

    const missing = await svc.getTableDetails(config, 'DM_VALIDATION_NAO_EXISTE');
    expect(missing.success).toBe(false);

    const objs = await svc.listObjects(config);
    expect(objs.some((o) => o.name === T && o.type === 'TABLE')).toBe(true);
  }, 60000);

  it('(g) plano em árvore bate com o texto cru do DBMS_XPLAN', async () => {
    const res = await svc.explainPlan(config, `SELECT * FROM ${T} t JOIN ${CHILD} c ON c.T_ID = t.ID WHERE t.NAME = 'x'`);
    expect(res.error).toBeUndefined();
    expect(res.success).toBe(true);
    const plan = parseExplainPlan(res.planLines);
    expect(plan).not.toBeNull();
    expect(plan?.kind).toBe('oracle');
    const ops = plan!.nodes.map((n) => n.operation).join('\n');
    expect(ops).toMatch(/SELECT STATEMENT/);
    const raw = res.planLines.join('\n');
    for (const n of plan!.nodes) {
      if (n.object) expect(raw).toContain(n.object);
    }
    expect(plan!.nodes.length).toBeGreaterThan(2);
  }, 60000);

  it('(h) mutações do grid em auto-commit e em modo manual', async () => {
    // auto-commit (sem sessão)
    const i = await svc.insertRow(config, T, { ID: 20, NAME: 'grid' });
    expect(i.error).toBeUndefined();
    expect(i.affectedRows).toBe(1);
    const u = await svc.updateRow(config, T, { NAME: 'grid2' }, { ID: 20 });
    expect(u.affectedRows).toBe(1);
    expect((await q(`SELECT NAME FROM ${T} WHERE ID = 20`)).rows[0].NAME).toBe('grid2');
    const d = await svc.deleteRow(config, T, { ID: 20 });
    expect(d.affectedRows).toBe(1);

    // modo manual na sessão da aba
    const s = await svc.openSession(config, false);
    const sid = s.sessionId;
    expect((await svc.insertRow(config, T, { ID: 21, NAME: 'a' }, sid)).affectedRows).toBe(1);
    expect((await svc.updateRow(config, T, { NAME: 'b' }, { ID: 21 }, sid)).affectedRows).toBe(1);
    expect(svc.getSessionState(sid).pendingStatements).toBe(2);
    expect(await count(T)).toBe(0);
    await svc.rollbackSession(sid);
    expect(await count(T)).toBe(0);
    await svc.insertRow(config, T, { ID: 22, NAME: 'c' }, sid);
    await svc.commitSession(sid);
    expect(await count(T)).toBe(1);
    expect((await svc.deleteRow(config, T, { ID: 22 }, sid)).affectedRows).toBe(1);
    // WHERE que não casa: 0 linhas (a UI usa isso para acusar conflito)
    expect((await svc.updateRow(config, T, { NAME: 'z' }, { ID: 999 }, sid)).affectedRows).toBe(0);
    await svc.commitSession(sid);
    await svc.closeSession(sid);
  }, 60000);

  it('(i) duas sessões mantêm transações e resultados independentes', async () => {
    const a = await svc.openSession(config, false);
    const b = await svc.openSession(config, false);
    await svc.executeInSession(a.sessionId, `INSERT INTO ${T} (ID, NAME) VALUES (30, 'a')`);
    await svc.executeInSession(b.sessionId, `INSERT INTO ${T} (ID, NAME) VALUES (31, 'b')`);
    expect(svc.getSessionState(a.sessionId).pendingStatements).toBe(1);
    const ra = await svc.executeInSession(a.sessionId, `SELECT ID FROM ${T} ORDER BY ID`);
    const rb = await svc.executeInSession(b.sessionId, `SELECT ID FROM ${T} ORDER BY ID`);
    expect(ra.rows.map((r) => r.ID)).toEqual([30]);
    expect(rb.rows.map((r) => r.ID)).toEqual([31]);
    await svc.rollbackSession(a.sessionId);
    expect(svc.getSessionState(b.sessionId).pendingStatements).toBe(1);
    await svc.rollbackSession(b.sessionId);
    await svc.closeSession(a.sessionId);
    await svc.closeSession(b.sessionId);
  }, 60000);
});
