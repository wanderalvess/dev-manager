import React from 'react';
import { GitProjectInfo, KarafBundleInfo } from '../../../../shared/types';
import { useKarafBundleSubmodals } from '../../hooks/karaf/useKarafBundleSubmodals';
import { Routine801CatalogModal } from '../Routine801CatalogModal';
import { KarafInlineDiagModal } from './modals/KarafInlineDiagModal';
import { KarafLogModal } from './modals/KarafLogModal';
import { KarafDeployHistoryModal } from './modals/KarafDeployHistoryModal';
import { KarafSnapshotModal } from './modals/KarafSnapshotModal';
import { KarafDetailsModal } from './modals/KarafDetailsModal';
import { KarafReinstallModal } from './modals/KarafReinstallModal';
import { KarafUninstallModal } from './modals/KarafUninstallModal';
import { KarafInstallModal } from './modals/KarafInstallModal';
import { KarafFeaturesModal } from './modals/KarafFeaturesModal';

interface KarafBundleSubmodalsProps {
  submodals: ReturnType<typeof useKarafBundleSubmodals>;
  bundles: KarafBundleInfo[];
  projects: GitProjectInfo[];
  inlineDiagBundle: { id: string; name: string; diag: string } | null;
  isLoadingInlineDiag: boolean;
  onCloseInlineDiag: () => void;
  onFetchBundles: () => void;
}

export const KarafBundleSubmodals: React.FC<KarafBundleSubmodalsProps> = ({
  submodals: s,
  bundles,
  projects,
  inlineDiagBundle,
  isLoadingInlineDiag,
  onCloseInlineDiag,
  onFetchBundles
}) => (
  <>
    <KarafUninstallModal
      target={s.uninstallTarget}
      onClose={() => s.setUninstallTarget(null)}
      onSuccess={() => onFetchBundles()}
    />

    <KarafInstallModal
      isOpen={s.isInstallModalOpen}
      updatingTargetBundle={s.updatingTargetBundle}
      projects={projects}
      initialCoords={s.initialInstallCoords}
      initialVersion={s.initialInstallVersion}
      onClose={() => s.setIsInstallModalOpen(false)}
      onSuccess={() => onFetchBundles()}
    />

    <KarafReinstallModal
      target={s.reinstallTarget}
      projects={projects}
      onClose={() => s.setReinstallTarget(null)}
      onSuccess={() => onFetchBundles()}
    />

    <KarafDetailsModal
      target={s.detailsTarget}
      onClose={() => s.setDetailsTarget(null)}
    />

    <KarafSnapshotModal
      isOpen={s.isSnapshotModalOpen}
      onClose={() => s.setIsSnapshotModalOpen(false)}
      bundles={bundles}
      snapshots={s.snapshots}
      onSnapshotsChange={s.setSnapshots}
    />

    <KarafDeployHistoryModal
      isOpen={s.isDeployHistoryModalOpen}
      onClose={() => s.setIsDeployHistoryModalOpen(false)}
      onOpenInstallWithCoords={s.handleOpenInstallWithCoords}
    />

    <KarafLogModal
      isOpen={s.isLogModalOpen}
      onClose={() => s.setIsLogModalOpen(false)}
    />

    <KarafInlineDiagModal
      bundle={inlineDiagBundle}
      isLoading={isLoadingInlineDiag}
      onClose={onCloseInlineDiag}
    />

    <KarafFeaturesModal
      isOpen={s.isFeaturesModalOpen}
      onClose={() => s.setIsFeaturesModalOpen(false)}
      onBundlesChanged={() => onFetchBundles()}
    />

    {/* Modal Catálogo Oficial WinThor - Rotina 801 */}
    <Routine801CatalogModal
      isOpen={s.isRoutine801ModalOpen}
      onClose={() => s.setIsRoutine801ModalOpen(false)}
    />
  </>
);
