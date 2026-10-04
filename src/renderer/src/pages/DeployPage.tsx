import React, { useEffect, useState } from 'react';
import { GitProjectInfo } from '../../../shared/types';
import { TerminalViewer } from '../components/TerminalViewer';
import { OsgiResolutionDiagnosticCard } from '../components/OsgiResolutionDiagnosticCard';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { DEPLOY_TOUR_STEPS, DEPLOY_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/deployTour';
import { DeployHeader } from '../components/deploy/DeployHeader';
import { DeployKarafAlerts } from '../components/deploy/DeployKarafAlerts';
import { DeployStepsPanel } from '../components/deploy/DeployStepsPanel';
import { DeployDiagnosticsPanel } from '../components/deploy/DeployDiagnosticsPanel';
import { DeployModalsHost } from '../components/deploy/modals/DeployModalsHost';
import { useDeployProfiles } from '../hooks/deploy/useDeployProfiles';
import { useDeployRunner } from '../hooks/deploy/useDeployRunner';
import { useDeployModals } from '../hooks/deploy/useDeployModals';
import { useKarafStatus } from '../hooks/deploy/useKarafStatus';

interface DeployPageProps {
  projects: GitProjectInfo[];
  onNavigateToSettings?: () => void;
  settingsVersion?: number;
}

export const DeployPage: React.FC<DeployPageProps> = ({ projects, onNavigateToSettings, settingsVersion }) => {
  const tour = usePageTour(DEPLOY_TOUR_STORAGE_KEY);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState<boolean>(false);
  const modals = useDeployModals();
  const karaf = useKarafStatus();
  const deployProfiles = useDeployProfiles(settingsVersion);
  const { profiles, activeProfile, activeProfileId, persistProfiles } = deployProfiles;
  const runner = useDeployRunner({
    profiles,
    activeProfile,
    setActiveProfileId: deployProfiles.setActiveProfileId
  });

  // Atalho Escape para restaurar console se estiver maximizado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConsoleMaximized) {
        setIsConsoleMaximized(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConsoleMaximized]);

  const handleSelectProfile = (id: string) => {
    persistProfiles(profiles, id);
    runner.resetProgress();
  };

  const isRunning = runner.isDeploying || runner.runningStepId !== null || runner.isDiagRunning !== null;

  return (
    <div className="h-full flex flex-col p-5 space-y-4 overflow-hidden max-w-full">
      {/* Input oculto para importação de perfil JSON */}
      <input
        type="file"
        ref={deployProfiles.fileInputRef}
        onChange={deployProfiles.handleImportProfileFile}
        accept=".json"
        className="hidden"
      />

      <DeployHeader
        profiles={profiles}
        activeProfile={activeProfile}
        activeProfileId={activeProfileId}
        isDeploying={runner.isDeploying}
        onOpenTour={tour.open}
        onSelectProfile={handleSelectProfile}
        onEditProfile={() => modals.openProfileEditor(activeProfile)}
        onNewProfile={() => modals.openProfileEditor(null)}
        onDuplicateProfile={deployProfiles.handleDuplicateProfile}
        onExportProfile={deployProfiles.handleExportProfile}
        onImportProfile={deployProfiles.handleImportProfileClick}
        onOpenHistory={modals.handleOpenHistory}
        onOpenBundles={() => modals.setIsBundlesModalOpen(true)}
        onOpenRoutine801={() => modals.setIsRoutine801ModalOpen(true)}
        onOpenFeatures={() => modals.setIsFeaturesModalOpen(true)}
        onOpenJvmMemory={() => modals.setIsJvmMemoryModalOpen(true)}
        onAbort={runner.handleAbortDeploy}
        onRun={runner.handleRunActiveProfile}
      />

      {/* Grid Principal */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
        {/* Coluna Esquerda: Etapas do Perfil & Diagnósticos */}
        <div className={`${isConsoleMaximized ? 'hidden' : 'lg:col-span-4 xl:col-span-4'} flex flex-col space-y-3 min-w-0 min-h-[320px] lg:min-h-0 overflow-y-auto pr-1`}>
          <DeployKarafAlerts
            karafValid={deployProfiles.karafValid}
            karafPath={deployProfiles.karafPath}
            showOfflineAlert={deployProfiles.activeProfileNeedsKaraf && karaf.isKarafOnline === false}
            isStartingKaraf={karaf.isStartingKaraf}
            onNavigateToSettings={onNavigateToSettings}
            onStartKaraf={karaf.handleStartEmbeddedKaraf}
          />

          <DeployStepsPanel
            activeProfile={activeProfile}
            isDeploying={runner.isDeploying}
            runningStepId={runner.runningStepId}
            isDiagRunning={runner.isDiagRunning}
            currentProgress={runner.currentProgress}
            stepStatuses={runner.stepStatuses}
            stepExecutionTimes={runner.stepExecutionTimes}
            onEditSteps={() => modals.openProfileEditor(activeProfile)}
            onRunStep={runner.handleRunSingleStep}
          />

          <DeployDiagnosticsPanel
            isDeploying={runner.isDeploying}
            isDiagRunning={runner.isDiagRunning}
            onRunDiagnostic={runner.handleRunDiagnostic}
          />
        </div>

        {/* Coluna Direita: Terminal com Streaming de Saída */}
        <div
          className={`${
            isConsoleMaximized
              ? 'col-span-12 min-h-[calc(100vh-210px)] h-full'
              : 'lg:col-span-8 xl:col-span-8 min-h-[580px] lg:min-h-full'
          } flex flex-col min-w-0 transition-all duration-200`}
          data-tour="deploy-console-output"
        >
          {runner.activeResolutionDiag && (
            <OsgiResolutionDiagnosticCard
              diagnostic={runner.activeResolutionDiag}
              isDeploying={runner.isDeploying}
              runningStepId={runner.runningStepId}
              onExecuteMatchedProfile={runner.handleExecuteMatchedProfile}
              onInstallReleaseFeature={runner.handleInstallReleaseFeature}
              onRunSuggestedDiagnostic={runner.handleRunSuggestedDiagnostic}
              onDismiss={() => runner.setActiveResolutionDiag(null)}
            />
          )}

          <TerminalViewer
            logs={runner.terminalLogs}
            onClear={runner.clearConsole}
            title={isConsoleMaximized ? 'Console de Deploy (Modo Expandido)' : 'Console de Deploy'}
            isRunning={isRunning}
            onSendCommand={(cmd) => runner.handleRunDiagnostic(cmd, 'terminal')}
            inputPlaceholder="Digite um comando Karaf (ex: feature:uninstall -r winthor-integracao-varejo/versao, bundle:diag, la)..."
            isMaximized={isConsoleMaximized}
            onToggleMaximize={() => setIsConsoleMaximized((prev) => !prev)}
          />
        </div>
      </div>

      <DeployModalsHost
        modals={modals}
        projects={projects}
        onSaveProfile={deployProfiles.handleSaveProfile}
        onDeleteProfile={deployProfiles.handleDeleteProfile}
      />

      <OnboardingTour
        steps={DEPLOY_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={DEPLOY_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
