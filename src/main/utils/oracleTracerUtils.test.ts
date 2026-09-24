import { describe, expect, it } from 'vitest';
import {
  buildActiveSessionsQuery,
  buildRecentStatementsQuery,
  mapActiveSessionRow,
  mapRecentStatementRow
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
});
