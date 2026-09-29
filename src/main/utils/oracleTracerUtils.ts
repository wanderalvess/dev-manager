import {
  OracleActiveSession,
  OracleRecentStatement,
  OracleTracerFilter,
  OracleCapturedBind
} from '../../shared/types';

export interface OracleTracerQuery {
  sql: string;
  binds: Record<string, any>;
}

/**
 * Monta a consulta que une v$session com v$sql pela SQL_ID (ou PREV_SQL_ID quando a sessão
 * está ociosa no momento da consulta) para mostrar o que cada sessão conectada ao Oracle
 * está rodando ou rodou por último — a forma de correlacionar "qual app/rotina disparou
 * essa query" quando várias aplicações compartilham o mesmo schema/instância.
 */
export function buildActiveSessionsQuery(filter?: OracleTracerFilter): OracleTracerQuery {
  const binds: Record<string, any> = {};
  let extraWhere = '';

  if (filter?.schemaFilter?.trim()) {
    extraWhere += ' AND UPPER(s.username) = UPPER(:schemaFilter)';
    binds.schemaFilter = filter.schemaFilter.trim();
  }
  if (filter?.textFilter?.trim()) {
    extraWhere += ' AND UPPER(q.sql_fulltext) LIKE UPPER(:textFilter)';
    binds.textFilter = `%${filter.textFilter.trim()}%`;
  }

  const sql = `
    SELECT
      s.sid AS sid,
      s.serial# AS serial_num,
      s.username AS username,
      s.program AS program,
      s.machine AS machine,
      s.module AS module,
      s.action AS action,
      s.client_identifier AS client_identifier,
      s.status AS status,
      s.last_call_et AS last_call_et,
      NVL(s.sql_id, s.prev_sql_id) AS sql_id,
      q.sql_fulltext AS sql_fulltext
    FROM v$session s
    LEFT JOIN v$sql q
      ON q.sql_id = NVL(s.sql_id, s.prev_sql_id)
     AND q.child_number = NVL(s.sql_child_number, s.prev_child_number)
    WHERE s.type = 'USER'
      AND s.username IS NOT NULL${extraWhere}
    ORDER BY s.last_call_et ASC
  `.trim();

  return { sql, binds };
}

/**
 * Monta a consulta ao cursor cache do Oracle (v$sql) para listar as instruções SQL mais
 * recentes que passaram pelo banco, mesmo que a sessão que as executou já tenha encerrado.
 */
export function buildRecentStatementsQuery(filter?: OracleTracerFilter): OracleTracerQuery {
  const binds: Record<string, any> = {};
  let extraWhere = '';

  if (filter?.schemaFilter?.trim()) {
    extraWhere += ' AND UPPER(q.parsing_schema_name) = UPPER(:schemaFilter)';
    binds.schemaFilter = filter.schemaFilter.trim();
  }
  if (filter?.textFilter?.trim()) {
    extraWhere += ' AND UPPER(q.sql_fulltext) LIKE UPPER(:textFilter)';
    binds.textFilter = `%${filter.textFilter.trim()}%`;
  }

  const sql = `
    SELECT
      q.sql_id AS sql_id,
      q.sql_fulltext AS sql_fulltext,
      q.parsing_schema_name AS parsing_schema_name,
      q.module AS module,
      q.action AS action,
      q.executions AS executions,
      q.first_load_time AS first_load_time,
      q.last_active_time AS last_active_time
    FROM v$sql q
    WHERE 1 = 1${extraWhere}
    ORDER BY q.last_active_time DESC
  `.trim();

  return { sql, binds };
}

export function mapActiveSessionRow(row: Record<string, any>): OracleActiveSession {
  return {
    sid: Number(row.SID),
    serialNum: Number(row.SERIAL_NUM),
    username: row.USERNAME ?? null,
    program: row.PROGRAM ?? null,
    machine: row.MACHINE ?? null,
    module: row.MODULE ?? null,
    action: row.ACTION ?? null,
    clientIdentifier: row.CLIENT_IDENTIFIER ?? null,
    status: row.STATUS ?? null,
    lastCallEt: row.LAST_CALL_ET !== null && row.LAST_CALL_ET !== undefined ? Number(row.LAST_CALL_ET) : null,
    sqlId: row.SQL_ID ?? null,
    sqlText: row.SQL_FULLTEXT ?? null
  };
}

export function mapRecentStatementRow(row: Record<string, any>): OracleRecentStatement {
  return {
    sqlId: String(row.SQL_ID ?? ''),
    sqlText: String(row.SQL_FULLTEXT ?? ''),
    parsingSchemaName: row.PARSING_SCHEMA_NAME ?? null,
    module: row.MODULE ?? null,
    action: row.ACTION ?? null,
    executions: row.EXECUTIONS !== null && row.EXECUTIONS !== undefined ? Number(row.EXECUTIONS) : null,
    firstLoadTime: row.FIRST_LOAD_TIME ?? null,
    lastActiveTime: row.LAST_ACTIVE_TIME ?? null
  };
}

/**
 * Monta a consulta a v$sql_bind_capture para recuperar os parâmetros passados
 * nas instruções SQL informadas (PreparedStatement, binds nomeados ou posicionais).
 */
export function buildBindCaptureQuery(sqlIds: string[]): OracleTracerQuery {
  const binds: Record<string, any> = {};
  const cleanIds = Array.from(new Set(sqlIds.map((id) => (id || '').trim()).filter(Boolean)));

  if (cleanIds.length === 0) {
    return {
      sql: 'SELECT NULL AS sql_id, NULL AS name, NULL AS position, NULL AS datatype_string, NULL AS value_string, NULL AS last_captured, NULL AS child_number FROM dual WHERE 1 = 0',
      binds: {}
    };
  }

  const inPlaceholders: string[] = [];
  cleanIds.forEach((id, idx) => {
    const key = `id${idx}`;
    inPlaceholders.push(`:${key}`);
    binds[key] = id;
  });

  const sql = `
    SELECT
      b.sql_id AS sql_id,
      b.name AS name,
      b.position AS position,
      b.datatype_string AS datatype_string,
      b.value_string AS value_string,
      b.last_captured AS last_captured,
      b.child_number AS child_number
    FROM v$sql_bind_capture b
    WHERE b.sql_id IN (${inPlaceholders.join(', ')})
    ORDER BY b.sql_id ASC, b.child_number DESC, b.position ASC
  `.trim();

  return { sql, binds };
}

export function mapCapturedBindRow(row: Record<string, any>): OracleCapturedBind {
  return {
    sqlId: row.SQL_ID ? String(row.SQL_ID) : undefined,
    name: row.NAME ? String(row.NAME) : `:${row.POSITION ?? ''}`,
    position: Number(row.POSITION || 0),
    datatype: row.DATATYPE_STRING ? String(row.DATATYPE_STRING) : null,
    value: row.VALUE_STRING !== null && row.VALUE_STRING !== undefined ? String(row.VALUE_STRING) : null,
    lastCaptured: row.LAST_CAPTURED ? String(row.LAST_CAPTURED) : null
  };
}

/**
 * Agrupa linhas retornadas de v$sql_bind_capture por SQL_ID, deduplicando por
 * posição (mantendo a mais recente conforme child_number DESC).
 */
export function groupCapturedBindsBySqlId(rows: Record<string, any>[]): Map<string, OracleCapturedBind[]> {
  const map = new Map<string, OracleCapturedBind[]>();
  const seenPositionsBySqlId = new Map<string, Set<number>>();

  for (const row of rows) {
    const sqlId = row.SQL_ID ? String(row.SQL_ID) : '';
    if (!sqlId) continue;

    if (!map.has(sqlId)) {
      map.set(sqlId, []);
      seenPositionsBySqlId.set(sqlId, new Set());
    }

    const pos = Number(row.POSITION || 0);
    const seenPos = seenPositionsBySqlId.get(sqlId)!;

    if (pos > 0 && seenPos.has(pos)) {
      continue;
    }
    if (pos > 0) {
      seenPos.add(pos);
    }

    const bind = mapCapturedBindRow(row);
    map.get(sqlId)!.push(bind);
  }

  for (const list of map.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  return map;
}

export { formatBindValueLiteral, interpolateOracleSqlWithBinds } from '../../shared/oracleSqlInterpolator';


