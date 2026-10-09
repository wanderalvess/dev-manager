import type {
  TableColumnDetail,
  TableConstraintDetail,
  TableConstraintKind,
  TableIndexDetail,
  TableTriggerDetail,
  TableDetails
} from '../../shared/types';

type Row = Record<string, any>;

/** Separa `OWNER.TABELA` / `schema.tabela` (aspas opcionais). Sem ponto, só o nome. */
export function splitQualifiedName(raw: string): { owner?: string; name: string } {
  const parts = raw
    .trim()
    .split('.')
    .map((p) => p.replace(/^"|"$/g, ''));
  if (parts.length >= 2) return { owner: parts[parts.length - 2], name: parts[parts.length - 1] };
  return { name: parts[0] };
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function text(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const s = String(value).trim();
  return s === '' ? undefined : s;
}

/** Agrupa linhas ordenadas por `key`, preservando a ordem de aparição. */
function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Oracle
// ---------------------------------------------------------------------------

export function formatOracleType(row: Row): string {
  const type = String(row.DATA_TYPE ?? '');
  const precision = toNumber(row.DATA_PRECISION);
  const scale = toNumber(row.DATA_SCALE);
  const length = toNumber(row.DATA_LENGTH);

  if (/^N?(VARCHAR2|CHAR)$/.test(type)) {
    const chars = toNumber(row.CHAR_LENGTH) ?? length;
    const unit = row.CHAR_USED === 'C' ? ' CHAR' : '';
    return `${type}(${chars}${unit})`;
  }
  if (type === 'NUMBER') {
    if (precision === undefined && scale === undefined) return 'NUMBER';
    if (precision === undefined) return `NUMBER(*,${scale})`;
    return scale ? `NUMBER(${precision},${scale})` : `NUMBER(${precision})`;
  }
  if (type === 'FLOAT' && precision !== undefined) return `FLOAT(${precision})`;
  if (type === 'RAW' && length !== undefined) return `RAW(${length})`;
  return type;
}

export function mapOracleColumns(rows: Row[], primaryKeyColumns: Set<string>): TableColumnDetail[] {
  return rows.map((r) => ({
    position: toNumber(r.COLUMN_ID) ?? 0,
    name: String(r.COLUMN_NAME),
    type: formatOracleType(r),
    nullable: r.NULLABLE !== 'N',
    defaultValue: text(r.DATA_DEFAULT),
    comment: text(r.COMMENTS),
    isPrimaryKey: primaryKeyColumns.has(String(r.COLUMN_NAME))
  }));
}

const ORACLE_CONSTRAINT_KIND: Record<string, TableConstraintKind> = {
  P: 'PRIMARY KEY',
  R: 'FOREIGN KEY',
  U: 'UNIQUE',
  C: 'CHECK'
};

/**
 * Junta constraints, suas colunas e (nas FKs) a tabela referenciada. Esconde os CHECK `X IS NOT NULL` com nome gerado
 * pelo Oracle: já aparecem como "não nulo" na coluna e só poluiriam a lista.
 */
export function mapOracleConstraints(consRows: Row[], colRows: Row[], refRows: Row[]): TableConstraintDetail[] {
  const columnsByName = groupBy(colRows, (r) => String(r.CONSTRAINT_NAME));
  const refsByName = groupBy(refRows, (r) => String(r.CONSTRAINT_NAME));

  const result: TableConstraintDetail[] = [];
  for (const c of consRows) {
    const condition = text(c.SEARCH_CONDITION);
    const isGeneratedNotNull =
      c.CONSTRAINT_TYPE === 'C' && c.GENERATED === 'GENERATED NAME' && !!condition && /\bIS NOT NULL\s*$/i.test(condition);
    if (isGeneratedNotNull) continue;

    const name = String(c.CONSTRAINT_NAME);
    const columns = (columnsByName.get(name) ?? [])
      .slice()
      .sort((a, b) => (toNumber(a.POSITION) ?? 0) - (toNumber(b.POSITION) ?? 0))
      .map((r) => String(r.COLUMN_NAME));
    const refs = (refsByName.get(name) ?? [])
      .slice()
      .sort((a, b) => (toNumber(a.POSITION) ?? 0) - (toNumber(b.POSITION) ?? 0));
    const kind = ORACLE_CONSTRAINT_KIND[String(c.CONSTRAINT_TYPE)] ?? 'OTHER';

    result.push({
      name,
      kind,
      columns,
      refTable: refs.length ? `${refs[0].R_OWNER}.${refs[0].R_TABLE}` : undefined,
      refColumns: refs.length ? refs.map((r) => String(r.COLUMN_NAME)) : undefined,
      onDelete: kind === 'FOREIGN KEY' ? text(c.DELETE_RULE) : undefined,
      condition: kind === 'CHECK' ? condition : undefined,
      status: text(c.STATUS)
    });
  }
  // PK primeiro, depois FK, UNIQUE, CHECK
  const order: Record<TableConstraintKind, number> = { 'PRIMARY KEY': 0, 'FOREIGN KEY': 1, UNIQUE: 2, CHECK: 3, OTHER: 4 };
  return result.sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
}

export function mapOracleIndexes(rows: Row[]): TableIndexDetail[] {
  const grouped = groupBy(rows, (r) => String(r.INDEX_NAME));
  return [...grouped.entries()].map(([name, list]) => {
    const sorted = list.slice().sort((a, b) => (toNumber(a.COLUMN_POSITION) ?? 0) - (toNumber(b.COLUMN_POSITION) ?? 0));
    return {
      name,
      unique: sorted[0].UNIQUENESS === 'UNIQUE',
      type: text(sorted[0].INDEX_TYPE),
      status: text(sorted[0].STATUS),
      columns: sorted.map((r) => (r.DESCEND === 'DESC' ? `${r.COLUMN_NAME} DESC` : String(r.COLUMN_NAME)))
    };
  });
}

export function mapOracleTriggers(rows: Row[]): TableTriggerDetail[] {
  return rows.map((r) => ({
    name: String(r.TRIGGER_NAME),
    event: String(r.TRIGGERING_EVENT ?? '').trim(),
    timing: text(r.TRIGGER_TYPE),
    status: text(r.STATUS)
  }));
}

// ---------------------------------------------------------------------------
// PostgreSQL
// ---------------------------------------------------------------------------

export function mapPgColumns(rows: Row[], primaryKeyColumns: Set<string>): TableColumnDetail[] {
  return rows.map((r) => ({
    position: toNumber(r.attnum) ?? 0,
    name: String(r.attname),
    type: String(r.type),
    nullable: r.nullable === true || r.nullable === 't' || r.nullable === 'true',
    defaultValue: text(r.default_value),
    comment: text(r.comment),
    isPrimaryKey: primaryKeyColumns.has(String(r.attname))
  }));
}

const PG_CONSTRAINT_KIND: Record<string, TableConstraintKind> = { p: 'PRIMARY KEY', f: 'FOREIGN KEY', u: 'UNIQUE', c: 'CHECK' };

/** Colunas vêm do array `conkey` já resolvido para nomes (`columns`, separados por vírgula). */
export function mapPgConstraints(rows: Row[]): TableConstraintDetail[] {
  const order: Record<TableConstraintKind, number> = { 'PRIMARY KEY': 0, 'FOREIGN KEY': 1, UNIQUE: 2, CHECK: 3, OTHER: 4 };
  return rows
    .map<TableConstraintDetail>((r) => {
      const kind = PG_CONSTRAINT_KIND[String(r.contype)] ?? 'OTHER';
      const columns = text(r.columns) ? String(r.columns).split(',').map((c) => c.trim()) : [];
      return {
        name: String(r.conname),
        kind,
        columns,
        refTable: text(r.ref_table),
        refColumns: text(r.ref_columns) ? String(r.ref_columns).split(',').map((c) => c.trim()) : undefined,
        onDelete: kind === 'FOREIGN KEY' ? /\bON DELETE (CASCADE|SET NULL|SET DEFAULT|RESTRICT)\b/i.exec(String(r.definition ?? ''))?.[1]?.toUpperCase() ?? 'NO ACTION' : undefined,
        condition: kind === 'CHECK' ? text(r.definition) : undefined,
        definition: text(r.definition),
        status: r.convalidated === false || r.convalidated === 'f' ? 'NOT VALID' : 'VALID'
      };
    })
    .sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
}

export function mapPgIndexes(rows: Row[]): TableIndexDetail[] {
  return rows.map((r) => ({
    name: String(r.name),
    unique: r.indisunique === true || r.indisunique === 't',
    primary: r.indisprimary === true || r.indisprimary === 't',
    type: text(r.method),
    columns: text(r.columns) ? String(r.columns).split(',').map((c) => c.trim()) : [],
    definition: text(r.definition)
  }));
}

export function mapPgTriggers(rows: Row[]): TableTriggerDetail[] {
  return rows.map((r) => ({
    name: String(r.tgname),
    event: String(r.event ?? ''),
    timing: text(r.timing),
    status: r.enabled === 'D' ? 'DISABLED' : 'ENABLED',
    definition: text(r.definition)
  }));
}

// ---------------------------------------------------------------------------
// MySQL
// ---------------------------------------------------------------------------

export function mapMysqlColumns(rows: Row[]): TableColumnDetail[] {
  return rows.map((r) => ({
    position: toNumber(r.ORDINAL_POSITION) ?? 0,
    name: String(r.COLUMN_NAME),
    type: String(r.COLUMN_TYPE),
    nullable: r.IS_NULLABLE === 'YES',
    defaultValue: text(r.COLUMN_DEFAULT),
    comment: text(r.COLUMN_COMMENT),
    isPrimaryKey: r.COLUMN_KEY === 'PRI'
  }));
}

export function mapMysqlConstraints(consRows: Row[], usageRows: Row[]): TableConstraintDetail[] {
  const usageByName = groupBy(usageRows, (r) => String(r.CONSTRAINT_NAME));
  const order: Record<TableConstraintKind, number> = { 'PRIMARY KEY': 0, 'FOREIGN KEY': 1, UNIQUE: 2, CHECK: 3, OTHER: 4 };
  return consRows
    .map<TableConstraintDetail>((c) => {
      const name = String(c.CONSTRAINT_NAME);
      const usage = (usageByName.get(name) ?? [])
        .slice()
        .sort((a, b) => (toNumber(a.ORDINAL_POSITION) ?? 0) - (toNumber(b.ORDINAL_POSITION) ?? 0));
      const kind: TableConstraintKind =
        c.CONSTRAINT_TYPE === 'PRIMARY KEY' || c.CONSTRAINT_TYPE === 'FOREIGN KEY' || c.CONSTRAINT_TYPE === 'UNIQUE' || c.CONSTRAINT_TYPE === 'CHECK'
          ? c.CONSTRAINT_TYPE
          : 'OTHER';
      const refTable = text(usage[0]?.REFERENCED_TABLE_NAME);
      return {
        name,
        kind,
        columns: usage.map((u) => String(u.COLUMN_NAME)),
        refTable: refTable ? `${usage[0].REFERENCED_TABLE_SCHEMA}.${refTable}` : undefined,
        refColumns: refTable ? usage.map((u) => String(u.REFERENCED_COLUMN_NAME)) : undefined,
        onDelete: text(c.DELETE_RULE)
      };
    })
    .sort((a, b) => order[a.kind] - order[b.kind] || a.name.localeCompare(b.name));
}

export function mapMysqlIndexes(rows: Row[]): TableIndexDetail[] {
  const grouped = groupBy(rows, (r) => String(r.INDEX_NAME));
  return [...grouped.entries()].map(([name, list]) => {
    const sorted = list.slice().sort((a, b) => (toNumber(a.SEQ_IN_INDEX) ?? 0) - (toNumber(b.SEQ_IN_INDEX) ?? 0));
    return {
      name,
      unique: Number(sorted[0].NON_UNIQUE) === 0,
      primary: name === 'PRIMARY',
      type: text(sorted[0].INDEX_TYPE),
      columns: sorted.map((r) => String(r.COLUMN_NAME))
    };
  });
}

export function mapMysqlTriggers(rows: Row[]): TableTriggerDetail[] {
  return rows.map((r) => ({
    name: String(r.TRIGGER_NAME),
    event: String(r.EVENT_MANIPULATION),
    timing: text(r.ACTION_TIMING)
  }));
}

// ---------------------------------------------------------------------------
// DDL
// ---------------------------------------------------------------------------

function quoteIdent(name: string): string {
  return /^[a-z_][a-z0-9_$]*$/.test(name) ? name : `"${name.replace(/"/g, '""')}"`;
}

/**
 * Reconstrói um CREATE TABLE a partir da especificação. Usado no PostgreSQL, que não tem um GET_DDL nativo; Oracle
 * e MySQL devolvem o DDL do próprio banco.
 */
export function buildCreateTableDdl(details: Pick<TableDetails, 'name' | 'owner' | 'columns' | 'constraints' | 'indexes' | 'comment'>): string {
  const full = details.owner ? `${quoteIdent(details.owner)}.${quoteIdent(details.name)}` : quoteIdent(details.name);
  const lines: string[] = details.columns.map((c) => {
    let line = `  ${quoteIdent(c.name)} ${c.type}`;
    if (c.defaultValue) line += ` DEFAULT ${c.defaultValue}`;
    if (!c.nullable) line += ' NOT NULL';
    return line;
  });
  for (const k of details.constraints) {
    const def =
      k.definition ??
      (k.columns.length ? `${k.kind} (${k.columns.map(quoteIdent).join(', ')})` : k.kind);
    lines.push(`  CONSTRAINT ${quoteIdent(k.name)} ${def}`);
  }
  const parts = [`CREATE TABLE ${full} (\n${lines.join(',\n')}\n);`];

  const primaryIndexNames = new Set(details.constraints.filter((k) => k.kind === 'PRIMARY KEY' || k.kind === 'UNIQUE').map((k) => k.name));
  for (const idx of details.indexes) {
    if (primaryIndexNames.has(idx.name) || idx.primary) continue;
    parts.push(idx.definition ? `${idx.definition};` : `CREATE ${idx.unique ? 'UNIQUE ' : ''}INDEX ${quoteIdent(idx.name)} ON ${full} (${idx.columns.join(', ')});`);
  }
  if (details.comment) parts.push(`COMMENT ON TABLE ${full} IS '${details.comment.replace(/'/g, "''")}';`);
  for (const c of details.columns) {
    if (c.comment) parts.push(`COMMENT ON COLUMN ${full}.${quoteIdent(c.name)} IS '${c.comment.replace(/'/g, "''")}';`);
  }
  return parts.join('\n\n');
}
