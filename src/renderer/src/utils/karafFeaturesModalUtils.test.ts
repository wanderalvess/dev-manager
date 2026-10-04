import { describe, it, expect } from 'vitest';
import type { KarafFeatureInfo } from '../../../shared/types';
import { isFeatureInstalled, countInstalledFeatures } from './karafFeaturesModalUtils';

const makeFeature = (overrides: Partial<KarafFeatureInfo> = {}): KarafFeatureInfo =>
  ({ name: 'feat', version: '1.0.0', ...overrides }) as KarafFeatureInfo;

describe('isFeatureInstalled', () => {
  it('prioriza o campo installed quando definido', () => {
    expect(isFeatureInstalled(makeFeature({ installed: false, state: 'Started' }))).toBe(false);
    expect(isFeatureInstalled(makeFeature({ installed: true, state: 'Uninstalled' }))).toBe(true);
  });

  it('infere pelo estado quando installed é indefinido', () => {
    expect(isFeatureInstalled(makeFeature({ state: 'Started' }))).toBe(true);
    expect(isFeatureInstalled(makeFeature({ state: 'INSTALLED' }))).toBe(true);
    expect(isFeatureInstalled(makeFeature({ state: 'Uninstalled' }))).toBe(false);
    expect(isFeatureInstalled(makeFeature({}))).toBe(false);
  });
});

describe('countInstalledFeatures', () => {
  it('conta apenas as instaladas', () => {
    const list = [
      makeFeature({ installed: true }),
      makeFeature({ state: 'Started' }),
      makeFeature({ state: 'Uninstalled' })
    ];
    expect(countInstalledFeatures(list)).toBe(2);
    expect(countInstalledFeatures([])).toBe(0);
  });
});
