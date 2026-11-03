import React, { useEffect, useState } from 'react';
import { InfrDockerGuide } from '../../help/guides/InfrDockerGuide';
import type { InfrDockerScriptStatus } from '../../../../../shared/types';
import { useInfrBootstrapModalState } from '../../../hooks/containers/useInfrBootstrapModalState';
import { InfrBootstrapHeader } from '../infr/InfrBootstrapHeader';
import { infrFolderStatus, type InfrBootstrapTab } from '../../../utils/infrBootstrapModalUtils';
import { InfrOracleTab } from '../infr/InfrOracleTab';
import { InfrWtaTab } from '../infr/InfrWtaTab';
import { InfrWshTab } from '../infr/InfrWshTab';
import { InfrScriptsTab } from '../infr/InfrScriptsTab';
import { InfrVersionField } from '../infr/InfrVersionField';
import { InfrNewVersionTab } from '../infr/InfrNewVersionTab';
import { InfrHomeTab } from '../infr/home/InfrHomeTab';
import { useInfrNewVersion } from '../../../hooks/containers/useInfrNewVersion';
import { useInfrAiGuide } from '../../../hooks/containers/useInfrAiGuide';
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
  /** Distro WSL selecionada na tela (a tela de ambientes lista os dela) */
  distro?: string;
  /** Tela em que o assistente abre (ex.: Montar do zero, pelo estado vazio da tela); sem ela, a de ambientes */
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
  const openVerify = (name: string) => {
    setVerifyName(name);
    state.setActiveTab('verify');
  };
  // Depois do Gerar, abre a verificação do ambiente novo
  const newVersion = useInfrNewVersion(distro, state.customPath || undefined, openVerify);
  const ai = useInfrAiGuide(newVersion, distro);
  const verify = useInfrEnvCheck(distro || newVersion.envs?.distro, verifyName);
  const [guideOpen, setGuideOpen] = useState(false);
  const firstSteps = useInfrFirstSteps(distro, state.customPath || undefined, isOpen && state.activeTab === 'firstSteps', openVerify);
  const { envs, loadEnvironments } = newVersion;

  useEffect(() => {
    if (isOpen) state.setActiveTab(initialTab ?? 'home');
  }, [isOpen, initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isOpen && !envs) loadEnvironments();
  }, [isOpen, envs, loadEnvironments]);

  if (!isOpen) return null;

  const view = state.activeTab;
  const selectTab = (tab: InfrBootstrapTab) => (tab === 'scripts' ? state.openScriptsTab() : state.setActiveTab(tab));
  const goHome = () => {
    state.setActiveTab('home');
    loadEnvironments();
  };
  /** Nova versão partindo deste ambiente */
  const copyFrom = (name: string) => {
    newVersion.update('from', name);
    state.setActiveTab('newVersion');
  };

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-background border border-border/80 rounded-xl shadow-lg w-full max-w-[min(1440px,96vw)] h-[92vh] flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
      <InfrBootstrapHeader
        view={view}
        onHome={goHome}
        onClose={onClose}
        distro={distro}
        detectedDistro={envs?.distro}
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

      <div className="flex-1 min-h-0 flex flex-col">
        {view === 'home' ? (
          <InfrHomeTab
            envs={envs}
            loadingEnvs={newVersion.loadingEnvs}
            onReload={loadEnvironments}
            distro={distro}
            onAsk={(goal) => {
              state.setActiveTab('newVersion');
              ai.start(goal);
            }}
            onGoTo={selectTab}
            onVerify={openVerify}
            onCopy={copyFrom}
          />
        ) : view === 'firstSteps' ? (
          <InfrFirstStepsTab f={firstSteps} onGoTo={selectTab} />
        ) : view === 'newVersion' ? (
          <InfrNewVersionTab s={newVersion} ai={ai} distro={distro} onCancel={goHome} />
        ) : view === 'verify' ? (
          <InfrVerifyTab v={verify} ai={ai} envNames={envs?.environments.map((e) => e.name) ?? []} onNewVersion={copyFrom} />
        ) : (
          <div className="flex-1 min-w-0 overflow-auto scrollbar-thin">
            <div className="max-w-6xl mx-auto px-5 md:px-6 py-8 space-y-4">
              {view !== 'scripts' && <InfrVersionField version={state.winthorVersion} onChange={state.setWinthorVersion} />}

              {view === 'oracle' && (
                <InfrOracleTab
                  container={state.oracleContainer}
                  port={state.oraclePort}
                  isExecuting={isExecutingInfr}
                  onContainerChange={state.setOracleContainer}
                  onPortChange={state.setOraclePort}
                  onRun={() => state.handleRun('oracle')}
                />
              )}

              {view === 'wta' && (
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

              {view === 'wsh' && <InfrWshTab version={state.winthorVersion} isExecuting={isExecutingInfr} onRun={() => state.handleRun('wsh')} />}

              {view === 'scripts' && (
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
          </div>
        )}
      </div>
    </Modal>
  );
};
