import React from 'react';
import { useKarafDeployHistory } from '../../../hooks/karaf/useKarafDeployHistory';
import { KarafDeployHistoryHeader } from '../history/KarafDeployHistoryHeader';
import { KarafDeployHistoryStats } from '../history/KarafDeployHistoryStats';
import { KarafDeployHistoryToolbar } from '../history/KarafDeployHistoryToolbar';
import {
  KarafDeployHistoryLoading,
  KarafDeployHistoryBlueprint,
  KarafDeployHistoryNoResults
} from '../history/KarafDeployHistoryEmptyStates';
import { KarafDeployHistoryEntryCard } from '../history/KarafDeployHistoryEntryCard';
import { KarafDeployHistoryFooter } from '../history/KarafDeployHistoryFooter';
import { Modal } from '../../ui/Modal';

interface KarafDeployHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInstallWithCoords?: (coords: string, version?: string) => void;
}

export const KarafDeployHistoryModal: React.FC<KarafDeployHistoryModalProps> = ({
  isOpen,
  onClose,
  onOpenInstallWithCoords
}) => {
  const {
    deployHistory,
    isLoadingDeployHistory,
    deployHistorySearch,
    setDeployHistorySearch,
    deployHistoryFilter,
    setDeployHistoryFilter,
    expandedErrorId,
    setExpandedErrorId,
    copyDeployCoord,
    copiedDeployCoordKey,
    fetchDeployHistory,
    deployStats,
    filteredDeployHistory,
    clearFilters
  } = useKarafDeployHistory(isOpen);

  if (!isOpen) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] w-full max-w-6xl xl:max-w-7xl h-[88vh] flex flex-col overflow-hidden animate-fade-in text-foreground font-sans"
      closeOnBackdrop={false}
    >
      <KarafDeployHistoryHeader
        isLoading={isLoadingDeployHistory}
        onReload={fetchDeployHistory}
        onClose={onClose}
      />

      <KarafDeployHistoryStats stats={deployStats} />

      <KarafDeployHistoryToolbar
        search={deployHistorySearch}
        onSearchChange={setDeployHistorySearch}
        filter={deployHistoryFilter}
        onFilterChange={setDeployHistoryFilter}
        stats={deployStats}
      />

      {/* Área Principal de Conteúdo */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {isLoadingDeployHistory ? (
          <KarafDeployHistoryLoading />
        ) : deployHistory.length === 0 ? (
          <KarafDeployHistoryBlueprint
            onInstall={() => {
              onClose();
              onOpenInstallWithCoords?.('');
            }}
          />
        ) : filteredDeployHistory.length === 0 ? (
          <KarafDeployHistoryNoResults onClearFilters={clearFilters} />
        ) : (
          filteredDeployHistory.map((entry) => (
            <KarafDeployHistoryEntryCard
              key={entry.id}
              entry={entry}
              isExpanded={expandedErrorId === entry.id}
              isCopied={copiedDeployCoordKey === entry.id}
              onToggleExpanded={() => setExpandedErrorId(expandedErrorId === entry.id ? null : entry.id)}
              onCopy={(coords) => copyDeployCoord(coords, entry.id)}
              onUseInInstaller={
                onOpenInstallWithCoords
                  ? (coords, version) => {
                      onClose();
                      onOpenInstallWithCoords(coords, version);
                    }
                  : undefined
              }
            />
          ))
        )}
      </div>

      <KarafDeployHistoryFooter onClose={onClose} />
    </Modal>
  );
};
