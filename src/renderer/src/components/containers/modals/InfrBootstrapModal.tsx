import React, { useEffect, useState } from 'react';
import { InfrDockerGuide } from '../../help/guides/InfrDockerGuide';
import type { InfrDockerScriptStatus } from '../../../../../shared/types';
import { useInfrBootstrapModalState } from '../../../hooks/containers/useInfrBootstrapModalState';
import { InfrBootstrapHeader } from '../infr/InfrBootstrapHeader';
import { InfrAssistantNav } from '../infr/InfrAssistantNav';
import { infrFolderStatus, type InfrBootstrapTab } from '../../../utils/infrBootstrapModalUtils';
import { InfrOracleTab } from '../infr/InfrOracleTab';
import { InfrWtaTab } from '../infr/InfrWtaTab';
import { InfrWshTab } from '../infr/InfrWshTab';
import { InfrScriptsTab } from '../infr/InfrScriptsTab';
import { InfrVersionField } from '../infr/InfrVersionField';
import { InfrNewVersionTab } from '../infr/InfrNewVersionTab';
import { useInfrNewVersion } from '../../../hooks/containers/useInfrNewVersion';
import { useInfrEnvCheck } from '../../../hooks/containers/useInfrEnvCheck';
import { InfrVerifyTab } from '../infr/InfrVerifyTab';
import { InfrFirstStepsTab } from '../infr/firststeps/InfrFirstStepsTab';
import { useInfrFirstSteps } from '../../../hooks/containers/useInfrFirstSteps';
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
      winthorVersion: string;
    }
  ) => void;
  isExecutingInfr: boolean;
  infrOutput: string;
  /** Distro WSL selecionada na tela (a aba Nova versão lista os ambientes dela) */
  distro?: string;
  /** Aba em que o assistente abre (ex.: Primeiros passos, pelo estado vazio da tela) */
  initialTab?: InfrBootstrapTab;
}

export const InfrBootstrapModal: React.FC<InfrBootstrapModalProps> = ({
  isOpen,
  onClose,
  infrScripts,
  isLoadingInfrScripts,
  onLoadInfrScripts,
  onRunInfrScript,
  isExecutingInfr,
  infrOutput,
  distro,
  initialTab
}) => {
  const state = useInfrBootstrapModalState({ onLoadInfrScripts, onRunInfrScript });
  const [verifyName, setVerifyName] = useState('');
  // Depois do Gerar, abre a verificação do ambiente novo
  const newVersion = useInfrNewVersion(distro, state.customPath || undefined, (name) => {
    setVerifyName(name);
    state.setActiveTab('verify');
  });
  const verify = useInfrEnvCheck(distro || newVersion.envs?.distro, verifyName);
  const [guideOpen, setGuideOpen] = useState(false);
  const firstSteps = useInfrFirstSteps(distro, state.customPath || undefined, isOpen && state.activeTab === 'firstSteps', (name) => {
    setVerifyName(name);
    state.setActiveTab('verify');
  });

  useEffect(() => {
    if (isOpen && initialTab) state.setActiveTab(initialTab);
  }, [isOpen, initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  const selectTab = (tab: InfrBootstrapTab) => (tab === 'scripts' ? state.openScriptsTab() : state.setActiveTab(tab));

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border/80 rounded-xl shadow-lg w-full max-w-[min(1680px,96vw)] h-[92vh] flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <InfrBootstrapHeader
        onClose={onClose}
        distro={distro}
        detectedDistro={newVersion.envs?.distro}
        folder={infrFolderStatus(state.customPath, infrScripts)}
        onOpenScripts={state.openScriptsTab}
        onOpenGuide={() => setGuideOpen(true)}
      />

      {guideOpen && (
        <Modal
          open
          onClose={() => setGuideOpen(false)}
          size="xl"
          title="Como funciona"
          description="Ambientes WinThor no Docker: INFR-Docker e Hub. O mesmo guia está na Central de Ajuda → Guias."
          zIndexClass="z-[70]"
        >
          <InfrDockerGuide openLink={(url) => window.electronAPI?.openExternal?.(url)} />
        </Modal>
      )}

      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <InfrAssistantNav activeTab={state.activeTab} onSelect={selectTab} />

        {state.activeTab === 'firstSteps' ? (
          <InfrFirstStepsTab f={firstSteps} onGoTo={selectTab} />
        ) : state.activeTab === 'newVersion' ? (
          <InfrNewVersionTab s={newVersion} onClose={onClose} />
        ) : state.activeTab === 'verify' ? (
          <InfrVerifyTab v={verify} envNames={newVersion.envs?.environments.map((e) => e.name) ?? []} />
        ) : (
          <div className="flex-1 min-w-0 overflow-auto p-5 space-y-4 scrollbar-thin">
            {state.activeTab !== 'scripts' && (
              <InfrVersionField version={state.winthorVersion} onChange={state.setWinthorVersion} />
            )}

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
                version={state.winthorVersion}
                isExecuting={isExecutingInfr}
                onContainerChange={state.setWtaContainer}
                onPortChange={state.setWtaPort}
                onRun={() => state.handleRun('wta')}
              />
            )}

            {state.activeTab === 'wsh' && (
              <InfrWshTab version={state.winthorVersion} isExecuting={isExecutingInfr} onRun={() => state.handleRun('wsh')} />
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
        )}
      </div>
    </Modal>
  );
};
