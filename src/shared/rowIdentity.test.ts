import { describe, expect, it } from 'vitest';
import { ROW_ID_COLUMN, buildRowIdSelect, isValidRowIdValue, supportsRowId } from './rowIdentity';

describe('rowIdentity', () => {
  it('só Oracle e PostgreSQL suportam pseudo-coluna', () => {
    expect(supportsRowId('oracle')).toBe(true);
    expect(supportsRowId('postgres')).toBe(true);
    expect(supportsRowId('mysql')).toBe(false);
  });

  it('valida o formato por vendor', () => {
    expect(isValidRowIdValue('oracle', 'AAAR3sAAEAAAACXAAA')).toBe(true);
    expect(isValidRowIdValue('oracle', 'x; DROP')).toBe(false);
    expect(isValidRowIdValue('postgres', '(3,7)')).toBe(true);
    expect(isValidRowIdValue('postgres', '3,7')).toBe(false);
    expect(isValidRowIdValue('mysql', 'abc')).toBe(false);
    expect(isValidRowIdValue('oracle', 5)).toBe(false);
  });

  it('reescreve SELECT * preservando o restante da consulta', () => {
    expect(buildRowIdSelect('SELECT * FROM HR.EMP WHERE ROWNUM <= 100', 'HR.EMP', 'oracle')).toBe(
      `SELECT ROWID AS "${ROW_ID_COLUMN}", HR.EMP.* FROM HR.EMP WHERE ROWNUM <= 100`
    );
    expect(buildRowIdSelect('select * from t limit 10', 't', 'postgres')).toBe(
      `SELECT ctid::text AS "${ROW_ID_COLUMN}", * FROM t limit 10`
    );
  });

  it('não reescreve MySQL nem SQL fora do padrão', () => {
    expect(buildRowIdSelect('SELECT * FROM t', 't', 'mysql')).toBeNull();
    expect(buildRowIdSelect('SELECT a FROM t', 't', 'oracle')).toBeNull();
  });
});
