import type {
  DatabaseConnectionConfig,
  DbObjectInfo,
  DbObjectType,
  ObjectDdlResult,
  QueryResult,
  TableDetails
} from '../../../shared/types';
import { isValidSqlTableName } from '../../utils/security';
import {
  buildCreateTableDdl,
  mapMysqlColumns,
  mapMysqlConstraints,
  mapMysqlIndexes,
  mapMysqlTriggers,
  mapOracleColumns,
  mapOracleConstraints,
  mapOracleIndexes,
  mapOracleTriggers,
  mapPgColumns,
  mapPgConstraints,
  mapPgIndexes,
  mapPgTriggers,
  splitQualifiedName
} from '../../utils/databaseSchemaUtils';
import type { DatabaseContext } from './databaseContext';

const MAX_ROWS = 50000;

type Binds = Record<string, any>;
type Run = (sql: string, binds?: Binds) => Promise<Record<string, any>[]>;

function runner(ctx: DatabaseContext, config: DatabaseConnectionConfig): Run {
  return async (sql, binds) => {
    const res: QueryResult = await ctx.executeQuery(config, sql, MAX_ROWS, binds);
    if (!res.success) throw new Error(res.error || 'Falha ao consultar o catálogo do banco.');
    return res.rows ?? [];
  };
}

function emptyDetails(name: string, owner: string | undefined, error: string): TableDetails {
  return { success: false, error, name, owner, objectType: 'TABLE', columns: [], constraints: [], indexes: [], triggers: [] };
}

// ---------------------------------------------------------------------------
// Detalhes da tabela
// ---------------------------------------------------------------------------

async function oracleDetails(run: Run, owner: string | undefined, name: string): Promise<TableDetails> {
  // Sem owner: o schema atual da sessão
  const ownerSql = owner ? ':o' : "SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA')";
  const binds: Binds = owner ? { o: owner.toUpperCase(), t: name.toUpperCase() } : { t: name.toUpperCase() };

  const [meta, colRows, consRows, consColRows, refRows, idxRows, trgRows] = await Promise.all([
    run(
      `SELECT o.OWNER, o.OBJECT_TYPE, tc.COMMENTS, t.NUM_ROWS, t.LAST_ANALYZED
         FROM ALL_OBJECTS o
         LEFT JOIN ALL_TAB_COMMENTS tc ON tc.OWNER = o.OWNER AND tc.TABLE_NAME = o.OBJECT_NAME
         LEFT JOIN ALL_TABLES t ON t.OWNER = o.OWNER AND t.TABLE_NAME = o.OBJECT_NAME
        WHERE o.OWNER = ${ownerSql} AND o.OBJECT_NAME = :t AND o.OBJECT_TYPE IN ('TABLE', 'VIEW', 'MATERIALIZED VIEW')`,
      binds
    ),
    run(
      `SELECT c.COLUMN_ID, c.COLUMN_NAME, c.DATA_TYPE, c.DATA_LENGTH, c.CHAR_LENGTH, c.CHAR_USED,
              c.DATA_PRECISION, c.DATA_SCALE, c.NULLABLE, c.DATA_DEFAULT, cc.COMMENTS
         FROM ALL_TAB_COLS c
         LEFT JOIN ALL_COL_COMMENTS cc ON cc.OWNER = c.OWNER AND cc.TABLE_NAME = c.TABLE_NAME AND cc.COLUMN_NAME = c.COLUMN_NAME
        WHERE c.OWNER = ${ownerSql} AND c.TABLE_NAME = :t AND c.HIDDEN_COLUMN = 'NO'
        ORDER BY c.COLUMN_ID`,
      binds
    ),
    run(
      `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE, SEARCH_CONDITION, DELETE_RULE, STATUS, GENERATED
         FROM ALL_CONSTRAINTS
        WHERE OWNER = ${ownerSql} AND TABLE_NAME = :t AND CONSTRAINT_TYPE IN ('P', 'U', 'R', 'C')`,
      binds
    ),
    run(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, POSITION
         FROM ALL_CONS_COLUMNS
        WHERE OWNER = ${ownerSql} AND TABLE_NAME = :t
        ORDER BY CONSTRAINT_NAME, POSITION`,
      binds
    ),
    run(
      `SELECT con.CONSTRAINT_NAME, rc.OWNER AS R_OWNER, rc.TABLE_NAME AS R_TABLE, rcc.COLUMN_NAME, rcc.POSITION
         FROM ALL_CONSTRAINTS con
         JOIN ALL_CONSTRAINTS rc ON rc.OWNER = con.R_OWNER AND rc.CONSTRAINT_NAME = con.R_CONSTRAINT_NAME
         JOIN ALL_CONS_COLUMNS rcc ON rcc.OWNER = rc.OWNER AND rcc.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
        WHERE con.OWNER = ${ownerSql} AND con.TABLE_NAME = :t AND con.CONSTRAINT_TYPE = 'R'
        ORDER BY con.CONSTRAINT_NAME, rcc.POSITION`,
      binds
    ),
    run(
      `SELECT i.INDEX_NAME, i.UNIQUENESS, i.INDEX_TYPE, i.STATUS, ic.COLUMN_NAME, ic.COLUMN_POSITION, ic.DESCEND
         FROM ALL_INDEXES i
         JOIN ALL_IND_COLUMNS ic ON ic.INDEX_OWNER = i.OWNER AND ic.INDEX_NAME = i.INDEX_NAME
        WHERE i.TABLE_OWNER = ${ownerSql} AND i.TABLE_NAME = :t
        ORDER BY i.INDEX_NAME, ic.COLUMN_POSITION`,
      binds
    ),
    run(
      `SELECT TRIGGER_NAME, TRIGGERING_EVENT, TRIGGER_TYPE, STATUS
         FROM ALL_TRIGGERS
        WHERE TABLE_OWNER = ${ownerSql} AND TABLE_NAME = :t
        ORDER BY TRIGGER_NAME`,
      binds
    )
  ]);

  if (colRows.length === 0) {
    throw new Error(`Tabela ou view "${owner ? `${owner}.` : ''}${name}" não encontrada (ou sem permissão de leitura no catálogo).`);
  }

  const constraints = mapOracleConstraints(consRows, consColRows, refRows);
  const pkColumns = new Set(constraints.find((c) => c.kind === 'PRIMARY KEY')?.columns ?? []);
  const info = meta[0] ?? {};

  return {
    success: true,
    name: name.toUpperCase(),
    owner: info.OWNER ? String(info.OWNER) : owner?.toUpperCase(),
    objectType: info.OBJECT_TYPE ? String(info.OBJECT_TYPE) : 'TABLE',
    comment: info.COMMENTS ? String(info.COMMENTS) : undefined,
    rowCountEstimate: info.NUM_ROWS !== null && info.NUM_ROWS !== undefined ? Number(info.NUM_ROWS) : undefined,
    lastAnalyzed: info.LAST_ANALYZED ? String(info.LAST_ANALYZED) : undefined,
    columns: mapOracleColumns(colRows, pkColumns),
    constraints,
    indexes: mapOracleIndexes(idxRows),
    triggers: mapOracleTriggers(trgRows)
  };
}

/** `BEFORE INSERT OR UPDATE ON ...` → { timing: 'BEFORE', event: 'INSERT OR UPDATE' } a partir do pg_get_triggerdef. */
function parsePgTriggerDef(definition: string): { timing?: string; event: string } {
  const m = /\b(BEFORE|AFTER|INSTEAD OF)\s+((?:INSERT|UPDATE|DELETE|TRUNCATE)(?:\s+OF\s+[^\s]+(?:\s*,\s*[^\s]+)*)?(?:\s+OR\s+(?:INSERT|UPDATE|DELETE|TRUNCATE)(?:\s+OF\s+[^\s]+(?:\s*,\s*[^\s]+)*)?)*)\s+ON\b/i.exec(definition);
  return m ? { timing: m[1].toUpperCase(), event: m[2].replace(/\s+/g, ' ').toUpperCase() } : { event: '' };
}

async function postgresDetails(run: Run, owner: string | undefined, name: string): Promise<TableDetails> {
  const qualified = owner ? `"${owner}"."${name}"` : `"${name}"`;
  const binds: Binds = { t: qualified };

  const [meta, colRows, consRows, idxRows, trgRows] = await Promise.all([
    run(
      `SELECT c.relkind, obj_description(c.oid, 'pg_class') AS comment, c.reltuples
         FROM pg_class c WHERE c.oid = CAST(:t AS regclass)`,
      binds
    ),
    run(
      `SELECT a.attnum, a.attname, format_type(a.atttypid, a.atttypmod) AS type, NOT a.attnotnull AS nullable,
              pg_get_expr(d.adbin, d.adrelid) AS default_value, col_description(a.attrelid, a.attnum) AS comment
         FROM pg_attribute a
         LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
        WHERE a.attrelid = CAST(:t AS regclass) AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY a.attnum`,
      binds
    ),
    run(
      `SELECT c.conname, c.contype, pg_get_constraintdef(c.oid) AS definition, c.convalidated,
              (SELECT string_agg(a.attname, ', ' ORDER BY k.ord)
                 FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
                 JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS columns,
              CASE WHEN c.contype = 'f' THEN CAST(CAST(c.confrelid AS regclass) AS text) END AS ref_table,
              (SELECT string_agg(a.attname, ', ' ORDER BY k.ord)
                 FROM unnest(c.confkey) WITH ORDINALITY AS k(attnum, ord)
                 JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.attnum) AS ref_columns
         FROM pg_constraint c
        WHERE c.conrelid = CAST(:t AS regclass)`,
      binds
    ),
    run(
      `SELECT ic.relname AS name, ix.indisunique, ix.indisprimary, am.amname AS method,
              pg_get_indexdef(ix.indexrelid) AS definition,
              (SELECT string_agg(pg_get_indexdef(ix.indexrelid, k.n, true), ', ' ORDER BY k.n)
                 FROM generate_series(1, ix.indnatts) AS k(n)) AS columns
         FROM pg_index ix
         JOIN pg_class ic ON ic.oid = ix.indexrelid
         JOIN pg_am am ON am.oid = ic.relam
        WHERE ix.indrelid = CAST(:t AS regclass)
        ORDER BY ic.relname`,
      binds
    ),
    run(
      `SELECT t.tgname, t.tgenabled AS enabled, pg_get_triggerdef(t.oid) AS definition
         FROM pg_trigger t
        WHERE t.tgrelid = CAST(:t AS regclass) AND NOT t.tgisinternal
        ORDER BY t.tgname`,
      binds
    )
  ]);

  const colsSql = colRows;
  const constraints = mapPgConstraints(consRows);
  const pkColumns = new Set(constraints.find((c) => c.kind === 'PRIMARY KEY')?.columns ?? []);
  const info = meta[0] ?? {};
  const relkind = String(info.relkind ?? 'r');
  const objectType = relkind === 'v' ? 'VIEW' : relkind === 'm' ? 'MATERIALIZED VIEW' : 'TABLE';
  const reltuples = info.reltuples !== null && info.reltuples !== undefined ? Number(info.reltuples) : undefined;

  const triggers = mapPgTriggers(
    trgRows.map((r) => ({ ...r, ...parsePgTriggerDef(String(r.definition ?? '')) }))
  );

  return {
    success: true,
    name,
    owner,
    objectType,
    comment: info.comment ? String(info.comment) : undefined,
    // reltuples = -1 quando a tabela nunca foi analisada
    rowCountEstimate: reltuples !== undefined && reltuples >= 0 ? Math.round(reltuples) : undefined,
    columns: mapPgColumns(colsSql, pkColumns),
    constraints,
    indexes: mapPgIndexes(idxRows),
    triggers
  };
}

async function mysqlDetails(run: Run, owner: string | undefined, name: string): Promise<TableDetails> {
  const binds: Binds = { o: owner ?? null, t: name };
  const schema = 'COALESCE(:o, DATABASE())';

  const [meta, colRows, consRows, usageRows, idxRows, trgRows] = await Promise.all([
    run(`SELECT TABLE_TYPE, TABLE_COMMENT, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA = ${schema} AND TABLE_NAME = :t`, binds),
    run(
      `SELECT ORDINAL_POSITION, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT, COLUMN_KEY
         FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ${schema} AND TABLE_NAME = :t ORDER BY ORDINAL_POSITION`,
      binds
    ),
    run(
      `SELECT tc.CONSTRAINT_NAME, tc.CONSTRAINT_TYPE, rc.DELETE_RULE
         FROM information_schema.TABLE_CONSTRAINTS tc
         LEFT JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
           ON rc.CONSTRAINT_SCHEMA = tc.CONSTRAINT_SCHEMA AND rc.CONSTRAINT_NAME = tc.CONSTRAINT_NAME AND rc.TABLE_NAME = tc.TABLE_NAME
        WHERE tc.TABLE_SCHEMA = ${schema} AND tc.TABLE_NAME = :t`,
      binds
    ),
    run(
      `SELECT CONSTRAINT_NAME, COLUMN_NAME, ORDINAL_POSITION, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
         FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ${schema} AND TABLE_NAME = :t`,
      binds
    ),
    run(
      `SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, INDEX_TYPE
         FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ${schema} AND TABLE_NAME = :t ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
      binds
    ),
    run(
      `SELECT TRIGGER_NAME, EVENT_MANIPULATION, ACTION_TIMING
         FROM information_schema.TRIGGERS WHERE EVENT_OBJECT_SCHEMA = ${schema} AND EVENT_OBJECT_TABLE = :t`,
      binds
    )
  ]);

  if (colRows.length === 0) {
    throw new Error(`Tabela ou view "${owner ? `${owner}.` : ''}${name}" não encontrada.`);
  }
  const info = meta[0] ?? {};
  return {
    success: true,
    name,
    owner,
    objectType: info.TABLE_TYPE === 'VIEW' ? 'VIEW' : 'TABLE',
    comment: info.TABLE_COMMENT ? String(info.TABLE_COMMENT) : undefined,
    rowCountEstimate: info.TABLE_ROWS !== null && info.TABLE_ROWS !== undefined ? Number(info.TABLE_ROWS) : undefined,
    columns: mapMysqlColumns(colRows),
    constraints: mapMysqlConstraints(consRows, usageRows),
    indexes: mapMysqlIndexes(idxRows),
    triggers: mapMysqlTriggers(trgRows)
  };
}

/** Especificação de uma tabela ou view: colunas, constraints (PK/FK/UNIQUE/CHECK), índices e triggers. */
export async function getTableDetails(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  tableName: string
): Promise<TableDetails> {
  const { owner, name } = splitQualifiedName(tableName);
  if (!isValidSqlTableName(owner ? `${owner}.${name}` : name)) {
    return emptyDetails(name, owner, `Nome de tabela inválido: "${tableName}".`);
  }
  const resolved = ctx.resolveConnectionConfig(config);
  const run = runner(ctx, resolved);
  try {
    switch (resolved.type) {
      case 'oracle':
        return await oracleDetails(run, owner, name);
      case 'postgres':
        return await postgresDetails(run, owner, name);
      case 'mysql':
        return await mysqlDetails(run, owner, name);
      default:
        return emptyDetails(name, owner, `Tipo de banco '${resolved.type}' não suportado.`);
    }
  } catch (err: any) {
    return emptyDetails(name, owner, await ctx.formatErrorMessage(err, resolved));
  }
}

// ---------------------------------------------------------------------------
// DDL
// ---------------------------------------------------------------------------

const ORACLE_METADATA_TYPE: Record<string, string> = {
  TABLE: 'TABLE',
  VIEW: 'VIEW',
  'MATERIALIZED VIEW': 'MATERIALIZED_VIEW',
  PROCEDURE: 'PROCEDURE',
  FUNCTION: 'FUNCTION',
  PACKAGE: 'PACKAGE',
  'PACKAGE BODY': 'PACKAGE_BODY',
  SEQUENCE: 'SEQUENCE',
  TRIGGER: 'TRIGGER',
  SYNONYM: 'SYNONYM',
  TYPE: 'TYPE',
  'TYPE BODY': 'TYPE_BODY',
  INDEX: 'INDEX'
};

async function oracleDdl(run: Run, objectType: string, owner: string | undefined, name: string): Promise<string> {
  const types = objectType === 'PACKAGE' ? ['PACKAGE', 'PACKAGE BODY'] : objectType === 'TYPE' ? ['TYPE', 'TYPE BODY'] : [objectType];
  const parts: string[] = [];
  for (const t of types) {
    const mdType = ORACLE_METADATA_TYPE[t];
    if (!mdType) throw new Error(`DDL de ${t} não suportado.`);
    try {
      const rows = owner
        ? await run('SELECT DBMS_METADATA.GET_DDL(:ty, :n, :o) AS DDL FROM DUAL', { ty: mdType, n: name.toUpperCase(), o: owner.toUpperCase() })
        : await run('SELECT DBMS_METADATA.GET_DDL(:ty, :n) AS DDL FROM DUAL', { ty: mdType, n: name.toUpperCase() });
      const ddl = rows[0]?.DDL;
      if (ddl) parts.push(String(ddl).trim());
    } catch (err) {
      // Pacote sem corpo (ou tipo sem corpo) não é erro: só não há o que mostrar
      if (t === 'PACKAGE BODY' || t === 'TYPE BODY') continue;
      throw err;
    }
  }
  if (parts.length === 0) throw new Error('O Oracle não devolveu o DDL deste objeto (sem permissão ou objeto inexistente).');
  return parts.join('\n\n/\n\n');
}

export async function getObjectDdl(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig,
  objectType: DbObjectType,
  objectName: string
): Promise<ObjectDdlResult> {
  const { owner, name } = splitQualifiedName(objectName);
  if (!isValidSqlTableName(owner ? `${owner}.${name}` : name)) {
    return { success: false, error: `Nome de objeto inválido: "${objectName}".` };
  }
  const resolved = ctx.resolveConnectionConfig(config);
  const run = runner(ctx, resolved);

  try {
    if (resolved.type === 'oracle') {
      return { success: true, ddl: await oracleDdl(run, objectType, owner, name) };
    }

    if (resolved.type === 'mysql') {
      const full = owner ? `\`${owner}\`.\`${name}\`` : `\`${name}\``;
      const verb = objectType === 'VIEW' ? 'VIEW' : objectType === 'PROCEDURE' ? 'PROCEDURE' : objectType === 'FUNCTION' ? 'FUNCTION' : objectType === 'TRIGGER' ? 'TRIGGER' : 'TABLE';
      const rows = await run(`SHOW CREATE ${verb} ${full}`);
      const keys = Object.keys(rows[0] ?? {});
      const body = rows[0] ? rows[0][keys.find((k) => /^Create |SQL Original Statement/i.test(k)) ?? keys[1]] : undefined;
      if (!body) throw new Error('O MySQL não devolveu o DDL deste objeto.');
      return { success: true, ddl: `${String(body).trim()};` };
    }

    // PostgreSQL
    if (objectType === 'TABLE') {
      const details = await getTableDetails(ctx, config, objectName);
      if (!details.success) return { success: false, error: details.error };
      return { success: true, ddl: buildCreateTableDdl(details) };
    }
    if (objectType === 'VIEW' || objectType === 'MATERIALIZED VIEW') {
      const qualified = owner ? `"${owner}"."${name}"` : `"${name}"`;
      const rows = await run('SELECT pg_get_viewdef(CAST(:t AS regclass), true) AS def', { t: qualified });
      const keyword = objectType === 'VIEW' ? 'CREATE OR REPLACE VIEW' : 'CREATE MATERIALIZED VIEW';
      return { success: true, ddl: `${keyword} ${owner ? `${owner}.` : ''}${name} AS\n${String(rows[0]?.def ?? '').trim()}` };
    }
    if (objectType === 'FUNCTION' || objectType === 'PROCEDURE') {
      const rows = await run(
        `SELECT pg_get_functiondef(p.oid) AS def
           FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
          WHERE p.proname = :n AND n.nspname = COALESCE(:o, current_schema())
          ORDER BY p.oid LIMIT 1`,
        { n: name, o: owner ?? null }
      );
      if (!rows[0]?.def) throw new Error('Função não encontrada.');
      return { success: true, ddl: String(rows[0].def).trim() };
    }
    return { success: false, error: `DDL de ${objectType} não está disponível para PostgreSQL.` };
  } catch (err: any) {
    return { success: false, error: await ctx.formatErrorMessage(err, resolved) };
  }
}

// ---------------------------------------------------------------------------
// Objetos do schema
// ---------------------------------------------------------------------------

const KNOWN_TYPES = new Set<string>([
  'TABLE', 'VIEW', 'MATERIALIZED VIEW', 'PROCEDURE', 'FUNCTION', 'PACKAGE', 'SEQUENCE', 'TRIGGER', 'SYNONYM', 'TYPE'
]);

/** Objetos do schema por tipo (tabelas, views, procedures, functions, packages, sequences, triggers...). */
export async function listObjects(
  ctx: DatabaseContext,
  config: DatabaseConnectionConfig
): Promise<DbObjectInfo[]> {
  const resolved = ctx.resolveConnectionConfig(config);
  const run = runner(ctx, resolved);

  let rows: Record<string, any>[] = [];
  if (resolved.type === 'oracle') {
    rows = await run(
      `SELECT OBJECT_NAME AS NAME, OBJECT_TYPE AS TYPE, STATUS
         FROM USER_OBJECTS
        WHERE OBJECT_TYPE IN ('TABLE','VIEW','MATERIALIZED VIEW','PROCEDURE','FUNCTION','PACKAGE','SEQUENCE','TRIGGER','SYNONYM','TYPE')
          AND OBJECT_NAME NOT LIKE 'BIN$%'
        ORDER BY OBJECT_TYPE, OBJECT_NAME`
    );
  } else if (resolved.type === 'postgres') {
    rows = await run(
      `SELECT n.nspname || '.' || c.relname AS name,
              CASE c.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'S' THEN 'SEQUENCE' ELSE 'TABLE' END AS type
         FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind IN ('r','p','v','m','S') AND n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'
       UNION ALL
       SELECT n.nspname || '.' || p.proname AS name, 'FUNCTION' AS type
         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname NOT IN ('pg_catalog','information_schema')
        ORDER BY 2, 1`
    );
  } else {
    rows = await run(
      `SELECT TABLE_NAME AS name, CASE WHEN TABLE_TYPE = 'VIEW' THEN 'VIEW' ELSE 'TABLE' END AS type
         FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()
       UNION ALL
       SELECT ROUTINE_NAME, ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE()
       UNION ALL
       SELECT TRIGGER_NAME, 'TRIGGER' FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE()
       ORDER BY 2, 1`
    );
  }

  const objects: DbObjectInfo[] = [];
  for (const r of rows) {
    const name = String(r.NAME ?? r.name);
    const type = String(r.TYPE ?? r.type).toUpperCase();
    if (!KNOWN_TYPES.has(type)) continue;
    const status = String(r.STATUS ?? r.status ?? '').toUpperCase();
    objects.push({ name, type: type as DbObjectType, status: status === 'INVALID' ? 'INVALID' : 'VALID' });
  }
  return objects;
}
