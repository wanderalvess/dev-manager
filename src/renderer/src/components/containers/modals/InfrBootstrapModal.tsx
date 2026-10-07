import React from 'react';
import type { InfrDockerScriptStatus } from '../../../../../shared/types';
import { useInfrBootstrapModalState } from '../../../hooks/containers/useInfrBootstrapModalState';
import { InfrBootstrapHeader } from '../infr/InfrBootstrapHeader';
import { InfrBootstrapTabs } from '../infr/InfrBootstrapTabs';
import { InfrBootstrapFooter } from '../infr/InfrBootstrapFooter';
import { InfrOracleTab } from '../infr/InfrOracleTab';
import { InfrWtaTab } from '../infr/InfrWtaTab';
import { InfrWshTab } from '../infr/InfrWshTab';
import { InfrScriptsTab } from '../infr/InfrScriptsTab';
import { Modal } from '../../ui/Modal';

export interface InfrBootstrapModalProps {
  isOpen: boolean;
  onClose: () => void;
  infrScripts: InfrDockerScriptStatus[];
  isLoadingInfrScripts: boolean;
  onLoadInfrScripts: (customPath?: string) => void;
  onRunInfrScript: (
    scriptType: 'oracle' | 'wta' | 'wsh',
    options: {
      customPath: string;
      oracleContainer: string;
      oraclePort: number;
      wtaContainer: string;
      wtaPort: number;
    }
  ) => void;
  isExecutingInfr: boolean;
  infrOutput: string;
}

export const InfrBootstrapModal: React.FC<InfrBootstrapModalProps> = ({
  isOpen,
  onClose,
  infrScripts,
  isLoadingInfrScripts,
  onLoadInfrScripts,
  onRunInfrScript,
  isExecutingInfr,
  infrOutput
}) => {
  const state = useInfrBootstrapModalState({ onLoadInfrScripts, onRunInfrScript });

  if (!isOpen) return null;

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <InfrBootstrapHeader onClose={onClose} />

      <InfrBootstrapTabs
        activeTab={state.activeTab}
        onSelect={state.setActiveTab}
        onOpenScripts={state.openScriptsTab}
      />

      <div className="flex-1 overflow-auto p-5 space-y-4 [scrollbar-width:thin]">
        {state.activeTab === 'oracle' && (
          <InfrOracleTab
            container={state.oracleContainer}
            port={state.oraclePort}
            isExecuting={isExecutingInfr}
            onContainerChange={state.setOracleContainer}
            onPortChange={state.setOraclePort}
            onRun={() => state.handleRun('oracle')}
          />
        )}

        {state.activeTab === 'wta' && (
          <InfrWtaTab
            container={state.wtaContainer}
            port={state.wtaPort}
            isExecuting={isExecutingInfr}
            onContainerChange={state.setWtaContainer}
            onPortChange={state.setWtaPort}
            onRun={() => state.handleRun('wta')}
          />
        )}

        {state.activeTab === 'wsh' && (
          <InfrWshTab isExecuting={isExecutingInfr} onRun={() => state.handleRun('wsh')} />
        )}

        {state.activeTab === 'scripts' && (
          <InfrScriptsTab
            customPath={state.customPath}
            scripts={infrScripts}
            isLoading={isLoadingInfrScripts}
            onCustomPathChange={state.setCustomPath}
            onVerify={() => onLoadInfrScripts(state.customPath)}
          />
        )}

        {infrOutput && (
          <div className="p-3 bg-[#090D14] rounded-xl border border-border/60 text-xs font-mono text-emerald-400 select-text whitespace-pre-wrap">
            {infrOutput}
          </div>
        )}
      </div>

      <InfrBootstrapFooter onClose={onClose} />
    </Modal>
  );
};
