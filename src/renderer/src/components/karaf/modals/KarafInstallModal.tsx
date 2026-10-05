import React from 'react';
import type { GitProjectInfo, KarafBundleInfo } from '../../../../../shared/types';
import { useKarafInstallModal } from '../../../hooks/karaf/useKarafInstallModal';
import { KarafInstallModalHeader } from '../install/KarafInstallModalHeader';
import { KarafInstallSourceSelector } from '../install/KarafInstallSourceSelector';
import { KarafInstallSourceFields } from '../install/KarafInstallSourceFields';
import { KarafInstallOptionsBar } from '../install/KarafInstallOptionsBar';
import { KarafInstallDepReport } from '../install/KarafInstallDepReport';
import { KarafInstallModalFooter } from '../install/KarafInstallModalFooter';

interface KarafInstallModalProps {
  isOpen: boolean;
  updatingTargetBundle: KarafBundleInfo | null;
  projects: GitProjectInfo[];
  initialCoords?: string;
  initialVersion?: string;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export const KarafInstallModal: React.FC<KarafInstallModalProps> = ({
  isOpen,
  updatingTargetBundle,
  projects,
  initialCoords = '',
  initialVersion = '',
  onClose,
  onSuccess
}) => {
  const state = useKarafInstallModal({
    isOpen,
    updatingTargetBundle,
    projects,
    initialCoords,
    initialVersion,
    onSuccess
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-fade-in">
        <KarafInstallModalHeader updatingTargetBundle={updatingTargetBundle} onClose={onClose} />

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <KarafInstallSourceSelector value={state.installSourceType} onChange={state.setInstallSourceType} />

          <KarafInstallSourceFields
            sourceType={state.installSourceType}
            projects={projects}
            selectedProjectPath={state.selectedProjectPath}
            mvnCoordinate={state.mvnCoordinate}
            filePath={state.filePath}
            targetVersion={state.targetVersion}
            computedLocation={state.computedLocation}
            onSelectProject={state.handleSelectProject}
            onMvnCoordinateChange={state.setMvnCoordinate}
            onFilePathChange={state.setFilePath}
            onTargetVersionChange={state.setTargetVersion}
            onSelectFile={state.handleSelectFile}
          />

          <KarafInstallOptionsBar
            startImmediately={state.installStartImmediately}
            isChecking={state.isCheckingInstallDeps}
            canCheck={!!state.computedLocation}
            onStartImmediatelyChange={state.setInstallStartImmediately}
            onCheck={state.handleCheckInstallImpact}
          />

          {state.installDepCheck && <KarafInstallDepReport check={state.installDepCheck} />}

          {state.installLog && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto selection:bg-slate-800">
              {state.installLog}
            </div>
          )}
        </div>

        <KarafInstallModalFooter
          isUpdate={!!updatingTargetBundle}
          isInstalling={state.isInstalling}
          canConfirm={!!state.computedLocation}
          onClose={onClose}
          onConfirm={state.handleConfirmInstall}
        />
      </div>
    </div>
  );
};
