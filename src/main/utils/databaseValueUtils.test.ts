import { describe, expect, it } from 'vitest';
import { sanitizeDbValue, sanitizeRows } from './databaseValueUtils';

describe('sanitizeDbValue', () => {
  it('normaliza nulos, primitivos, bigint e datas', () => {
    expect(sanitizeDbValue(null)).toBeNull();
    expect(sanitizeDbValue(undefined)).toBeNull();
    expect(sanitizeDbValue(12)).toBe(12);
    expect(sanitizeDbValue(true)).toBe(true);
    expect(sanitizeDbValue('x')).toBe('x');
    expect(sanitizeDbValue(10n)).toBe('10');
    expect(sanitizeDbValue(new Date('2024-01-02T03:04:05.000Z'))).toBe('2024-01-02T03:04:05.000Z');
  });

  it('resume buffers e streams sem tentar serializá-los', () => {
    expect(sanitizeDbValue(Buffer.from('abc'))).toBe('[BLOB 3 bytes]');
    expect(sanitizeDbValue({ pipe: () => {} })).toBe('[LOB Stream]');
    expect(sanitizeDbValue({ read: () => {} })).toBe('[LOB Stream]');
  });

  it('clona objetos serializáveis e cai para String quando o JSON falha', () => {
    expect(sanitizeDbValue({ a: 1, b: [2] })).toEqual({ a: 1, b: [2] });
    const circular: any = {};
    circular.self = circular;
    expect(sanitizeDbValue(circular)).toBe('[object Object]');
    expect(sanitizeDbValue(Symbol('s'))).toBe('Symbol(s)');
  });
});

describe('sanitizeRows', () => {
  it('mantém apenas as colunas informadas e sanitiza cada valor', () => {
    const rows = [{ ID: 1n, NOME: 'Ana', EXTRA: 'ignorado' }, { ID: 2n }];
    expect(sanitizeRows(rows, ['ID', 'NOME'])).toEqual([
      { ID: '1', NOME: 'Ana' },
      { ID: '2', NOME: null }
    ]);
  });
});
