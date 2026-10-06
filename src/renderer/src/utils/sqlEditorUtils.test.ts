import { describe, it, expect } from 'vitest';
import type { SqlSnippet } from '../../../shared/types';
import {
  extractReferencedTables,
  filterSqlSnippets,
  parseStoredClamped,
  resolveColumnLoadKey,
  resolveTableKey
} from './sqlEditorUtils';
import { DEFAULT_SQL_SNIPPETS } from './sqlEditorSnippets';

const makeSnippet = (over: Partial<SqlSnippet> = {}): SqlSnippet => ({
  id: 's1',
  title: 'Clientes ativos',
  category: 'Geral',
  sql: 'SELECT 1',
  ...over
});

describe('parseStoredClamped', () => {
  it('usa o padrão quando não há valor salvo', () => {
    expect(parseStoredClamped(null, 140, 800, 260)).toBe(260);
  });
  it('limita aos extremos', () => {
    expect(parseStoredClamped('50', 140, 800, 260)).toBe(140);
    expect(parseStoredClamped('9999', 140, 800, 260)).toBe(800);
    expect(parseStoredClamped('300', 140, 800, 260)).toBe(300);
  });
});

describe('extractReferencedTables', () => {
  it('extrai tabelas e aliases de FROM/JOIN', () => {
    const sql = 'SELECT * FROM pcprodut p JOIN "HR"."EMP" AS e ON e.id = p.id JOIN dept';
    expect(extractReferencedTables(sql)).toEqual([
      { table: 'pcprodut', alias: 'p' },
      { table: 'HR.EMP', alias: 'e' },
      { table: 'dept', alias: 'dept' }
    ]);
  });
});

describe('resolveTableKey / resolveColumnLoadKey', () => {
  const tables = ['HR.EMPLOYEES', 'DEPT'];
  it('ignora owner na comparação', () => {
    expect(resolveTableKey(tables, 'EMPLOYEES')).toBe('HR.EMPLOYEES');
    expect(resolveTableKey(tables, 'OUTRA')).toBe('OUTRA');
  });
  it('ignora caixa ao carregar colunas', () => {
    expect(resolveColumnLoadKey(tables, 'employees')).toBe('HR.EMPLOYEES');
    expect(resolveColumnLoadKey(tables, 'x')).toBe('x');
  });
});

describe('filterSqlSnippets', () => {
  const list = [makeSnippet(), makeSnippet({ id: 's2', title: 'Outro', sql: 'SELECT * FROM pedidos' })];
  it('retorna tudo com busca vazia', () => {
    expect(filterSqlSnippets(list, '  ')).toBe(list);
  });
  it('busca em título e sql sem diferenciar caixa', () => {
    expect(filterSqlSnippets(list, 'CLIENTES')).toHaveLength(1);
    expect(filterSqlSnippets(list, 'pedidos')[0].id).toBe('s2');
  });
});

describe('DEFAULT_SQL_SNIPPETS', () => {
  it('mantém os modelos de diagnóstico Oracle', () => {
    expect(DEFAULT_SQL_SNIPPETS.map((s) => s.id)).toEqual([
      'oracle-active-sessions',
      'oracle-locks',
      'oracle-tablespaces'
    ]);
  });
});
