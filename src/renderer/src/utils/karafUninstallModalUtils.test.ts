import { describe, expect, it } from 'vitest';
import type { KarafFeatureInfo } from '../../../shared/types';
import {
  buildFeatureUninstallPreview,
  findMatchingFeature,
  getBundleStateBadgeClass,
  getBundleStateDotClass,
  inferFeatureNameFromBundle,
  normalizeFeatureList
} from './karafUninstallModalUtils';

const makeFeature = (name: string, version = '1.0'): KarafFeatureInfo => ({ name, version }) as KarafFeatureInfo;

describe('inferFeatureNameFromBundle', () => {
  it('remove prefixo corporativo e sufixo de módulo', () => {
    expect(inferFeatureNameFromBundle({ symbolicName: 'com.pcsist.vendas-service', name: 'x' })).toBe('vendas');
    expect(inferFeatureNameFromBundle({ symbolicName: 'br.com.totvs.foo-impl', name: 'x' })).toBe('foo');
  });

  it('cai no name quando não há symbolicName', () => {
    expect(inferFeatureNameFromBundle({ name: 'abc-api' } as any)).toBe('abc');
  });
});

describe('normalizeFeatureList', () => {
  it('aceita array, objeto com features e valores inválidos', () => {
    const list = [makeFeature('a')];
    expect(normalizeFeatureList(list)).toBe(list);
    expect(normalizeFeatureList({ features: list })).toBe(list);
    expect(normalizeFeatureList(null)).toEqual([]);
  });
});

describe('findMatchingFeature', () => {
  const list = [makeFeature('Vendas'), makeFeature('estoque-core')];

  it('casa por igualdade, contém e é contido (case-insensitive)', () => {
    expect(findMatchingFeature(list, 'vendas')?.name).toBe('Vendas');
    expect(findMatchingFeature(list, 'vendas-extra')?.name).toBe('Vendas');
    expect(findMatchingFeature(list, 'estoque')?.name).toBe('estoque-core');
    expect(findMatchingFeature(list, 'nada')).toBeUndefined();
  });
});

describe('buildFeatureUninstallPreview', () => {
  it('usa placeholder e versão opcional', () => {
    expect(buildFeatureUninstallPreview('', '')).toBe('feature:uninstall -r <nome-feature>');
    expect(buildFeatureUninstallPreview('f', '1.0')).toBe('feature:uninstall -r f/1.0');
  });
});

describe('classes de estado do bundle', () => {
  it('mapeia estados conhecidos e fallback', () => {
    expect(getBundleStateBadgeClass('Active')).toContain('emerald');
    expect(getBundleStateBadgeClass('Resolved')).toContain('amber');
    expect(getBundleStateBadgeClass('Installed')).toContain('blue');
    expect(getBundleStateBadgeClass('Other')).toContain('bg-muted');
    expect(getBundleStateDotClass('Active')).toBe('bg-emerald-500');
    expect(getBundleStateDotClass('Resolved')).toBe('bg-amber-500');
    expect(getBundleStateDotClass('Other')).toBe('bg-blue-500');
  });
});
