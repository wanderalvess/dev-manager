import { describe, expect, it } from 'vitest';
import {
  buildCreateTableDdl,
  formatOracleType,
  mapMysqlColumns,
  mapMysqlConstraints,
  mapMysqlIndexes,
  mapOracleColumns,
  mapOracleConstraints,
  mapOracleIndexes,
  mapOracleTriggers,
  mapPgColumns,
  mapPgConstraints,
  mapPgIndexes,
  splitQualifiedName
} from './databaseSchemaUtils';

describe('splitQualifiedName', () => {
  it('separa owner e nome, com ou sem aspas', () => {
    expect(splitQualifiedName('PCPEDC')).toEqual({ name: 'PCPEDC' });
    expect(splitQualifiedName('SCOTT.EMP')).toEqual({ owner: 'SCOTT', name: 'EMP' });
    expect(splitQualifiedName('"Public"."Users"')).toEqual({ owner: 'Public', name: 'Users' });
    expect(splitQualifiedName('  hr.jobs ')).toEqual({ owner: 'hr', name: 'jobs' });
  });
});

describe('formatOracleType', () => {
  it('formata tamanho, precisão e escala', () => {
    expect(formatOracleType({ DATA_TYPE: 'VARCHAR2', DATA_LENGTH: 30, CHAR_LENGTH: 30, CHAR_USED: 'B' })).toBe('VARCHAR2(30)');
    expect(formatOracleType({ DATA_TYPE: 'VARCHAR2', DATA_LENGTH: 120, CHAR_LENGTH: 30, CHAR_USED: 'C' })).toBe('VARCHAR2(30 CHAR)');
    expect(formatOracleType({ DATA_TYPE: 'NUMBER' })).toBe('NUMBER');
    expect(formatOracleType({ DATA_TYPE: 'NUMBER', DATA_PRECISION: 10, DATA_SCALE: 0 })).toBe('NUMBER(10)');
    expect(formatOracleType({ DATA_TYPE: 'NUMBER', DATA_PRECISION: 12, DATA_SCALE: 2 })).toBe('NUMBER(12,2)');
    expect(formatOracleType({ DATA_TYPE: 'NUMBER', DATA_SCALE: 2 })).toBe('NUMBER(*,2)');
    expect(formatOracleType({ DATA_TYPE: 'RAW', DATA_LENGTH: 16 })).toBe('RAW(16)');
    expect(formatOracleType({ DATA_TYPE: 'DATE', DATA_LENGTH: 7 })).toBe('DATE');
    expect(formatOracleType({ DATA_TYPE: 'TIMESTAMP(6)' })).toBe('TIMESTAMP(6)');
  });
});

describe('mapOracleColumns', () => {
  it('mapeia nulabilidade, default, comentário e chave primária', () => {
    const cols = mapOracleColumns(
      [
        { COLUMN_ID: 1, COLUMN_NAME: 'NUMPED', DATA_TYPE: 'NUMBER', DATA_PRECISION: 10, DATA_SCALE: 0, NULLABLE: 'N', COMMENTS: 'Número do pedido' },
        { COLUMN_ID: 2, COLUMN_NAME: 'STATUS', DATA_TYPE: 'VARCHAR2', CHAR_LENGTH: 1, CHAR_USED: 'B', NULLABLE: 'Y', DATA_DEFAULT: " 'A' " }
      ],
      new Set(['NUMPED'])
    );
    expect(cols[0]).toMatchObject({ name: 'NUMPED', type: 'NUMBER(10)', nullable: false, isPrimaryKey: true, comment: 'Número do pedido' });
    expect(cols[1]).toMatchObject({ name: 'STATUS', nullable: true, isPrimaryKey: false, defaultValue: "'A'" });
  });
});

describe('mapOracleConstraints', () => {
  const cons = [
    { CONSTRAINT_NAME: 'PCPEDC_FK', CONSTRAINT_TYPE: 'R', DELETE_RULE: 'CASCADE', STATUS: 'ENABLED', GENERATED: 'USER NAME' },
    { CONSTRAINT_NAME: 'PCPEDC_CK', CONSTRAINT_TYPE: 'C', SEARCH_CONDITION: 'VLTOTAL >= 0', STATUS: 'ENABLED', GENERATED: 'USER NAME' },
    { CONSTRAINT_NAME: 'SYS_C001', CONSTRAINT_TYPE: 'C', SEARCH_CONDITION: '"NUMPED" IS NOT NULL', STATUS: 'ENABLED', GENERATED: 'GENERATED NAME' },
    { CONSTRAINT_NAME: 'PCPEDC_PK', CONSTRAINT_TYPE: 'P', STATUS: 'ENABLED', GENERATED: 'USER NAME' },
    { CONSTRAINT_NAME: 'PCPEDC_UK', CONSTRAINT_TYPE: 'U', STATUS: 'DISABLED', GENERATED: 'USER NAME' }
  ];
  const cols = [
    { CONSTRAINT_NAME: 'PCPEDC_PK', COLUMN_NAME: 'NUMPED', POSITION: 1 },
    { CONSTRAINT_NAME: 'PCPEDC_FK', COLUMN_NAME: 'CODCLI', POSITION: 1 },
    { CONSTRAINT_NAME: 'PCPEDC_UK', COLUMN_NAME: 'B', POSITION: 2 },
    { CONSTRAINT_NAME: 'PCPEDC_UK', COLUMN_NAME: 'A', POSITION: 1 }
  ];
  const refs = [{ CONSTRAINT_NAME: 'PCPEDC_FK', R_OWNER: 'WINT', R_TABLE: 'PCCLIENT', COLUMN_NAME: 'CODCLI', POSITION: 1 }];

  it('ordena PK, FK, UNIQUE, CHECK e esconde o NOT NULL gerado', () => {
    const result = mapOracleConstraints(cons, cols, refs);
    expect(result.map((c) => c.name)).toEqual(['PCPEDC_PK', 'PCPEDC_FK', 'PCPEDC_UK', 'PCPEDC_CK']);
    expect(result.some((c) => c.name === 'SYS_C001')).toBe(false);
  });

  it('FK traz a tabela referenciada e a regra de exclusão; UNIQUE respeita a posição das colunas', () => {
    const result = mapOracleConstraints(cons, cols, refs);
    const fk = result.find((c) => c.name === 'PCPEDC_FK')!;
    expect(fk).toMatchObject({ kind: 'FOREIGN KEY', refTable: 'WINT.PCCLIENT', refColumns: ['CODCLI'], onDelete: 'CASCADE' });
    expect(result.find((c) => c.name === 'PCPEDC_UK')).toMatchObject({ columns: ['A', 'B'], status: 'DISABLED' });
    expect(result.find((c) => c.name === 'PCPEDC_CK')?.condition).toBe('VLTOTAL >= 0');
  });

  it('mantém um CHECK de NOT NULL com nome dado pelo usuário', () => {
    const named = [{ CONSTRAINT_NAME: 'NN_PED', CONSTRAINT_TYPE: 'C', SEARCH_CONDITION: 'NUMPED IS NOT NULL', GENERATED: 'USER NAME' }];
    expect(mapOracleConstraints(named, [], [])).toHaveLength(1);
  });
});

describe('mapOracleIndexes', () => {
  it('agrupa colunas por posição e marca DESC e unicidade', () => {
    const result = mapOracleIndexes([
      { INDEX_NAME: 'IX_A', UNIQUENESS: 'NONUNIQUE', INDEX_TYPE: 'NORMAL', STATUS: 'VALID', COLUMN_NAME: 'B', COLUMN_POSITION: 2, DESCEND: 'ASC' },
      { INDEX_NAME: 'IX_A', UNIQUENESS: 'NONUNIQUE', INDEX_TYPE: 'NORMAL', STATUS: 'VALID', COLUMN_NAME: 'A', COLUMN_POSITION: 1, DESCEND: 'DESC' },
      { INDEX_NAME: 'UX_B', UNIQUENESS: 'UNIQUE', INDEX_TYPE: 'NORMAL', STATUS: 'VALID', COLUMN_NAME: 'C', COLUMN_POSITION: 1, DESCEND: 'ASC' }
    ]);
    expect(result).toEqual([
      { name: 'IX_A', unique: false, type: 'NORMAL', status: 'VALID', columns: ['A DESC', 'B'] },
      { name: 'UX_B', unique: true, type: 'NORMAL', status: 'VALID', columns: ['C'] }
    ]);
  });
});

describe('mapOracleTriggers', () => {
  it('mapeia evento, momento e status', () => {
    expect(mapOracleTriggers([{ TRIGGER_NAME: 'TRG_X', TRIGGERING_EVENT: 'INSERT OR UPDATE ', TRIGGER_TYPE: 'BEFORE EACH ROW', STATUS: 'ENABLED' }])).toEqual([
      { name: 'TRG_X', event: 'INSERT OR UPDATE', timing: 'BEFORE EACH ROW', status: 'ENABLED' }
    ]);
  });
});

describe('PostgreSQL', () => {
  it('colunas: tipo formatado, nulabilidade booleana ou textual, default e PK', () => {
    const cols = mapPgColumns(
      [
        { attnum: 1, attname: 'id', type: 'integer', nullable: false, default_value: "nextval('t_id_seq'::regclass)" },
        { attnum: 2, attname: 'email', type: 'text', nullable: 't', comment: 'login' }
      ],
      new Set(['id'])
    );
    expect(cols[0]).toMatchObject({ name: 'id', type: 'integer', nullable: false, isPrimaryKey: true });
    expect(cols[1]).toMatchObject({ nullable: true, comment: 'login', isPrimaryKey: false });
  });

  it('constraints: tipo pelo contype, colunas e definição, PK primeiro', () => {
    const result = mapPgConstraints([
      { conname: 'chk', contype: 'c', columns: 'age', definition: 'CHECK ((age > 0))' },
      { conname: 'fk_u', contype: 'f', columns: 'user_id', ref_table: 'public.users', ref_columns: 'id', definition: 'FOREIGN KEY (user_id) REFERENCES users(id)' },
      { conname: 'pk', contype: 'p', columns: 'id, tenant', definition: 'PRIMARY KEY (id, tenant)' }
    ]);
    expect(result.map((c) => c.kind)).toEqual(['PRIMARY KEY', 'FOREIGN KEY', 'CHECK']);
    expect(result[0].columns).toEqual(['id', 'tenant']);
    expect(result[1]).toMatchObject({ refTable: 'public.users', refColumns: ['id'] });
  });

  it('índices: unicidade, primário e colunas', () => {
    expect(mapPgIndexes([{ name: 'ix', indisunique: 't', indisprimary: 'f', method: 'btree', columns: 'a, b', definition: 'CREATE INDEX ...' }])).toEqual([
      { name: 'ix', unique: true, primary: false, type: 'btree', columns: ['a', 'b'], definition: 'CREATE INDEX ...' }
    ]);
  });
});

describe('MySQL', () => {
  it('colunas e índices', () => {
    expect(mapMysqlColumns([{ ORDINAL_POSITION: 1, COLUMN_NAME: 'id', COLUMN_TYPE: 'int(11)', IS_NULLABLE: 'NO', COLUMN_KEY: 'PRI' }])[0]).toMatchObject({
      name: 'id',
      type: 'int(11)',
      nullable: false,
      isPrimaryKey: true
    });
    const idx = mapMysqlIndexes([
      { INDEX_NAME: 'PRIMARY', NON_UNIQUE: 0, SEQ_IN_INDEX: 1, COLUMN_NAME: 'id', INDEX_TYPE: 'BTREE' },
      { INDEX_NAME: 'ix', NON_UNIQUE: 1, SEQ_IN_INDEX: 2, COLUMN_NAME: 'b', INDEX_TYPE: 'BTREE' },
      { INDEX_NAME: 'ix', NON_UNIQUE: 1, SEQ_IN_INDEX: 1, COLUMN_NAME: 'a', INDEX_TYPE: 'BTREE' }
    ]);
    expect(idx[0]).toMatchObject({ name: 'PRIMARY', unique: true, primary: true });
    expect(idx[1]).toMatchObject({ name: 'ix', unique: false, columns: ['a', 'b'] });
  });

  it('constraints com FK referenciando outra tabela', () => {
    const result = mapMysqlConstraints(
      [
        { CONSTRAINT_NAME: 'fk', CONSTRAINT_TYPE: 'FOREIGN KEY', DELETE_RULE: 'CASCADE' },
        { CONSTRAINT_NAME: 'PRIMARY', CONSTRAINT_TYPE: 'PRIMARY KEY' }
      ],
      [
        { CONSTRAINT_NAME: 'fk', COLUMN_NAME: 'u', ORDINAL_POSITION: 1, REFERENCED_TABLE_SCHEMA: 'app', REFERENCED_TABLE_NAME: 'users', REFERENCED_COLUMN_NAME: 'id' },
        { CONSTRAINT_NAME: 'PRIMARY', COLUMN_NAME: 'id', ORDINAL_POSITION: 1 }
      ]
    );
    expect(result.map((c) => c.kind)).toEqual(['PRIMARY KEY', 'FOREIGN KEY']);
    expect(result[1]).toMatchObject({ refTable: 'app.users', refColumns: ['id'], onDelete: 'CASCADE' });
  });
});

describe('buildCreateTableDdl', () => {
  it('monta CREATE TABLE com NOT NULL, default, constraints, índices e comentários', () => {
    const ddl = buildCreateTableDdl({
      name: 'users',
      owner: 'public',
      comment: "Usuários do sistema",
      columns: [
        { position: 1, name: 'id', type: 'integer', nullable: false, defaultValue: "nextval('s')", isPrimaryKey: true },
        { position: 2, name: 'Email', type: 'text', nullable: true, comment: "e-mail do usuário", isPrimaryKey: false }
      ],
      constraints: [{ name: 'users_pkey', kind: 'PRIMARY KEY', columns: ['id'], definition: 'PRIMARY KEY (id)' }],
      indexes: [
        { name: 'users_pkey', unique: true, primary: true, columns: ['id'], definition: 'CREATE UNIQUE INDEX users_pkey ON public.users (id)' },
        { name: 'ix_email', unique: false, columns: ['Email'], definition: 'CREATE INDEX ix_email ON public.users (email)' }
      ]
    });
    expect(ddl).toContain('CREATE TABLE public.users (');
    expect(ddl).toContain("  id integer DEFAULT nextval('s') NOT NULL,");
    expect(ddl).toContain('  "Email" text,');
    expect(ddl).toContain('CONSTRAINT users_pkey PRIMARY KEY (id)');
    expect(ddl).toContain('CREATE INDEX ix_email ON public.users (email);');
    expect(ddl).not.toContain('CREATE UNIQUE INDEX users_pkey');
    expect(ddl).toContain("COMMENT ON TABLE public.users IS 'Usuários do sistema';");
    expect(ddl).toContain('COMMENT ON COLUMN public.users."Email" IS \'e-mail do usuário\';');
  });
});
