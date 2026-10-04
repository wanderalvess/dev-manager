import React, { useState, useMemo, useRef } from 'react';
import { GitProjectInfo } from '../../../shared/types';
import {
  computeBundleStats,
  computeScopeCounts,
  filterBundles,
  ScopeFilter,
  StatusFilter
} from '../utils/karafBundleUtils';
import { useKarafBundleData } from '../hooks/karaf/useKarafBundleData';
import { useKarafBundleActions } from '../hooks/karaf/useKarafBundleActions';
import { useKarafBundleSubmodals } from '../hooks/karaf/useKarafBundleSubmodals';
import { useKarafBundleShortcuts } from '../hooks/karaf/useKarafBundleShortcuts';
import { KarafBundleHeader } from './karaf/KarafBundleHeader';
import { KarafBundleScopeBar } from './karaf/KarafBundleScopeBar';
import { KarafBundleTable } from './karaf/KarafBundleTable';
import { KarafBundleErrorBanner } from './karaf/KarafBundleErrorBanner';
import { KarafBundleSubmodals } from './karaf/KarafBundleSubmodals';

interface KarafBundleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: GitProjectInfo[];
}

export const KarafBundleManagerModal: React.FC<KarafBundleManagerModalProps> = ({
  isOpen,
  onClose,
  projects = []
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const searchRef = useRef<HTMLInputElement>(null);

  const data = useKarafBundleData(isOpen);
  const { bundles, fetchBundles } = data;
  const submodals = useKarafBundleSubmodals();

  const stats = useMemo(() => computeBundleStats(bundles), [bundles]);
  const scopeCounts = useMemo(() => computeScopeCounts(bundles, projects), [bundles, projects]);
  const filteredBundles = useMemo(
    () => filterBundles(bundles, { search, statusFilter, scopeFilter }, projects),
    [bundles, search, statusFilter, scopeFilter, projects]
  );

  const actions = useKarafBundleActions({
    filteredBundles,
    scopeFilter,
    projects,
    fetchBundles,
    setErrorBanner: data.setErrorBanner
  });

  const hasOpenSubmodal = Boolean(
    submodals.uninstallTarget ||
    submodals.reinstallTarget ||
    submodals.detailsTarget ||
    submodals.isInstallModalOpen ||
    submodals.isFeaturesModalOpen ||
    submodals.isRoutine801ModalOpen ||
    submodals.isSnapshotModalOpen ||
    submodals.isDeployHistoryModalOpen ||
    submodals.isLogModalOpen ||
    actions.inlineDiagBundle
  );
  useKarafBundleShortcuts(isOpen, onClose, searchRef, hasOpenSubmodal);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-[97vw] 2xl:max-w-[1720px] h-[94vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Cabeçalho */}
        <KarafBundleHeader
          karafStatus={data.karafStatus}
          stats={stats}
          snapshotsCount={submodals.snapshots.length}
          isLoading={data.isLoading}
          isStartingKaraf={data.isStartingKaraf}
          isStoppingKaraf={data.isStoppingKaraf}
          onLaunchKarafDebug={data.handleLaunchKarafDebug}
          onStartEmbeddedKaraf={data.handleStartEmbeddedKaraf}
          onStopKaraf={data.handleStopKaraf}
          onExportBundles={actions.handleExportBundles}
          onOpenLog={() => submodals.setIsLogModalOpen(true)}
          onOpenSnapshots={() => submodals.setIsSnapshotModalOpen(true)}
          onOpenFeatures={() => submodals.setIsFeaturesModalOpen(true)}
          onOpenDeployHistory={() => submodals.setIsDeployHistoryModalOpen(true)}
          onOpenCatalog801={() => submodals.setIsRoutine801ModalOpen(true)}
          onOpenInstall={() => submodals.handleOpenInstall()}
          onRefresh={() => fetchBundles()}
          onClose={onClose}
        />

        {/* Erro de conexão / aviso */}
        {data.errorBanner && (
          <KarafBundleErrorBanner
            message={data.errorBanner}
            karafStatus={data.karafStatus}
            isStartingKaraf={data.isStartingKaraf}
            onLaunchKarafDebug={data.handleLaunchKarafDebug}
            onDismiss={() => data.setErrorBanner(null)}
          />
        )}

        {/* Barra de Escopos Inteligentes (Smart Scope Tabs) */}
        <KarafBundleScopeBar
          scopeFilter={scopeFilter}
          onScopeFilterChange={setScopeFilter}
          scopeCounts={scopeCounts}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Tabela de Bundles e Ações em Lote */}
        <KarafBundleTable
          bundles={bundles}
          filteredBundles={filteredBundles}
          projects={projects}
          search={search}
          onSearchChange={setSearch}
          searchRef={searchRef}
          selectedBundleIds={actions.selectedBundleIds}
          onToggleSelectBundle={actions.handleToggleSelectBundle}
          onSelectAllVisible={actions.handleSelectAllVisible}
          onClearSelection={actions.handleClearSelection}
          karafStatus={data.karafStatus}
          isLoading={data.isLoading}
          isStartingKaraf={data.isStartingKaraf}
          actionLoading={actions.actionLoading}
          rebuildingBundleId={actions.rebuildingBundleId}
          isBatchActionLoading={actions.isBatchActionLoading}
          onLaunchKarafDebug={data.handleLaunchKarafDebug}
          onFetchBundles={fetchBundles}
          onOneClickRebuild={actions.handleOneClickRebuild}
          onBasicAction={actions.handleBasicAction}
          onOpenInlineDiag={actions.handleOpenInlineDiag}
          onOpenReinstall={(b) => submodals.setReinstallTarget(b)}
          onOpenInstall={(b) => submodals.handleOpenInstall(b)}
          onOpenDetails={(b) => submodals.setDetailsTarget(b)}
          onOpenUninstall={(b) => submodals.setUninstallTarget(b)}
          onBatchAction={actions.handleBatchAction}
        />
      </div>

      {/* Sub-modais desacoplados */}
      <KarafBundleSubmodals
        submodals={submodals}
        bundles={bundles}
        projects={projects}
        inlineDiagBundle={actions.inlineDiagBundle}
        isLoadingInlineDiag={actions.isLoadingInlineDiag}
        onCloseInlineDiag={() => actions.setInlineDiagBundle(null)}
        onFetchBundles={() => fetchBundles()}
      />
    </div>
  );
};
