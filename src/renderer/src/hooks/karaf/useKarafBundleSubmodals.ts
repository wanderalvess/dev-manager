import { useState } from 'react';
import { KarafBundleInfo, BundleSnapshot } from '../../../../shared/types';

/** Estado de abertura dos sub-modais do gerenciador de bundles. */
export function useKarafBundleSubmodals() {
  const [uninstallTarget, setUninstallTarget] = useState<KarafBundleInfo | null>(null);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [isRoutine801ModalOpen, setIsRoutine801ModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [updatingTargetBundle, setUpdatingTargetBundle] = useState<KarafBundleInfo | null>(null);
  const [initialInstallCoords, setInitialInstallCoords] = useState('');
  const [initialInstallVersion, setInitialInstallVersion] = useState('');
  const [reinstallTarget, setReinstallTarget] = useState<KarafBundleInfo | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<KarafBundleInfo | null>(null);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<BundleSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('devManager:bundleSnapshots');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isDeployHistoryModalOpen, setIsDeployHistoryModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const handleOpenInstall = (bundle?: KarafBundleInfo) => {
    setUpdatingTargetBundle(bundle || null);
    setInitialInstallCoords('');
    setInitialInstallVersion('');
    setIsInstallModalOpen(true);
  };

  const handleOpenInstallWithCoords = (coords: string, version?: string) => {
    setUpdatingTargetBundle(null);
    setInitialInstallCoords(coords);
    setInitialInstallVersion(version || '');
    setIsInstallModalOpen(true);
  };

  return {
    uninstallTarget,
    setUninstallTarget,
    isFeaturesModalOpen,
    setIsFeaturesModalOpen,
    isRoutine801ModalOpen,
    setIsRoutine801ModalOpen,
    isInstallModalOpen,
    setIsInstallModalOpen,
    updatingTargetBundle,
    initialInstallCoords,
    initialInstallVersion,
    reinstallTarget,
    setReinstallTarget,
    detailsTarget,
    setDetailsTarget,
    isSnapshotModalOpen,
    setIsSnapshotModalOpen,
    snapshots,
    setSnapshots,
    isDeployHistoryModalOpen,
    setIsDeployHistoryModalOpen,
    isLogModalOpen,
    setIsLogModalOpen,
    handleOpenInstall,
    handleOpenInstallWithCoords
  };
}
