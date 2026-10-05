import React from 'react';
import type { WslDistroInfo, WslSnapshotFileInfo } from '../../../../../shared/types';
import { useWslSnapshotsModalForm } from '../../../hooks/containers/useWslSnapshotsModalForm';
import { WslSnapshotsHeader } from '../snapshots/WslSnapshotsHeader';
import { WslSnapshotsFeedback } from '../snapshots/WslSnapshotsFeedback';
import { WslSnapshotsDirBar } from '../snapshots/WslSnapshotsDirBar';
import { WslSnapshotsList } from '../snapshots/WslSnapshotsList';
import { WslSnapshotImportPanel } from '../snapshots/WslSnapshotImportPanel';
import { WslSnapshotExportPanel } from '../snapshots/WslSnapshotExportPanel';
import { WslSnapshotsFooter } from '../snapshots/WslSnapshotsFooter';

export interface WslSnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotsList: WslSnapshotFileInfo[];
  snapshotsDirInput: string;
  setSnapshotsDirInput: (dir: string) => void;
  isLoadingSnapshots: boolean;
  availableDistros: WslDistroInfo[];
  onLoadSnapshots: () => void;
  onSaveSnapshotsDir: (dir: string) => void;
  onImportSnapshot: (params: { distroName: string; installDir: string; tarPath: string }) => Promise<void> | void;
  onExportSnapshot: (params: { distroName: string; exportPath: string }) => Promise<void> | void;
  onUnregisterDistro: (distroName: string) => Promise<void> | void;
  snapshotImporting: boolean;
  snapshotExporting: boolean;
  snapshotUnregistering: string | null;
  snapshotFeedback: { success: boolean; message: string } | null;
  setSnapshotFeedback: (val: { success: boolean; message: string } | null) => void;
}

export const WslSnapshotsModal: React.FC<WslSnapshotsModalProps> = ({
  isOpen,
  onClose,
  snapshotsList,
  snapshotsDirInput,
  setSnapshotsDirInput,
  isLoadingSnapshots,
  availableDistros,
  onLoadSnapshots,
  onSaveSnapshotsDir,
  onImportSnapshot,
  onExportSnapshot,
  onUnregisterDistro,
  snapshotImporting,
  snapshotExporting,
  snapshotUnregistering,
  snapshotFeedback,
  setSnapshotFeedback
}) => {
  const form = useWslSnapshotsModalForm({ onImportSnapshot, onExportSnapshot });

  if (!isOpen) return null;

  const handleClose = () => {
    setSnapshotFeedback(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        <WslSnapshotsHeader onClose={handleClose} />

        {snapshotFeedback && (
          <WslSnapshotsFeedback feedback={snapshotFeedback} onDismiss={() => setSnapshotFeedback(null)} />
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-5 space-y-5 [scrollbar-width:thin]">
          <WslSnapshotsDirBar
            snapshotsDirInput={snapshotsDirInput}
            isLoadingSnapshots={isLoadingSnapshots}
            onDirChange={setSnapshotsDirInput}
            onLoadSnapshots={onLoadSnapshots}
            onSaveSnapshotsDir={onSaveSnapshotsDir}
          />
          <WslSnapshotsList
            snapshotsList={snapshotsList}
            isLoadingSnapshots={isLoadingSnapshots}
            selectedTarPath={form.importTarPath}
            onSelect={form.selectSnapshot}
          />
          <WslSnapshotImportPanel
            name={form.importName}
            installDir={form.importInstallDir}
            tarPath={form.importTarPath}
            importing={snapshotImporting}
            onNameChange={form.setImportName}
            onInstallDirChange={form.setImportInstallDir}
            onTarPathChange={form.setImportTarPath}
            onImport={form.handleImport}
          />
          <WslSnapshotExportPanel
            availableDistros={availableDistros}
            distro={form.exportDistro}
            exportPath={form.exportPath}
            exporting={snapshotExporting}
            unregistering={snapshotUnregistering}
            onDistroChange={form.changeExportDistro}
            onExportPathChange={form.setExportPath}
            onExport={form.handleExport}
            onUnregister={onUnregisterDistro}
          />
        </div>

        <WslSnapshotsFooter onClose={handleClose} />
      </div>
    </div>
  );
};
