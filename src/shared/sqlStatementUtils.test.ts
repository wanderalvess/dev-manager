import { describe, expect, it } from 'vitest';
import {
  applyRowLimit,
  classifySqlStatement,
  findRiskyStatement,
  isPlsqlBlock,
  normalizeSqlForExecution,
  stripLeadingComments
} from './sqlStatementUtils';

describe('isPlsqlBlock', () => {
  it('reconhece blocos anônimos e unidades armazenadas, ignorando comentários iniciais', () => {
    expect(isPlsqlBlock('BEGIN NULL; END;')).toBe(true);
    expect(isPlsqlBlock('  declare v number; begin v := 1; end;')).toBe(true);
    expect(isPlsqlBlock('-- rotina\n/* x */ BEGIN NULL; END;')).toBe(true);
    expect(isPlsqlBlock('CREATE OR REPLACE PROCEDURE p IS BEGIN NULL; END;')).toBe(true);
    expect(isPlsqlBlock('create or replace editionable package body pkg is end;')).toBe(true);
    expect(isPlsqlBlock('CREATE TRIGGER t BEFORE INSERT ON x BEGIN NULL; END;')).toBe(true);
  });

  it('não confunde SQL comum nem tabelas com nome parecido', () => {
    expect(isPlsqlBlock('SELECT * FROM begin_log')).toBe(false);
    expect(isPlsqlBlock('CREATE TABLE t (id NUMBER)')).toBe(false);
    expect(isPlsqlBlock('UPDATE t SET a = 1')).toBe(false);
  });
});

describe('normalizeSqlForExecution', () => {
  it('Oracle: bloco PL/SQL mantém o ponto e vírgula final (evita ORA-06550)', () => {
    expect(normalizeSqlForExecution('BEGIN\n  NULL;\nEND;', 'oracle')).toBe('BEGIN\n  NULL;\nEND;');
    expect(normalizeSqlForExecution('CREATE OR REPLACE PROCEDURE p IS BEGIN NULL; END;  ', 'oracle')).toBe(
      'CREATE OR REPLACE PROCEDURE p IS BEGIN NULL; END;'
    );
  });

  it('remove a barra terminadora do SQL*Plus mas preserva o END;', () => {
    expect(normalizeSqlForExecution('BEGIN\n  NULL;\nEND;\n/', 'oracle')).toBe('BEGIN\n  NULL;\nEND;');
    expect(normalizeSqlForExecution('SELECT 1 FROM dual\n/', 'oracle')).toBe('SELECT 1 FROM dual');
  });

  it('SQL comum perde o ponto e vírgula final em qualquer dialeto', () => {
    expect(normalizeSqlForExecution('SELECT 1 FROM dual;', 'oracle')).toBe('SELECT 1 FROM dual');
    expect(normalizeSqlForExecution('SELECT 1;;  ', 'postgres')).toBe('SELECT 1');
    expect(normalizeSqlForExecution('UPDATE t SET a = 1;', 'mysql')).toBe('UPDATE t SET a = 1');
  });

  it('PL/SQL fora do Oracle não ganha tratamento especial', () => {
    expect(normalizeSqlForExecution('BEGIN;', 'postgres')).toBe('BEGIN');
  });

  it('divisão no meio do SQL não é tratada como terminador', () => {
    expect(normalizeSqlForExecution('SELECT a / b FROM t', 'oracle')).toBe('SELECT a / b FROM t');
  });
});

describe('applyRowLimit', () => {
  it('Postgres/MySQL: acrescenta LIMIT maxRows+1 em SELECT e WITH simples', () => {
    expect(applyRowLimit('SELECT * FROM t', 'postgres', 100)).toBe('SELECT * FROM t\nLIMIT 101');
    expect(applyRowLimit('WITH x AS (SELECT 1) SELECT * FROM x;', 'mysql', 10)).toBe(
      'WITH x AS (SELECT 1) SELECT * FROM x\nLIMIT 11'
    );
  });

  it('comentário de linha no fim não engole o LIMIT', () => {
    expect(applyRowLimit('SELECT * FROM t -- todos', 'postgres', 5)).toBe('SELECT * FROM t -- todos\nLIMIT 6');
  });

  it('não altera comandos que já têm LIMIT, DML, FOR UPDATE ou vários statements', () => {
    expect(applyRowLimit('SELECT * FROM t LIMIT 5', 'postgres', 100)).toBe('SELECT * FROM t LIMIT 5');
    expect(applyRowLimit('SELECT * FROM t LIMIT 5 OFFSET 10', 'postgres', 100)).toBe('SELECT * FROM t LIMIT 5 OFFSET 10');
    expect(applyRowLimit('UPDATE t SET a = 1', 'mysql', 100)).toBe('UPDATE t SET a = 1');
    expect(applyRowLimit('SELECT * FROM t FOR UPDATE', 'postgres', 100)).toBe('SELECT * FROM t FOR UPDATE');
    expect(applyRowLimit('SELECT 1; INSERT INTO t VALUES (1)', 'postgres', 100)).toBe('SELECT 1; INSERT INTO t VALUES (1)');
    expect(applyRowLimit('WITH x AS (SELECT 1) DELETE FROM t', 'postgres', 100)).toBe('WITH x AS (SELECT 1) DELETE FROM t');
  });

  it('Oracle fica a cargo do driver (maxRows)', () => {
    expect(applyRowLimit('SELECT * FROM t', 'oracle', 100)).toBe('SELECT * FROM t');
  });
});

describe('stripLeadingComments', () => {
  it('remove comentários de linha e de bloco só no início', () => {
    expect(stripLeadingComments('-- a\n/* b */\nSELECT 1 -- c')).toBe('SELECT 1 -- c');
  });
});

describe('classifySqlStatement', () => {
  it('SELECT puro não altera dados; FOR UPDATE e CTE com DML sim', () => {
    expect(classifySqlStatement('SELECT * FROM t')).toBe('select');
    expect(classifySqlStatement('-- x\nWITH a AS (SELECT 1 FROM dual) SELECT * FROM a')).toBe('select');
    expect(classifySqlStatement('SELECT * FROM t FOR UPDATE')).toBe('dml');
    expect(classifySqlStatement('WITH a AS (SELECT 1) DELETE FROM t')).toBe('dml');
  });

  it('DML, DDL, PL/SQL e controle de transação', () => {
    expect(classifySqlStatement('insert into t values (1)')).toBe('dml');
    expect(classifySqlStatement('UPDATE t SET a = 1')).toBe('dml');
    expect(classifySqlStatement('MERGE INTO t USING s ON (1=1) WHEN MATCHED THEN UPDATE SET a=1')).toBe('dml');
    expect(classifySqlStatement('CREATE TABLE t (id NUMBER)')).toBe('ddl');
    expect(classifySqlStatement('TRUNCATE TABLE t')).toBe('ddl');
    expect(classifySqlStatement('CREATE OR REPLACE PROCEDURE p IS BEGIN NULL; END;')).toBe('ddl');
    expect(classifySqlStatement('BEGIN NULL; END;')).toBe('plsql');
    expect(classifySqlStatement('EXEC pkg.proc')).toBe('plsql');
    expect(classifySqlStatement('COMMIT')).toBe('commit');
    expect(classifySqlStatement('ROLLBACK')).toBe('rollback');
    expect(classifySqlStatement('ROLLBACK TO sp1')).toBe('savepoint');
    expect(classifySqlStatement('SAVEPOINT sp1')).toBe('savepoint');
    expect(classifySqlStatement('EXPLAIN PLAN FOR SELECT 1 FROM dual')).toBe('other');
  });

  it('palavra-chave dentro de texto ou comentário não engana', () => {
    expect(classifySqlStatement("SELECT 'DELETE FROM t' FROM dual")).toBe('select');
    expect(classifySqlStatement('/* UPDATE t */ SELECT 1 FROM dual')).toBe('select');
  });
});

describe('findRiskyStatement', () => {
  it('UPDATE/DELETE sem WHERE e DROP/TRUNCATE são arriscados', () => {
    expect(findRiskyStatement('UPDATE t SET a = 1')).toEqual({ reason: 'no-where', verb: 'UPDATE' });
    expect(findRiskyStatement('delete from t')).toEqual({ reason: 'no-where', verb: 'DELETE' });
    expect(findRiskyStatement('TRUNCATE TABLE t')).toEqual({ reason: 'ddl', verb: 'TRUNCATE' });
    expect(findRiskyStatement('DROP TABLE t')).toEqual({ reason: 'ddl', verb: 'DROP' });
  });

  it('com WHERE, SELECT e WHERE só em comentário/texto', () => {
    expect(findRiskyStatement('UPDATE t SET a = 1 WHERE id = 2')).toBeNull();
    expect(findRiskyStatement('SELECT * FROM t')).toBeNull();
    expect(findRiskyStatement('DELETE FROM t -- WHERE id = 1')).toEqual({ reason: 'no-where', verb: 'DELETE' });
    expect(findRiskyStatement("UPDATE t SET a = 'WHERE'")).toEqual({ reason: 'no-where', verb: 'UPDATE' });
  });
});
