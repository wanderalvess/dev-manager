import { describe, expect, it, vi } from 'vitest';
import type { KarafBundleInfo } from '../../../shared/types';
import type { KarafContext } from './karafContext';
import { buildWiringConflicts, detectWiringConflicts, findDuplicateBundles } from './karafWiring';

const makeBundle = (partial: Partial<KarafBundleInfo>): KarafBundleInfo => ({
  id: '1',
  state: 'Active',
  name: 'Bundle',
  version: '1.0.0',
  symbolicName: 'br.com.app',
  ...partial
});

describe('karafWiring', () => {
  it('findDuplicateBundles agrupa por symbolicName e sinaliza várias versões ativas', () => {
    const dups = findDuplicateBundles([
      makeBundle({ id: '1', version: '1.0.0' }),
      makeBundle({ id: '2', version: '2.0.0' }),
      makeBundle({ id: '3', symbolicName: 'outro' })
    ]);
    expect(dups).toHaveLength(1);
    expect(dups[0].hasMultipleActive).toBe(true);
    expect(dups[0].instances.map((i) => i.id)).toEqual(['1', '2']);
  });

  it('buildWiringConflicts classifica severidade por tipo de problema', () => {
    const dups = findDuplicateBundles([makeBundle({ id: '1' }), makeBundle({ id: '2', state: 'Resolved' })]);
    const conflicts = buildWiringConflicts(dups, [makeBundle({ id: '2', state: 'Resolved' }), makeBundle({ id: '9', state: 'Unknown' })]);
    expect(conflicts.map((c) => c.severity)).toEqual(['medium', 'medium', 'low']);
  });

  it('detectWiringConflicts devolve null sem bundles e roda bundle:diag nos não ativos', async () => {
    const executeKarafCommand = vi.fn().mockResolvedValue({ code: 0, stdout: ' falta pacote ', stderr: '' });
    const listBundlesParsed = vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
      makeBundle({ id: '1' }),
      makeBundle({ id: '5', state: 'Installed', symbolicName: 'x' })
    ]);
    const ctx = { listBundlesParsed, executeKarafCommand } as unknown as KarafContext;

    expect(await detectWiringConflicts(ctx)).toBeNull();

    const report = await detectWiringConflicts(ctx);
    expect(report?.healthy).toBe(false);
    expect(report?.summary.nonActiveBundlesCount).toBe(1);
    expect(report?.unresolvedDiagnostics[0]).toMatchObject({ id: '5', diag: 'falta pacote' });
    expect(executeKarafCommand).toHaveBeenCalledWith('bundle:diag 5', expect.any(Function), undefined);
  });
});
