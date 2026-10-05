import React from 'react';
import { GitProjectInfo, KarafBundleInfo } from '../../../../shared/types';
import { isWorkspaceBundle, KarafContainerStatus } from '../../utils/karafBundleUtils';
import { resolveKarafBundleTableView } from '../../utils/karafBundleTableView';
import { KarafBundleTableToolbar } from './table/KarafBundleTableToolbar';
import { KarafBundleEmptyState } from './table/KarafBundleEmptyState';
import { KarafBundleTableHeader } from './table/KarafBundleTableHeader';
import { KarafBundleRow } from './table/KarafBundleRow';
import { KarafBundleBatchBar } from './table/KarafBundleBatchBar';

interface KarafBundleTableProps {
  bundles: KarafBundleInfo[];
  filteredBundles: KarafBundleInfo[];
  projects: GitProjectInfo[];
  search: string;
  onSearchChange: (search: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  selectedBundleIds: Set<string>;
  onToggleSelectBundle: (id: string) => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  karafStatus: KarafContainerStatus;
  isLoading: boolean;
  isStartingKaraf: boolean;
  actionLoading: Record<string, string>;
  rebuildingBundleId: string | null;
  isBatchActionLoading: boolean;
  onLaunchKarafDebug: () => void;
  onFetchBundles: (isSilent?: boolean) => void;
  onOneClickRebuild: (bundle: KarafBundleInfo) => void;
  onBasicAction: (action: 'start' | 'stop' | 'restart' | 'refresh' | 'resolve', bundleId: string) => void;
  onOpenInlineDiag: (bundle: KarafBundleInfo) => void;
  onOpenReinstall: (bundle: KarafBundleInfo) => void;
  onOpenInstall: (bundle: KarafBundleInfo) => void;
  onOpenDetails: (bundle: KarafBundleInfo) => void;
  onOpenUninstall: (bundle: KarafBundleInfo) => void;
  onBatchAction: (action: 'start' | 'stop' | 'restart' | 'refresh' | 'uninstall') => void;
}

export const KarafBundleTable: React.FC<KarafBundleTableProps> = ({
  bundles,
  filteredBundles,
  projects,
  search,
  onSearchChange,
  searchRef,
  selectedBundleIds,
  onToggleSelectBundle,
  onSelectAllVisible,
  onClearSelection,
  karafStatus,
  isLoading,
  isStartingKaraf,
  actionLoading,
  rebuildingBundleId,
  isBatchActionLoading,
  onLaunchKarafDebug,
  onFetchBundles,
  onOneClickRebuild,
  onBasicAction,
  onOpenInlineDiag,
  onOpenReinstall,
  onOpenInstall,
  onOpenDetails,
  onOpenUninstall,
  onBatchAction
}) => {
  const view = resolveKarafBundleTableView({
    isLoading,
    filteredCount: filteredBundles.length,
    totalCount: bundles.length,
    karafStatus
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Barra de Filtros e Busca */}
      <KarafBundleTableToolbar
        search={search}
        onSearchChange={onSearchChange}
        searchRef={searchRef}
        selectedCount={selectedBundleIds.size}
        filteredCount={filteredBundles.length}
        totalCount={bundles.length}
        onClearSelection={onClearSelection}
      />

      {/* Conteúdo da Tabela / Estados vazios */}
      <div className="flex-1 overflow-auto relative">
        {view !== 'table' ? (
          <KarafBundleEmptyState
            kind={view}
            isLoading={isLoading}
            isStartingKaraf={isStartingKaraf}
            onLaunchKarafDebug={onLaunchKarafDebug}
            onFetchBundles={onFetchBundles}
          />
        ) : (
          <div className="min-w-full relative pb-28">
            <table className="min-w-full text-xs font-mono border-separate border-spacing-0">
              <KarafBundleTableHeader
                filteredCount={filteredBundles.length}
                selectedCount={selectedBundleIds.size}
                onSelectAllVisible={onSelectAllVisible}
              />
              <tbody>
                {filteredBundles.map((b) => (
                  <KarafBundleRow
                    key={b.id}
                    bundle={b}
                    isSelected={selectedBundleIds.has(b.id)}
                    isWorkspace={isWorkspaceBundle(b, projects)}
                    isRowLoading={Boolean(actionLoading[b.id])}
                    isRebuilding={rebuildingBundleId === b.id}
                    onToggleSelectBundle={onToggleSelectBundle}
                    onOpenInlineDiag={onOpenInlineDiag}
                    onOneClickRebuild={onOneClickRebuild}
                    onBasicAction={onBasicAction}
                    onOpenReinstall={onOpenReinstall}
                    onOpenInstall={onOpenInstall}
                    onOpenDetails={onOpenDetails}
                    onOpenUninstall={onOpenUninstall}
                  />
                ))}
              </tbody>
            </table>

            {/* Barra Flutuante de Ações em Lote */}
            {selectedBundleIds.size > 0 && (
              <KarafBundleBatchBar
                selectedCount={selectedBundleIds.size}
                isBatchActionLoading={isBatchActionLoading}
                onBatchAction={onBatchAction}
                onClearSelection={onClearSelection}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
