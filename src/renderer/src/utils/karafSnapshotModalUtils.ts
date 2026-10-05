/**
 * Lógica pura extraída de KarafSnapshotModal.tsx: montagem do snapshot a partir dos
 * bundles atuais, persistência no localStorage e detecção de diff vazio.
 */
import type { BundleSnapshot, BundleSnapshotDiff, KarafBundleInfo } from '../../../shared/types';

export const SNAPSHOTS_STORAGE_KEY = 'devManager:bundleSnapshots';

/** Monta um snapshot; `now` é injetável para manter a função determinística em teste. */
export function buildSnapshot(
  bundles: KarafBundleInfo[],
  label: string,
  existingCount: number,
  now: Date = new Date()
): BundleSnapshot {
  return {
    id: `snap_${now.getTime()}`,
    label: label.trim() || `Snapshot #${existingCount + 1} (${now.toLocaleTimeString('pt-BR')})`,
    createdAt: now.toLocaleString('pt-BR'),
    bundleCount: bundles.length,
    bundles: bundles.map((b) => ({
      id: b.id,
      name: b.name,
      version: b.version,
      state: b.state,
      symbolicName: b.symbolicName,
      location: b.location
    }))
  };
}

/** Persiste a lista; falhas de storage (quota/modo privado) não devem quebrar a UI. */
export function persistSnapshots(snapshots: BundleSnapshot[]): void {
  try {
    localStorage.setItem(SNAPSHOTS_STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    // Ignore storage errors
  }
}

export function isDiffEmpty(diff: BundleSnapshotDiff | null): boolean {
  return (
    !!diff &&
    diff.versionChanged.length === 0 &&
    diff.stateChanged.length === 0 &&
    diff.added.length === 0 &&
    diff.removed.length === 0
  );
}
