import { describe, expect, it } from 'vitest';
import { buildEqualityWhereClause, interpolateSqlBinds, mutationValidationError } from './databaseSqlUtils';

describe('mutationValidationError', () => {
  it('monta um QueryResult de falha sem tocar o banco', () => {
    expect(mutationValidationError('boom')).toEqual({
      success: false,
      columns: [],
      rows: [],
      rowCount: 0,
      executionTimeMs: 0,
      isQuery: false,
      error: 'boom'
    });
  });
});

describe('buildEqualityWhereClause', () => {
  it('usa binds posicionais a partir do índice inicial e IS NULL para nulos', () => {
    const binds: Record<string, any> = { p0: 'x' };
    const res = buildEqualityWhereClause({ id: 42, deleted_at: null, nome: 'Ana', obs: undefined }, binds, 1);
    expect(res.clause).toBe('id = :p1 AND deleted_at IS NULL AND nome = :p2 AND obs IS NULL');
    expect(res.nextIndex).toBe(3);
    expect(binds).toEqual({ p0: 'x', p1: 42, p2: 'Ana' });
  });

  it('retorna cláusula vazia quando não há condições', () => {
    expect(buildEqualityWhereClause({}, {}, 0)).toEqual({ clause: '', nextIndex: 0 });
  });
});

describe('interpolateSqlBinds', () => {
  it('devolve o SQL intacto sem binds', () => {
    expect(interpolateSqlBinds('SELECT :A FROM T')).toBe('SELECT :A FROM T');
    expect(interpolateSqlBinds('SELECT :A FROM T', {})).toBe('SELECT :A FROM T');
  });

  it('formata literais por tipo e escapa aspas simples', () => {
    const sql = 'SELECT :N, :B, :D, :S, :Z, :X FROM T';
    const res = interpolateSqlBinds(sql, {
      n: 5,
      B: false,
      D: new Date('2024-01-02T03:04:05.000Z'),
      S: "O'Brien",
      Z: 'null',
      X: undefined
    });
    expect(res).toBe("SELECT 5, FALSE, '2024-01-02T03:04:05.000Z', 'O''Brien', NULL, NULL FROM T");
  });

  it('preserva literais, comentários e atribuições (:=) e aceita #{} e ${}', () => {
    const sql = "SELECT '#{ID}', /* :ID */ x := 1, #{ID}, ${ID}, :ID, :OUTRO FROM T -- :ID";
    expect(interpolateSqlBinds(sql, { ID: 7 })).toBe(
      "SELECT '#{ID}', /* :ID */ x := 1, 7, 7, 7, :OUTRO FROM T -- :ID"
    );
  });
});
