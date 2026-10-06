import { describe, expect, it } from 'vitest';
import { findStatementAt, isReadOnlySql, splitSqlStatements } from './sqlSplitUtils';

describe('splitSqlStatements', () => {
  it('divide por ponto e vírgula e preserva o texto de cada comando', () => {
    const sql = 'SELECT 1 FROM dual;\nSELECT 2 FROM dual;\n\nUPDATE t SET a = 1 WHERE id = 2;';
    const parts = splitSqlStatements(sql);
    expect(parts.map((p) => p.text)).toEqual([
      'SELECT 1 FROM dual;',
      'SELECT 2 FROM dual;',
      'UPDATE t SET a = 1 WHERE id = 2;'
    ]);
    expect(sql.slice(parts[1].start, parts[1].end)).toBe('SELECT 2 FROM dual;');
  });

  it('ponto e vírgula dentro de texto, comentário ou q-quote não divide', () => {
    expect(splitSqlStatements("SELECT 'a;b' FROM dual; SELECT 2 FROM dual").map((p) => p.text)).toEqual([
      "SELECT 'a;b' FROM dual;",
      'SELECT 2 FROM dual'
    ]);
    expect(splitSqlStatements('SELECT 1 -- x; y\nFROM dual;').map((p) => p.text)).toEqual(['SELECT 1 -- x; y\nFROM dual;']);
    expect(splitSqlStatements("SELECT q'[it's; ok]' FROM dual;").map((p) => p.text)).toEqual(["SELECT q'[it's; ok]' FROM dual;"]);
    expect(splitSqlStatements('SELECT "a;b" FROM t;').map((p) => p.text)).toEqual(['SELECT "a;b" FROM t;']);
    expect(splitSqlStatements("SELECT 'it''s; fine' FROM dual;").map((p) => p.text)).toEqual(["SELECT 'it''s; fine' FROM dual;"]);
  });

  it('bloco PL/SQL só termina na barra; os ; internos não dividem', () => {
    const sql = 'BEGIN\n  UPDATE t SET a = 1;\n  COMMIT;\nEND;\n/\nSELECT 1 FROM dual;';
    const parts = splitSqlStatements(sql);
    expect(parts).toHaveLength(2);
    expect(parts[0].text).toBe('BEGIN\n  UPDATE t SET a = 1;\n  COMMIT;\nEND;');
    expect(parts[1].text).toBe('SELECT 1 FROM dual;');
  });

  it('CREATE PROCEDURE sem barra final vai até o fim do texto', () => {
    const proc = 'CREATE OR REPLACE PROCEDURE p IS\nBEGIN\n  NULL;\nEND;';
    expect(splitSqlStatements(proc).map((p) => p.text)).toEqual([proc]);
  });

  it('barra solta encerra um comando comum; comentários e vazios são ignorados', () => {
    expect(splitSqlStatements('SELECT 1 FROM dual\n/\nSELECT 2 FROM dual').map((p) => p.text)).toEqual([
      'SELECT 1 FROM dual',
      'SELECT 2 FROM dual'
    ]);
    expect(splitSqlStatements('-- só comentário\n;\n/* x */')).toEqual([]);
    expect(splitSqlStatements('   ')).toEqual([]);
  });

  it('divisão aritmética no meio da linha não é terminador', () => {
    expect(splitSqlStatements('SELECT a / b FROM t;').map((p) => p.text)).toEqual(['SELECT a / b FROM t;']);
  });
});

describe('findStatementAt', () => {
  const sql = 'SELECT 1 FROM dual;\nSELECT 2 FROM dual;\n\nSELECT 3 FROM dual;';

  it('devolve o comando que contém o cursor', () => {
    expect(findStatementAt(sql, 3)?.text).toBe('SELECT 1 FROM dual;');
    expect(findStatementAt(sql, sql.indexOf('SELECT 2') + 4)?.text).toBe('SELECT 2 FROM dual;');
    expect(findStatementAt(sql, sql.length)?.text).toBe('SELECT 3 FROM dual;');
  });

  it('entre comandos escolhe o anterior; sem comandos devolve null', () => {
    expect(findStatementAt(sql, sql.indexOf('\n\n') + 1)?.text).toBe('SELECT 2 FROM dual;');
    expect(findStatementAt('   ', 1)).toBeNull();
  });

  it('cursor dentro de um bloco PL/SQL seleciona o bloco inteiro', () => {
    const block = 'BEGIN\n  NULL;\nEND;\n/';
    expect(findStatementAt(block, block.indexOf('NULL'))?.text).toBe('BEGIN\n  NULL;\nEND;');
  });
});

describe('isReadOnlySql', () => {
  it('aceita consultas, inclusive várias e com comentários', () => {
    expect(isReadOnlySql('SELECT 1 FROM dual')).toBe(true);
    expect(isReadOnlySql('-- lista\nselect * from t; select 2 from dual;')).toBe(true);
    expect(isReadOnlySql('WITH x AS (SELECT 1 a FROM dual) SELECT * FROM x')).toBe(true);
    expect(isReadOnlySql('EXPLAIN SELECT * FROM t')).toBe(true);
    expect(isReadOnlySql('SHOW TABLES')).toBe(true);
  });

  it('recusa escrita, DDL, PL/SQL e SELECT FOR UPDATE, mesmo escondidos atrás de um SELECT', () => {
    expect(isReadOnlySql('DELETE FROM t')).toBe(false);
    expect(isReadOnlySql('SELECT 1 FROM dual; DROP TABLE t')).toBe(false);
    expect(isReadOnlySql('UPDATE t SET a = 1')).toBe(false);
    expect(isReadOnlySql('BEGIN NULL; END;')).toBe(false);
    expect(isReadOnlySql('SELECT * FROM t FOR UPDATE')).toBe(false);
    expect(isReadOnlySql('WITH x AS (SELECT 1 FROM dual) DELETE FROM t')).toBe(false);
    expect(isReadOnlySql('TRUNCATE TABLE t')).toBe(false);
  });

  it('texto vazio ou só comentário não conta como leitura', () => {
    expect(isReadOnlySql('')).toBe(false);
    expect(isReadOnlySql('-- nada')).toBe(false);
  });
});
