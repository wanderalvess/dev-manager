import { describe, expect, it } from 'vitest';
import type { BundleSnapshotDiff, KarafBundleInfo } from '../../../shared/types';
import { buildSnapshot, isDiffEmpty } from './karafSnapshotModalUtils';

const bundle = (id: string): KarafBundleInfo =>
  ({ id, name: `b${id}`, version: '1.0.0', state: 'Active', symbolicName: `sn.${id}`, location: 'mvn:x' }) as KarafBundleInfo;

describe('buildSnapshot', () => {
  const now = new Date(2024, 0, 2, 3, 4, 5);

  it('usa o rótulo informado (com trim)', () => {
    const snap = buildSnapshot([bundle('1')], '  Pré-deploy  ', 0, now);
    expect(snap.label).toBe('Pré-deploy');
    expect(snap.bundleCount).toBe(1);
    expect(snap.id).toBe(`snap_${now.getTime()}`);
  });

  it('gera rótulo padrão numerado quando vazio', () => {
    const snap = buildSnapshot([bundle('1'), bundle('2')], '   ', 2, now);
    expect(snap.label.startsWith('Snapshot #3 (')).toBe(true);
    expect(snap.bundles).toHaveLength(2);
  });
});

describe('isDiffEmpty', () => {
  const empty: BundleSnapshotDiff = { added: [], removed: [], versionChanged: [], stateChanged: [], unchanged: [] };

  it('null não é vazio', () => {
    expect(isDiffEmpty(null)).toBe(false);
  });

  it('detecta diff sem mudanças', () => {
    expect(isDiffEmpty(empty)).toBe(true);
    expect(isDiffEmpty({ ...empty, added: [bundle('1')] })).toBe(false);
  });
});
