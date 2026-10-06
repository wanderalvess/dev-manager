import { describe, expect, it, vi } from 'vitest';
import type { DatabaseConnectionConfig, QueryResult } from '../../../shared/types';
import type { DatabaseContext } from './databaseContext';
import { getObjectDdl, getTableDetails, listObjects } from './databaseSchemaInfo';

const cfg = (type: DatabaseConnectionConfig['type']): DatabaseConnectionConfig => ({
  id: 'c',
  name: 'c',
  type,
  host: 'h',
  port: 1,
  database: 'd',
  user: 'u'
});

const ok = (rows: Record<string, any>[]): QueryResult => ({
  success: true,
  columns: rows[0] ? Object.keys(rows[0]) : [],
  rows,
  rowCount: rows.length,
  executionTimeMs: 1,
  isQuery: true
});

/** Contexto simulado: cada `when` casa um trecho do SQL e devolve as linhas do catálogo. */
function makeCtx(responders: Array<{ when: string; rows: Record<string, any>[] }>) {
  const executeQuery = vi.fn().mockImplementation(async (_cfg: unknown, sql: string) => {
    const hit = responders.find((r) => sql.includes(r.when));
    return ok(hit ? hit.rows : []);
  });
  const ctx = {
    resolveConnectionConfig: (c: DatabaseConnectionConfig) => c,
    executeQuery,
    formatErrorMessage: async (e: any) => e.message
  } as unknown as DatabaseContext;
  return { ctx, executeQuery };
}

const oracleResponders = [
  { when: 'FROM ALL_OBJECTS', rows: [{ OWNER: 'WINT', OBJECT_TYPE: 'TABLE', COMMENTS: 'Pedidos', NUM_ROWS: 1500, LAST_ANALYZED: '2026-01-01' }] },
  {
    when: 'FROM ALL_TAB_COLS',
    rows: [
      { COLUMN_ID: 1, COLUMN_NAME: 'NUMPED', DATA_TYPE: 'NUMBER', DATA_PRECISION: 10, DATA_SCALE: 0, NULLABLE: 'N' },
      { COLUMN_ID: 2, COLUMN_NAME: 'CODCLI', DATA_TYPE: 'NUMBER', DATA_PRECISION: 6, DATA_SCALE: 0, NULLABLE: 'Y' }
    ]
  },
  {
    when: 'FROM ALL_CONSTRAINTS\n        WHERE OWNER',
    rows: [
      { CONSTRAINT_NAME: 'PCPEDC_PK', CONSTRAINT_TYPE: 'P', STATUS: 'ENABLED', GENERATED: 'USER NAME' },
      { CONSTRAINT_NAME: 'PCPEDC_FK', CONSTRAINT_TYPE: 'R', DELETE_RULE: 'NO ACTION', STATUS: 'ENABLED', GENERATED: 'USER NAME' }
    ]
  },
  {
    when: 'FROM ALL_CONS_COLUMNS',
    rows: [
      { CONSTRAINT_NAME: 'PCPEDC_PK', COLUMN_NAME: 'NUMPED', POSITION: 1 },
      { CONSTRAINT_NAME: 'PCPEDC_FK', COLUMN_NAME: 'CODCLI', POSITION: 1 }
    ]
  },
  { when: 'JOIN ALL_CONSTRAINTS rc', rows: [{ CONSTRAINT_NAME: 'PCPEDC_FK', R_OWNER: 'WINT', R_TABLE: 'PCCLIENT', COLUMN_NAME: 'CODCLI', POSITION: 1 }] },
  { when: 'FROM ALL_INDEXES', rows: [{ INDEX_NAME: 'IX_CLI', UNIQUENESS: 'NONUNIQUE', INDEX_TYPE: 'NORMAL', STATUS: 'VALID', COLUMN_NAME: 'CODCLI', COLUMN_POSITION: 1, DESCEND: 'ASC' }] },
  { when: 'FROM ALL_TRIGGERS', rows: [{ TRIGGER_NAME: 'TRG_PED', TRIGGERING_EVENT: 'INSERT', TRIGGER_TYPE: 'BEFORE EACH ROW', STATUS: 'ENABLED' }] }
];

describe('getTableDetails (Oracle)', () => {
  it('monta a especificação completa com PK, FK, índice e trigger', async () => {
    const { ctx } = makeCtx(oracleResponders);
    const d = await getTableDetails(ctx, cfg('oracle'), 'pcpedc');

    expect(d.success).toBe(true);
    expect(d).toMatchObject({ name: 'PCPEDC', owner: 'WINT', objectType: 'TABLE', comment: 'Pedidos', rowCountEstimate: 1500 });
    expect(d.columns.map((c) => [c.name, c.type, c.nullable, c.isPrimaryKey])).toEqual([
      ['NUMPED', 'NUMBER(10)', false, true],
      ['CODCLI', 'NUMBER(6)', true, false]
    ]);
    expect(d.constraints.map((c) => [c.name, c.kind])).toEqual([
      ['PCPEDC_PK', 'PRIMARY KEY'],
      ['PCPEDC_FK', 'FOREIGN KEY']
    ]);
    expect(d.constraints[1]).toMatchObject({ refTable: 'WINT.PCCLIENT', refColumns: ['CODCLI'], columns: ['CODCLI'] });
    expect(d.indexes[0]).toMatchObject({ name: 'IX_CLI', unique: false, columns: ['CODCLI'] });
    expect(d.triggers[0]).toMatchObject({ name: 'TRG_PED', event: 'INSERT', timing: 'BEFORE EACH ROW' });
  });

  it('sem owner usa o schema atual; com owner, usa bind em maiúsculas', async () => {
    const plain = makeCtx(oracleResponders);
    await getTableDetails(plain.ctx, cfg('oracle'), 'pcpedc');
    const plainSql = plain.executeQuery.mock.calls.map((c) => String(c[1]));
    expect(plainSql.every((s) => s.includes("SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')"))).toBe(true);
    expect(plain.executeQuery.mock.calls[0][3]).toEqual({ t: 'PCPEDC' });

    const owned = makeCtx(oracleResponders);
    await getTableDetails(owned.ctx, cfg('oracle'), 'wint.pcpedc');
    expect(owned.executeQuery.mock.calls[0][3]).toEqual({ o: 'WINT', t: 'PCPEDC' });
    expect(String(owned.executeQuery.mock.calls[0][1])).not.toContain('SYS_CONTEXT');
  });

  it('tabela inexistente devolve erro claro, sem lançar', async () => {
    const { ctx } = makeCtx([]);
    const d = await getTableDetails(ctx, cfg('oracle'), 'NAOEXISTE');
    expect(d.success).toBe(false);
    expect(d.error).toMatch(/não encontrada/);
  });

  it('rejeita nome inválido antes de consultar o banco', async () => {
    const { ctx, executeQuery } = makeCtx(oracleResponders);
    const d = await getTableDetails(ctx, cfg('oracle'), 'T; DROP TABLE X');
    expect(d.success).toBe(false);
    expect(d.error).toMatch(/inválido/);
    expect(executeQuery).not.toHaveBeenCalled();
  });

  it('erro do banco vira resultado com mensagem formatada', async () => {
    const { ctx, executeQuery } = makeCtx([]);
    executeQuery.mockResolvedValue({ success: false, error: 'ORA-00942: tabela inexistente', columns: [], rows: [], rowCount: 0, executionTimeMs: 1, isQuery: false });
    const d = await getTableDetails(ctx, cfg('oracle'), 'PCPEDC');
    expect(d.success).toBe(false);
    expect(d.error).toContain('ORA-00942');
  });
});

describe('getTableDetails (PostgreSQL e MySQL)', () => {
  it('PostgreSQL: usa regclass com nome entre aspas e deduz momento/evento da trigger', async () => {
    const { ctx, executeQuery } = makeCtx([
      { when: 'FROM pg_class c WHERE', rows: [{ relkind: 'r', comment: 'Usuários', reltuples: 42 }] },
      { when: 'FROM pg_attribute a', rows: [{ attnum: 1, attname: 'id', type: 'integer', nullable: false }] },
      { when: 'FROM pg_constraint c', rows: [{ conname: 'users_pkey', contype: 'p', columns: 'id', definition: 'PRIMARY KEY (id)', convalidated: true }] },
      { when: 'FROM pg_index ix', rows: [{ name: 'users_pkey', indisunique: true, indisprimary: true, method: 'btree', columns: 'id', definition: 'CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)' }] },
      { when: 'FROM pg_trigger t', rows: [{ tgname: 'trg_audit', enabled: 'O', definition: 'CREATE TRIGGER trg_audit AFTER INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION audit()' }] }
    ]);
    const d = await getTableDetails(ctx, cfg('postgres'), 'public.users');

    expect(executeQuery.mock.calls[0][3]).toEqual({ t: '"public"."users"' });
    expect(d).toMatchObject({ success: true, objectType: 'TABLE', comment: 'Usuários', rowCountEstimate: 42 });
    expect(d.columns[0]).toMatchObject({ name: 'id', isPrimaryKey: true });
    expect(d.triggers[0]).toMatchObject({ name: 'trg_audit', timing: 'AFTER', event: 'INSERT OR UPDATE', status: 'ENABLED' });
  });

  it('PostgreSQL: reltuples -1 (nunca analisada) não vira estimativa', async () => {
    const { ctx } = makeCtx([
      { when: 'FROM pg_class c WHERE', rows: [{ relkind: 'v', reltuples: -1 }] },
      { when: 'FROM pg_attribute a', rows: [{ attnum: 1, attname: 'x', type: 'text', nullable: true }] }
    ]);
    const d = await getTableDetails(ctx, cfg('postgres'), 'public.v');
    expect(d.objectType).toBe('VIEW');
    expect(d.rowCountEstimate).toBeUndefined();
  });

  it('MySQL: lê o catálogo information_schema e marca a PK', async () => {
    const { ctx } = makeCtx([
      { when: 'information_schema.TABLES', rows: [{ TABLE_TYPE: 'BASE TABLE', TABLE_COMMENT: '', TABLE_ROWS: 10 }] },
      { when: 'information_schema.COLUMNS', rows: [{ ORDINAL_POSITION: 1, COLUMN_NAME: 'id', COLUMN_TYPE: 'int(11)', IS_NULLABLE: 'NO', COLUMN_KEY: 'PRI' }] }
    ]);
    const d = await getTableDetails(ctx, cfg('mysql'), 'users');
    expect(d.success).toBe(true);
    expect(d.columns[0]).toMatchObject({ name: 'id', type: 'int(11)', isPrimaryKey: true });
    expect(d.rowCountEstimate).toBe(10);
  });
});

describe('getObjectDdl', () => {
  it('Oracle: PACKAGE junta especificação e corpo; sem corpo não é erro', async () => {
    const calls: string[] = [];
    const { ctx, executeQuery } = makeCtx([]);
    executeQuery.mockImplementation(async (_c: unknown, sql: string, _m: number, binds: any) => {
      calls.push(binds.ty);
      if (binds.ty === 'PACKAGE') return ok([{ DDL: '  CREATE PACKAGE pkg AS END;  ' }]);
      if (binds.ty === 'PACKAGE_BODY') return ok([{ DDL: 'CREATE PACKAGE BODY pkg AS END;' }]);
      return ok([]);
    });
    const res = await getObjectDdl(ctx, cfg('oracle'), 'PACKAGE', 'pkg');
    expect(calls).toEqual(['PACKAGE', 'PACKAGE_BODY']);
    expect(res.ddl).toBe('CREATE PACKAGE pkg AS END;\n\n/\n\nCREATE PACKAGE BODY pkg AS END;');

    executeQuery.mockImplementation(async (_c: unknown, _s: string, _m: number, binds: any) =>
      binds.ty === 'PACKAGE'
        ? ok([{ DDL: 'CREATE PACKAGE pkg AS END;' }])
        : { success: false, error: 'ORA-31603', columns: [], rows: [], rowCount: 0, executionTimeMs: 1, isQuery: false }
    );
    expect((await getObjectDdl(ctx, cfg('oracle'), 'PACKAGE', 'pkg')).success).toBe(true);
  });

  it('Oracle: com owner passa o terceiro argumento do GET_DDL', async () => {
    const { ctx, executeQuery } = makeCtx([{ when: 'DBMS_METADATA', rows: [{ DDL: 'CREATE TABLE T (...)' }] }]);
    await getObjectDdl(ctx, cfg('oracle'), 'TABLE', 'wint.pcpedc');
    expect(String(executeQuery.mock.calls[0][1])).toContain('GET_DDL(:ty, :n, :o)');
    expect(executeQuery.mock.calls[0][3]).toEqual({ ty: 'TABLE', n: 'PCPEDC', o: 'WINT' });
  });

  it('MySQL: usa SHOW CREATE e pega a coluna "Create ..."', async () => {
    const { ctx, executeQuery } = makeCtx([{ when: 'SHOW CREATE TABLE', rows: [{ Table: 'users', 'Create Table': 'CREATE TABLE `users` (id int)' }] }]);
    const res = await getObjectDdl(ctx, cfg('mysql'), 'TABLE', 'users');
    expect(String(executeQuery.mock.calls[0][1])).toBe('SHOW CREATE TABLE `users`');
    expect(res.ddl).toBe('CREATE TABLE `users` (id int);');
  });

  it('PostgreSQL: tabela é reconstruída a partir da especificação', async () => {
    const { ctx } = makeCtx([
      { when: 'FROM pg_class c WHERE', rows: [{ relkind: 'r' }] },
      { when: 'FROM pg_attribute a', rows: [{ attnum: 1, attname: 'id', type: 'integer', nullable: false }] }
    ]);
    const res = await getObjectDdl(ctx, cfg('postgres'), 'TABLE', 'public.users');
    expect(res.success).toBe(true);
    expect(res.ddl).toContain('CREATE TABLE public.users (');
    expect(res.ddl).toContain('id integer NOT NULL');
  });

  it('rejeita nome inválido e tipo sem suporte', async () => {
    const { ctx } = makeCtx([]);
    expect((await getObjectDdl(ctx, cfg('oracle'), 'TABLE', 'x; drop')).success).toBe(false);
    expect((await getObjectDdl(ctx, cfg('postgres'), 'SEQUENCE', 'public.s')).error).toMatch(/não está disponível/);
  });
});

describe('listObjects', () => {
  it('Oracle: mapeia tipos e marca objetos inválidos', async () => {
    const { ctx } = makeCtx([
      {
        when: 'FROM USER_OBJECTS',
        rows: [
          { NAME: 'PCPEDC', TYPE: 'TABLE', STATUS: 'VALID' },
          { NAME: 'PKG_X', TYPE: 'PACKAGE', STATUS: 'INVALID' },
          { NAME: 'ESTRANHO', TYPE: 'JAVA CLASS', STATUS: 'VALID' }
        ]
      }
    ]);
    const objects = await listObjects(ctx, cfg('oracle'));
    expect(objects).toEqual([
      { name: 'PCPEDC', type: 'TABLE', status: 'VALID' },
      { name: 'PKG_X', type: 'PACKAGE', status: 'INVALID' }
    ]);
  });

  it('PostgreSQL e MySQL: usam as colunas name/type', async () => {
    const pg = makeCtx([{ when: 'pg_class', rows: [{ name: 'public.users', type: 'TABLE' }, { name: 'public.fn', type: 'FUNCTION' }] }]);
    expect((await listObjects(pg.ctx, cfg('postgres'))).map((o) => o.type)).toEqual(['TABLE', 'FUNCTION']);
    const my = makeCtx([{ when: 'information_schema.TABLES', rows: [{ name: 'u', type: 'VIEW' }] }]);
    expect((await listObjects(my.ctx, cfg('mysql')))[0]).toMatchObject({ name: 'u', type: 'VIEW' });
  });
});
