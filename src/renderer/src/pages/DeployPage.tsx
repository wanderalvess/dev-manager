import React from 'react';
import { GitProjectInfo } from '../../../shared/types';
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
  const modals = useDeployModals();
  const karaf = useKarafStatus();
  const deployProfiles = useDeployProfiles(settingsVersion);
  const { profiles, activeProfile, activeProfileId } = deployProfiles;
  const runner = useDeployRunner({
    profiles,
    activeProfile,
    setActiveProfileId: deployProfiles.setActiveProfileId
  });

  const handleSelectProfile = (id: string) => {
    void deployProfiles.selectProfile(id);
    runner.resetProgress();
  };

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

      {/* Grid Principal: o console fica no dock global (Ctrl+`) */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 min-w-0">
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col space-y-3 min-w-0 min-h-[320px] lg:min-h-0 overflow-y-auto pr-1">
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
            onToggleStep={deployProfiles.handleToggleStep}
            onToggleAllSteps={deployProfiles.handleToggleAllSteps}
            onRunFromStep={runner.handleRunFromStep}
          />
        </div>

        <div className="lg:col-span-7 xl:col-span-8 flex flex-col space-y-3 min-w-0 lg:min-h-0 overflow-y-auto pr-1">
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

          <DeployDiagnosticsPanel
            isDeploying={runner.isDeploying}
            isDiagRunning={runner.isDiagRunning}
            onRunDiagnostic={runner.handleRunDiagnostic}
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
