import React, { useState } from 'react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { ENV_TOUR_STEPS, ENV_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/environmentTour';
import { ServiceStatus, AutomationProfile, getWebPort, getWebUrl } from '../../../shared/types';
import { ProfileEditorModal } from '../components/ProfileEditorModal';
import { EnvironmentConfigWarning } from '../components/environment/EnvironmentConfigWarning';
import { EnvironmentCockpitPanel } from '../components/environment/EnvironmentCockpitPanel';
import { PortsMonitor } from '../components/environment/PortsMonitor';
import { QuickLinks } from '../components/environment/QuickLinks';
import { StepCardsPanel } from '../components/environment/StepCardsPanel';
import { NetworkInfoCard } from '../components/environment/NetworkInfoCard';
import { DiagnosticsPanel } from '../components/environment/DiagnosticsPanel';
import { EnvironmentConsolePanel } from '../components/environment/EnvironmentConsolePanel';
import { KarafHistoryModal } from '../components/environment/modals/KarafHistoryModal';
import { useEnvironmentProfiles } from '../hooks/environment/useEnvironmentProfiles';
import { useEnvironmentStatus } from '../hooks/environment/useEnvironmentStatus';
import { useEnvironmentLogs } from '../hooks/environment/useEnvironmentLogs';
import { useEnvironmentProfileRun } from '../hooks/environment/useEnvironmentProfileRun';
import { useEnvironmentStepActions } from '../hooks/environment/useEnvironmentStepActions';
import { useEnvironmentServiceActions } from '../hooks/environment/useEnvironmentServiceActions';
import { useKarafHistory } from '../hooks/environment/useKarafHistory';

interface EnvironmentPageProps {
  services: ServiceStatus[];
  onRefreshServices: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToHelp?: (search?: string) => void;
  isActive?: boolean;
  settingsVersion?: number;
}

export const EnvironmentPage: React.FC<EnvironmentPageProps> = ({
  services,
  onRefreshServices,
  onNavigateToSettings,
  onNavigateToHelp,
  isActive,
  settingsVersion
}) => {
  const tour = usePageTour(ENV_TOUR_STORAGE_KEY);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<AutomationProfile | null>(null);

  // A ordem dos hooks preserva a ordem original dos efeitos (configurações antes do polling).
  const profilesState = useEnvironmentProfiles(settingsVersion);
  const { settings, activeProfile } = profilesState;

  const status = useEnvironmentStatus({
    onRefreshServices,
    isActive,
    settingsRef: profilesState.settingsRef
  });
  const { ports, processes, refreshAllStatus } = status;

  const { logs, setLogs } = useEnvironmentLogs({
    refreshAllStatus,
    checkKarafRunning: status.checkKarafRunning
  });
  const karafHistory = useKarafHistory();

  const serviceActions = useEnvironmentServiceActions({ services, refreshAllStatus, setLogs });
  const profileRun = useEnvironmentProfileRun({
    activeProfile,
    refreshAllStatus,
    setLogs,
    setActionLoading: serviceActions.setActionLoading
  });
  const stepActions = useEnvironmentStepActions({ activeProfile, refreshAllStatus });

  const handleSendKarafCommand = (cmd: string) => {
    if (window.electronAPI && window.electronAPI.sendKarafInput) {
      setLogs((prev) => [...prev, `karaf@root()> ${cmd}\r\n`]);
      window.electronAPI.sendKarafInput(cmd);
    }
  };

  const handleOpenLink = (url: string) => {
    if (window.electronAPI) {
      window.electronAPI.openExternal(url);
    }
  };

  const openProfileEditor = (profile: AutomationProfile | null) => {
    setEditingProfile(profile);
    setIsProfileModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col p-4 md:p-5 pb-4 space-y-3.5 overflow-y-auto lg:overflow-hidden max-w-full overflow-x-hidden">
      <EnvironmentConfigWarning
        missingPaths={profilesState.missingRequiredPaths}
        onNavigateToSettings={onNavigateToSettings}
      />

      <EnvironmentCockpitPanel
        profiles={profilesState.profiles}
        activeProfile={activeProfile}
        activeProfileId={profilesState.activeProfileId}
        services={services}
        processes={processes}
        ports={ports}
        isRunningProfile={profileRun.isRunningProfile}
        activeStepIndex={profileRun.activeStepIndex}
        activeStepTotal={profileRun.activeStepTotal}
        currentRunningStepId={profileRun.currentRunningStepId}
        isStoppingAll={serviceActions.actionLoading === 'stop-all'}
        importFileInputRef={profilesState.importFileInputRef}
        onSelectProfile={profilesState.handleSelectProfile}
        onNewProfile={() => openProfileEditor(null)}
        onEditProfile={() => openProfileEditor(activeProfile)}
        onDuplicateProfile={profilesState.handleDuplicateProfile}
        onExportProfile={() => profilesState.handleExportProfile(activeProfile || undefined)}
        onDeleteProfile={(id) => profilesState.handleDeleteProfile(id)}
        onImportFileChange={profilesState.handleImportFileChange}
        onRun={profileRun.handleRunActiveProfile}
        onStopAll={profileRun.handleStopActiveProfile}
        onRestartAll={profileRun.handleRestartActiveProfile}
        onOpenTour={tour.open}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 shrink-0">
        <PortsMonitor
          ports={ports}
          isChecking={status.isCheckingPorts}
          onNavigateToSettings={onNavigateToSettings}
          onNavigateToHelp={onNavigateToHelp}
        />
        <QuickLinks
          webPort={getWebPort(settings, ports)}
          webPortalUrl={getWebUrl(settings, '', ports)}
          karafConsoleUrl={getWebUrl(settings, '/system/console', ports)}
          hasKarafPath={!!settings?.karafPath}
          webHealth={status.webHealth}
          onOpenLink={handleOpenLink}
        />
      </div>

      {/* Grid principal: cartões das etapas à esquerda / console à direita */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 min-w-0">
        <div className="lg:col-span-6 flex flex-col space-y-3 min-w-0 lg:overflow-y-auto lg:pr-2 lg:pb-2">
          <StepCardsPanel
            activeProfile={activeProfile}
            services={services}
            processes={processes}
            ports={ports}
            karafDebugPort={settings?.karafDebugPort}
            stepActionLoading={stepActions.stepActionLoading}
            isRunningProfile={profileRun.isRunningProfile}
            onConfigureSteps={() => openProfileEditor(activeProfile)}
            onToggleEnabled={profilesState.handleToggleStepEnabled}
            onRun={stepActions.handleRunStep}
            onStop={stepActions.handleStopStep}
            onRestart={stepActions.handleRestartStep}
            onToggleService={stepActions.handleToggleServiceStep}
          />

          {status.networkIps && (
            <NetworkInfoCard networkIps={status.networkIps} onRefresh={status.fetchNetworkIps} />
          )}

          <DiagnosticsPanel
            services={services}
            processes={processes}
            isCheckingProcesses={status.isCheckingProcesses}
            actionLoading={serviceActions.actionLoading}
            onStartService={serviceActions.handleStartService}
            onStopService={serviceActions.handleStopService}
            onBatchStart={serviceActions.handleBatchStartServices}
            onBatchStop={serviceActions.handleBatchStopServices}
            onKillProcess={serviceActions.handleKillProcess}
          />
        </div>

        <EnvironmentConsolePanel
          logs={logs}
          title={`Console de Operações - ${activeProfile?.name || 'Ambiente'}`}
          isRunning={profileRun.isRunningProfile || status.isKarafEmbeddedRunning}
          isKarafEmbeddedRunning={status.isKarafEmbeddedRunning}
          onClear={() => setLogs([])}
          onSendKarafCommand={handleSendKarafCommand}
          onOpenHistory={karafHistory.open}
        />
      </div>

      {karafHistory.isOpen && (
        <KarafHistoryModal
          output={karafHistory.output}
          filtered={karafHistory.filtered}
          search={karafHistory.search}
          isLoading={karafHistory.isLoading}
          onSearchChange={karafHistory.setSearch}
          onClear={karafHistory.clear}
          onClose={karafHistory.close}
        />
      )}

      {/* Modal de Criação / Edição de Perfil de Automação */}
      <ProfileEditorModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setEditingProfile(null);
        }}
        profile={editingProfile}
        onSave={profilesState.handleSaveProfile}
        onDelete={(id) => profilesState.handleDeleteProfile(id, true)}
        onExport={profilesState.handleExportProfile}
      />

      <OnboardingTour
        steps={ENV_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={ENV_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
