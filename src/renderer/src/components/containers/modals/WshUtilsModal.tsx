import React from 'react';
import type { DockerContainerInfo, WshPrerequisiteStatus } from '../../../../../shared/types';
import { useWshUtilsModalState } from '../../../hooks/containers/useWshUtilsModalState';
import { wshUtilsModalCleanName } from '../../../utils/wshUtilsModalUtils';
import { WshUtilsHeader } from '../wsh/WshUtilsHeader';
import { WshUtilsTabs } from '../wsh/WshUtilsTabs';
import { WshUtilsFooter } from '../wsh/WshUtilsFooter';
import { WshMd5Tab } from '../wsh/WshMd5Tab';
import { WshFilesTab } from '../wsh/WshFilesTab';
import { WshRotina2650Tab } from '../wsh/WshRotina2650Tab';
import { Modal } from '../../ui/Modal';

export interface WshUtilsModalProps {
  container: DockerContainerInfo | null;
  wshPrereqs: WshPrerequisiteStatus[];
  isLoadingWshPrereqs: boolean;
  isOpeningOptFolder: boolean;
  onLoadWshPrereqs: () => void;
  onOpenOptFolder: () => void;
  onClose: () => void;
}

export const WshUtilsModal: React.FC<WshUtilsModalProps> = ({
  container,
  wshPrereqs,
  isLoadingWshPrereqs,
  isOpeningOptFolder,
  onLoadWshPrereqs,
  onOpenOptFolder,
  onClose
}) => {
  const state = useWshUtilsModalState(onLoadWshPrereqs);

  if (!container) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <WshUtilsHeader containerName={wshUtilsModalCleanName(container.names)} onClose={onClose} />

      <WshUtilsTabs
        activeTab={state.activeTab}
        onSelect={state.setActiveTab}
        onOpenFiles={state.openFilesTab}
      />

      <div className="flex-1 overflow-auto p-5 space-y-4">
        {state.activeTab === 'md5' && (
          <WshMd5Tab
            plainPass={state.plainPass}
            md5Upper={state.md5Upper}
            md5Lower={state.md5Lower}
            copiedKey={state.copiedKey}
            onPlainPassChange={state.setPlainPass}
            onCopy={state.copy}
          />
        )}

        {state.activeTab === 'files' && (
          <WshFilesTab
            prereqs={wshPrereqs}
            isLoadingPrereqs={isLoadingWshPrereqs}
            isOpeningOptFolder={isOpeningOptFolder}
            onLoadPrereqs={onLoadWshPrereqs}
            onOpenOptFolder={onOpenOptFolder}
          />
        )}

        {state.activeTab === 'rotina2650' && (
          <WshRotina2650Tab copiedKey={state.copiedKey} onCopy={state.copy} />
        )}
      </div>

      <WshUtilsFooter onClose={onClose} />
    </Modal>
  );
};
