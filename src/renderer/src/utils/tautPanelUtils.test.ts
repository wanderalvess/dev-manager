import { describe, it, expect } from 'vitest';
import {
  toggleTautTag,
  buildEffectiveTagsString,
  filterCoverageItems,
  countSpecTests
} from './tautPanelUtils';

describe('tautPanelUtils', () => {
  it('toggleTautTag adiciona e remove', () => {
    expect(toggleTautTag(['a'], 'b')).toEqual(['a', 'b']);
    expect(toggleTautTag(['a', 'b'], 'a')).toEqual(['b']);
  });

  it('buildEffectiveTagsString mescla sem duplicar', () => {
    expect(buildEffectiveTagsString(['esteira'], ' critico, esteira ,, x ')).toBe('esteira,critico,x');
    expect(buildEffectiveTagsString(['a'], '   ')).toBe('a');
    expect(buildEffectiveTagsString([], '')).toBe('');
  });

  it('filterCoverageItems filtra por busca e status', () => {
    const report = {
      items: [
        { key: 'DDWMISSI-T1', status: 'automated', filePath: 'cypress/Pedido.cy.ts' },
        { key: 'DDWMISSI-T2', status: 'pending' }
      ]
    } as any;
    expect(filterCoverageItems(null, '', 'all')).toEqual([]);
    expect(filterCoverageItems(report, '', 'all')).toHaveLength(2);
    expect(filterCoverageItems(report, 'pedido', 'all')).toHaveLength(1);
    expect(filterCoverageItems(report, '', 'pending')[0].key).toBe('DDWMISSI-T2');
    expect(filterCoverageItems(report, 't2', 'automated')).toHaveLength(0);
  });

  it('countSpecTests soma testCount', () => {
    expect(countSpecTests([{ testCount: 2 }, { testCount: 3 }])).toBe(5);
    expect(countSpecTests([])).toBe(0);
  });
});
