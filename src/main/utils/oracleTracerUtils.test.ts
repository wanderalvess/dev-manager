import { describe, expect, it } from 'vitest';
import {
  buildActiveSessionsQuery,
  buildRecentStatementsQuery,
  mapActiveSessionRow,
  mapRecentStatementRow,
  buildBindCaptureQuery,
  mapCapturedBindRow,
  groupCapturedBindsBySqlId,
  formatBindValueLiteral,
  interpolateOracleSqlWithBinds
} from './oracleTracerUtils';

describe('oracleTracerUtils', () => {
  describe('buildActiveSessionsQuery', () => {
    it('não adiciona filtros quando nenhum é informado', () => {
      const { sql, binds } = buildActiveSessionsQuery();
      expect(binds).toEqual({});
      expect(sql).not.toContain('schemaFilter');
      expect(sql).not.toContain('textFilter');
      expect(sql).toContain('FROM v$session s');
      expect(sql).toContain('LEFT JOIN v$sql q');
    });

    it('ignora filtros com apenas espaços em branco', () => {
      const { sql, binds } = buildActiveSessionsQuery({ schemaFilter: '   ', textFilter: '  ' });
      expect(binds).toEqual({});
      expect(sql).not.toContain('schemaFilter');
    });

    it('adiciona filtro de schema com bind aparado e em maiúsculas via UPPER()', () => {
      const { sql, binds } = buildActiveSessionsQuery({ schemaFilter: '  meuschema  ' });
      expect(sql).toContain('UPPER(s.username) = UPPER(:schemaFilter)');
      expect(binds.schemaFilter).toBe('meuschema');
    });

    it('adiciona filtro textual envolvendo o bind em curingas %', () => {
      const { sql, binds } = buildActiveSessionsQuery({ textFilter: 'update pedido' });
      expect(sql).toContain('UPPER(q.sql_fulltext) LIKE UPPER(:textFilter)');
      expect(binds.textFilter).toBe('%update pedido%');
    });
  });

  describe('buildRecentStatementsQuery', () => {
    it('não adiciona filtros quando nenhum é informado', () => {
      const { sql, binds } = buildRecentStatementsQuery();
      expect(binds).toEqual({});
      expect(sql).toContain('FROM v$sql q');
      expect(sql).toContain('ORDER BY q.last_active_time DESC');
    });

    it('filtra por parsing_schema_name quando schemaFilter é informado', () => {
      const { sql, binds } = buildRecentStatementsQuery({ schemaFilter: 'APP_KARAF' });
      expect(sql).toContain('UPPER(q.parsing_schema_name) = UPPER(:schemaFilter)');
      expect(binds.schemaFilter).toBe('APP_KARAF');
    });

    it('combina schemaFilter e textFilter na mesma consulta', () => {
      const { sql, binds } = buildRecentStatementsQuery({ schemaFilter: 'APP', textFilter: 'select' });
      expect(sql).toContain('parsing_schema_name');
      expect(sql).toContain('sql_fulltext');
      expect(binds).toEqual({ schemaFilter: 'APP', textFilter: '%select%' });
    });
  });

  describe('mapActiveSessionRow', () => {
    it('converte campos numéricos e preserva nulos ausentes', () => {
      const row = mapActiveSessionRow({
        SID: '42',
        SERIAL_NUM: '1001',
        USERNAME: 'APP_USER',
        PROGRAM: 'JDBC Thin Client',
        MACHINE: 'karaf-host',
        MODULE: null,
        ACTION: undefined,
        CLIENT_IDENTIFIER: null,
        STATUS: 'ACTIVE',
        LAST_CALL_ET: '3',
        SQL_ID: 'abc123',
        SQL_FULLTEXT: 'SELECT 1 FROM DUAL'
      });

      expect(row).toEqual({
        sid: 42,
        serialNum: 1001,
        username: 'APP_USER',
        program: 'JDBC Thin Client',
        machine: 'karaf-host',
        module: null,
        action: null,
        clientIdentifier: null,
        status: 'ACTIVE',
        lastCallEt: 3,
        sqlId: 'abc123',
        sqlText: 'SELECT 1 FROM DUAL'
      });
    });

    it('mantém lastCallEt como null quando ausente (sessão sem histórico de chamada)', () => {
      const row = mapActiveSessionRow({ SID: 1, SERIAL_NUM: 2, LAST_CALL_ET: null });
      expect(row.lastCallEt).toBeNull();
      expect(row.sqlId).toBeNull();
      expect(row.sqlText).toBeNull();
    });
  });

  describe('mapRecentStatementRow', () => {
    it('converte campos numéricos e preserva nulos ausentes', () => {
      const row = mapRecentStatementRow({
        SQL_ID: 'xyz789',
        SQL_FULLTEXT: 'UPDATE PEDIDO SET STATUS = :1',
        PARSING_SCHEMA_NAME: 'APP_KARAF',
        MODULE: 'rotina801',
        ACTION: 'processarPedido',
        EXECUTIONS: '17',
        FIRST_LOAD_TIME: '2026-09-20/10:00:00',
        LAST_ACTIVE_TIME: '2026-09-23/09:15:30'
      });

      expect(row).toEqual({
        sqlId: 'xyz789',
        sqlText: 'UPDATE PEDIDO SET STATUS = :1',
        parsingSchemaName: 'APP_KARAF',
        module: 'rotina801',
        action: 'processarPedido',
        executions: 17,
        firstLoadTime: '2026-09-20/10:00:00',
        lastActiveTime: '2026-09-23/09:15:30'
      });
    });

    it('usa string vazia para sqlId/sqlText ausentes em vez de "null"/"undefined"', () => {
      const row = mapRecentStatementRow({});
      expect(row.sqlId).toBe('');
      expect(row.sqlText).toBe('');
      expect(row.executions).toBeNull();
    });
  });

  describe('buildBindCaptureQuery', () => {
    it('retorna consulta vazia quando array está vazio', () => {
      const { sql, binds } = buildBindCaptureQuery([]);
      expect(sql).toContain('WHERE 1 = 0');
      expect(binds).toEqual({});
    });

    it('monta IN com binds nomeados para os IDs informados', () => {
      const { sql, binds } = buildBindCaptureQuery(['sql123', 'sql456', 'sql123']);
      expect(sql).toContain('FROM v$sql_bind_capture b');
      expect(sql).toContain('WHERE b.sql_id IN (:id0, :id1)');
      expect(binds).toEqual({ id0: 'sql123', id1: 'sql456' });
    });
  });

  describe('mapCapturedBindRow e groupCapturedBindsBySqlId', () => {
    it('mapeia campos e deduplica por posição mantendo a primeira ocorrência (child_number mais recente)', () => {
      const rows = [
        {
          SQL_ID: 'sql1',
          NAME: ':1',
          POSITION: 1,
          DATATYPE_STRING: 'NUMBER',
          VALUE_STRING: '29424',
          LAST_CAPTURED: '2026-09-29T13:28:50',
          CHILD_NUMBER: 1
        },
        {
          SQL_ID: 'sql1',
          NAME: ':1',
          POSITION: 1,
          DATATYPE_STRING: 'NUMBER',
          VALUE_STRING: '10000',
          LAST_CAPTURED: '2026-09-29T12:00:00',
          CHILD_NUMBER: 0
        },
        {
          SQL_ID: 'sql1',
          NAME: ':2',
          POSITION: 2,
          DATATYPE_STRING: 'VARCHAR2(30)',
          VALUE_STRING: 'CENTRO',
          LAST_CAPTURED: '2026-09-29T13:28:50',
          CHILD_NUMBER: 1
        }
      ];

      const map = groupCapturedBindsBySqlId(rows);
      expect(map.has('sql1')).toBe(true);
      const binds = map.get('sql1')!;
      expect(binds).toHaveLength(2);
      expect(binds[0].position).toBe(1);
      expect(binds[0].value).toBe('29424');
      expect(binds[1].position).toBe(2);
      expect(binds[1].value).toBe('CENTRO');
    });
  });

  describe('formatBindValueLiteral', () => {
    it('formata nulos como NULL', () => {
      expect(formatBindValueLiteral(null)).toBe('NULL');
      expect(formatBindValueLiteral(undefined)).toBe('NULL');
      expect(formatBindValueLiteral('null')).toBe('NULL');
      expect(formatBindValueLiteral('NULL')).toBe('NULL');
    });

    it('formata números sem aspas quando o tipo é numérico', () => {
      expect(formatBindValueLiteral('12345', 'NUMBER')).toBe('12345');
      expect(formatBindValueLiteral('-42.5', 'FLOAT')).toBe('-42.5');
    });

    it('formata strings com aspas simples e escapa aspas internas', () => {
      expect(formatBindValueLiteral("D'OESTE", 'VARCHAR2(50)')).toBe("'D''OESTE'");
      expect(formatBindValueLiteral('ROTA 10', 'VARCHAR2')).toBe("'ROTA 10'");
    });
  });

  describe('interpolateOracleSqlWithBinds', () => {
    it('interpola binds posicionais (:1, :2)', () => {
      const sql = 'SELECT * FROM PCPEDC WHERE NUMPED = :1 AND CODCLI = :2';
      const binds = [
        { name: ':1', position: 1, datatype: 'NUMBER', value: '29424' },
        { name: ':2', position: 2, datatype: 'NUMBER', value: '1050' }
      ];
      expect(interpolateOracleSqlWithBinds(sql, binds)).toBe(
        'SELECT * FROM PCPEDC WHERE NUMPED = 29424 AND CODCLI = 1050'
      );
    });

    it('interpola binds nomeados (:CODROTA, :DESCRICAO)', () => {
      const sql = 'SELECT * FROM PCPRACA WHERE ROTA = :CODROTA AND DESC = :DESCRICAO';
      const binds = [
        { name: ':CODROTA', position: 1, datatype: 'NUMBER', value: '10' },
        { name: ':DESCRICAO', position: 2, datatype: 'VARCHAR2', value: "CENTRO D'OESTE" }
      ];
      expect(interpolateOracleSqlWithBinds(sql, binds)).toBe(
        "SELECT * FROM PCPRACA WHERE ROTA = 10 AND DESC = 'CENTRO D''OESTE'"
      );
    });

    it('interpola placeholders JDBC / Hibernate (?) sequencialmente por posição', () => {
      const sql = 'SELECT p FROM PCPEDC p WHERE p.numped = ? AND p.codfilial = ?';
      const binds = [
        { name: ':1', position: 1, datatype: 'NUMBER', value: '29424' },
        { name: ':2', position: 2, datatype: 'VARCHAR2(2)', value: '01' }
      ];
      expect(interpolateOracleSqlWithBinds(sql, binds)).toBe(
        "SELECT p FROM PCPEDC p WHERE p.numped = 29424 AND p.codfilial = '01'"
      );
    });

    it('preserva strings literais e comentários sem substituir o que está dentro', () => {
      const sql = "SELECT 'valor :1 com ?' AS msg, /* :2 */ :3 AS col FROM dual -- fim :4";
      const binds = [
        { name: ':1', position: 1, datatype: 'VARCHAR2', value: 'NAO_SUBSTITUIR' },
        { name: ':2', position: 2, datatype: 'VARCHAR2', value: 'NAO_SUBSTITUIR' },
        { name: ':3', position: 3, datatype: 'NUMBER', value: '99' }
      ];
      expect(interpolateOracleSqlWithBinds(sql, binds)).toBe(
        "SELECT 'valor :1 com ?' AS msg, /* :2 */ 99 AS col FROM dual -- fim :4"
      );
    });

    it('retorna SQL original se binds for vazio', () => {
      const sql = 'SELECT 1 FROM DUAL';
      expect(interpolateOracleSqlWithBinds(sql, [])).toBe(sql);
    });
  });
});
