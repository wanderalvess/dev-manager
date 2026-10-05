import { useMemo, useState } from 'react';
import type React from 'react';
import type { BundleSnapshot, BundleSnapshotDiff, KarafBundleInfo } from '../../../../shared/types';
import { computeSnapshotDiff } from '../../utils/karafBundleUtils';
import { buildSnapshot, persistSnapshots } from '../../utils/karafSnapshotModalUtils';

interface UseKarafSnapshotModalParams {
  bundles: KarafBundleInfo[];
  snapshots: BundleSnapshot[];
  onSnapshotsChange: (snapshots: BundleSnapshot[]) => void;
}

export function useKarafSnapshotModal({ bundles, snapshots, onSnapshotsChange }: UseKarafSnapshotModalParams) {
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState<BundleSnapshot | null>(null);

  const handleCreateSnapshot = () => {
    if (bundles.length === 0) return;
    const snap = buildSnapshot(bundles, newSnapshotLabel, snapshots.length);
    const updated = [snap, ...snapshots];
    onSnapshotsChange(updated);
    persistSnapshots(updated);
    setNewSnapshotLabel('');
    setSelectedSnapshot(snap);
  };

  const handleDeleteSnapshot = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = snapshots.filter((s) => s.id !== id);
    onSnapshotsChange(updated);
    if (selectedSnapshot?.id === id) setSelectedSnapshot(null);
    persistSnapshots(updated);
  };

  const snapshotDiff = useMemo<BundleSnapshotDiff | null>(
    () => computeSnapshotDiff(bundles, selectedSnapshot),
    [selectedSnapshot, bundles]
  );

  return {
    newSnapshotLabel,
    setNewSnapshotLabel,
    selectedSnapshot,
    setSelectedSnapshot,
    snapshotDiff,
    handleCreateSnapshot,
    handleDeleteSnapshot
  };
}
