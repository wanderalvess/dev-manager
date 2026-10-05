import { describe, expect, it } from 'vitest';
import {
  clampContextMenuPosition,
  computeBottomSpacerHeight,
  formatCellValue,
  formatFilterValueLabel,
  getCellKind,
  getCellTitle,
  getRowClassName,
  hasCellChanged,
  omitColumnFilter,
  toEditableDisplay
} from './resultsGridUtils';

describe('resultsGridUtils', () => {
  it('toEditableDisplay converte nulos em vazio', () => {
    expect(toEditableDisplay(null)).toBe('');
    expect(toEditableDisplay(undefined)).toBe('');
    expect(toEditableDisplay(0)).toBe('0');
  });

  it('hasCellChanged compara com o valor exibido', () => {
    expect(hasCellChanged('', null)).toBe(false);
    expect(hasCellChanged('5', 5)).toBe(false);
    expect(hasCellChanged('6', 5)).toBe(true);
  });

  it('getCellKind respeita a precedência', () => {
    expect(getCellKind(null, 'number')).toBe('null');
    expect(getCellKind(1, 'string')).toBe('number');
    expect(getCellKind('x', 'number')).toBe('number');
    expect(getCellKind('2020', 'date')).toBe('date');
    expect(getCellKind(true, 'string')).toBe('boolean');
    expect(getCellKind({ a: 1 }, 'object')).toBe('object');
    expect(getCellKind('abc', 'string')).toBe('string');
  });

  it('formatCellValue serializa objetos como JSON', () => {
    expect(formatCellValue({ a: 1 }, 'object')).toBe('{"a":1}');
    expect(formatCellValue(true, 'boolean')).toBe('true');
  });

  it('getCellTitle varia por editabilidade', () => {
    expect(getCellTitle(true)).toContain('Duplo-clique');
    expect(getCellTitle(false)).toContain('filtrar por valor');
  });

  it('getRowClassName alterna zebra e seleção', () => {
    expect(getRowClassName(true, 0)).toContain('border-sky-500');
    expect(getRowClassName(false, 0)).toContain('bg-background');
    expect(getRowClassName(false, 1)).toContain('bg-muted/15');
  });

  it('computeBottomSpacerHeight nunca é negativo', () => {
    expect(computeBottomSpacerHeight(1000, 330, 10)).toBe(340);
    expect(computeBottomSpacerHeight(100, 330, 10)).toBe(0);
  });

  it('omitColumnFilter não muta o original', () => {
    const src = { a: '1', b: '2' };
    expect(omitColumnFilter(src, 'a')).toEqual({ b: '2' });
    expect(src).toEqual({ a: '1', b: '2' });
  });

  it('clampContextMenuPosition mantém na viewport', () => {
    expect(clampContextMenuPosition(1000, 800, 1024, 768)).toEqual({ top: 588, left: 774 });
    expect(clampContextMenuPosition(10, 20, 1024, 768)).toEqual({ top: 20, left: 10 });
  });

  it('formatFilterValueLabel', () => {
    expect(formatFilterValueLabel(null)).toBe('[NULL]');
    expect(formatFilterValueLabel(3)).toBe('3');
  });
});
