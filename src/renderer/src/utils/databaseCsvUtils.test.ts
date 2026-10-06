import { describe, it, expect } from 'vitest';
import { formatCellForCopy } from './databaseCsvUtils';

describe('formatCellForCopy', () => {
  it('serializa objetos como JSON', () => {
    expect(formatCellForCopy({ a: 1 })).toBe('{"a":1}');
  });

  it('converte primitivos e nulos em texto', () => {
    expect(formatCellForCopy(42)).toBe('42');
    expect(formatCellForCopy(undefined)).toBe('');
  });
});
