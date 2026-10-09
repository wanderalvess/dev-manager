import React from 'react';
import type { DockerContainerInfo } from '../../../../../shared/types';
import { useWtaUtilsModalState } from '../../../hooks/containers/useWtaUtilsModalState';
import { extractWtaPort } from '../../../utils/dockerContainerUtils';
import { wtaUtilsModalCleanName } from '../../../utils/wtaUtilsModalUtils';
import { WtaUtilsHeader } from '../wta/WtaUtilsHeader';
import { WtaUtilsTabs } from '../wta/WtaUtilsTabs';
import { WtaUtilsFooter } from '../wta/WtaUtilsFooter';
import { WtaAccessTab } from '../wta/WtaAccessTab';
import { WtaKarafTab } from '../wta/WtaKarafTab';
import { WtaDevTab } from '../wta/WtaDevTab';
import { Modal } from '../../ui/Modal';

export interface WtaUtilsModalProps {
  container: DockerContainerInfo | null;
  onClose: () => void;
  onOpenKarafClient?: (containerName: string) => Promise<void> | void;
  isOpeningKarafClient?: boolean;
}

export const WtaUtilsModal: React.FC<WtaUtilsModalProps> = ({
  container,
  onClose,
  onOpenKarafClient,
  isOpeningKarafClient = false
}) => {
  const state = useWtaUtilsModalState();

  if (!container) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <WtaUtilsHeader containerName={wtaUtilsModalCleanName(container.names)} onClose={onClose} />

      <WtaUtilsTabs activeTab={state.activeTab} onSelect={state.setActiveTab} />

      <div className="flex-1 overflow-auto p-5 space-y-4 scrollbar-thin">
        {state.activeTab === 'access' && (
          <WtaAccessTab
            port={extractWtaPort(container.ports)}
            copiedKey={state.copiedKey}
            onCopy={state.copy}
          />
        )}

        {state.activeTab === 'karaf' && (
          <WtaKarafTab
            containerNames={container.names}
            isOpeningKarafClient={isOpeningKarafClient}
            onOpenKarafClient={onOpenKarafClient}
          />
        )}

        {state.activeTab === 'dev' && (
          <WtaDevTab copiedKey={state.copiedKey} onCopy={state.copy} />
        )}
      </div>

      <WtaUtilsFooter onClose={onClose} />
    </Modal>
  );
};
