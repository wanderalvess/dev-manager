import { describe, it, expect } from 'vitest';
import { buildCsvContent, formatCellForCopy } from './databaseCsvUtils';

describe('buildCsvContent', () => {
  it('gera cabeçalho e linhas entre aspas', () => {
    const csv = buildCsvContent(['ID', 'NAME'], [{ ID: 1, NAME: 'Ana' }]);
    expect(csv).toBe('ID,NAME\n"1","Ana"');
  });

  it('duplica aspas internas e deixa nulos vazios', () => {
    const csv = buildCsvContent(['A', 'B'], [{ A: 'diz "oi"', B: null }, { A: undefined, B: 'x' }]);
    expect(csv).toBe('A,B\n"diz ""oi""",\n,"x"');
  });

  it('retorna apenas o cabeçalho sem linhas', () => {
    expect(buildCsvContent(['A'], [])).toBe('A');
  });
});

describe('formatCellForCopy', () => {
  it('serializa objetos como JSON', () => {
    expect(formatCellForCopy({ a: 1 })).toBe('{"a":1}');
  });

  it('converte primitivos e nulos em texto', () => {
    expect(formatCellForCopy(42)).toBe('42');
    expect(formatCellForCopy(undefined)).toBe('');
  });
});
