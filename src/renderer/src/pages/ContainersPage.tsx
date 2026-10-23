import React, { useState, useMemo } from 'react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { CONTAINERS_TOUR_STEPS, CONTAINERS_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/containersTour';
import { filterContainers } from '../utils/dockerContainerUtils';
import { ContainersHeader } from '../components/containers/ContainersHeader';
import { ContainersMainArea } from '../components/containers/ContainersMainArea';
import { ContainersModals } from '../components/containers/ContainersModals';
import { useDockerData } from '../hooks/containers/useDockerData';
import { useContainerErrors } from '../hooks/containers/useContainerErrors';
import { useWslDistroControls } from '../hooks/containers/useWslDistroControls';
import { useContainerSequenceProgress } from '../hooks/containers/useContainerSequenceProgress';
import { useContainerEnvironments } from '../hooks/containers/useContainerEnvironments';
import { useContainerBatch } from '../hooks/containers/useContainerBatch';
import { useContainerActions } from '../hooks/containers/useContainerActions';
import { useContainerLogs } from '../hooks/containers/useContainerLogs';
import { useContainerToolModals } from '../hooks/containers/useContainerToolModals';
import { useDockerCompose } from '../hooks/containers/useDockerCompose';
import { useContainersSettingsSync } from '../hooks/containers/useContainersSettingsSync';

interface ContainersPageProps {
  isActive?: boolean;
  settingsVersion?: number;
}

export const ContainersPage: React.FC<ContainersPageProps> = ({ isActive, settingsVersion }) => {
  const tour = usePageTour(CONTAINERS_TOUR_STORAGE_KEY);
  const [filter, setFilter] = useState<string>('');

  const data = useDockerData(isActive);
  const errors = useContainerErrors(data);
  const wsl = useWslDistroControls(data, errors);
  const sequence = useContainerSequenceProgress();
  const envs = useContainerEnvironments(data, errors, wsl, sequence);
  const filteredContainers = useMemo(() => filterContainers(data.containers, filter), [data.containers, filter]);
  const batch = useContainerBatch(data, errors, sequence, filteredContainers, envs.openCreateGroup);
  const actions = useContainerActions(data, errors);
  const logs = useContainerLogs();
  const tools = useContainerToolModals(data, errors);
  const compose = useDockerCompose(data);
  useContainersSettingsSync(settingsVersion, data, compose, envs.loadEnvironments);

  const stoppedCount = useMemo(() => data.containers.filter((c) => c.state !== 'running').length, [data.containers]);

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden select-none">
      <ContainersHeader
        daemonStatus={data.daemonStatus}
        selectedDistro={data.selectedDistro}
        availableDistros={data.availableDistros}
        isSwitchingDistro={wsl.isSwitchingDistro}
        isOpeningWslTerminal={wsl.isOpeningWslTerminal}
        isTerminatingDistro={wsl.isTerminatingDistro}
        onSelectDistro={wsl.handleSelectDistro}
        onOpenWslTerminal={wsl.handleOpenWslTerminal}
        onTerminateDistro={wsl.handleTerminateDistro}
        onStartDockerDaemon={wsl.handleStartDockerDaemon}
        isStartingDaemon={wsl.isStartingDaemon}
        environments={envs.environments}
        selectedEnvId={envs.selectedEnvId}
        onSelectEnvId={envs.setSelectedEnvId}
        onStartEnvironment={envs.handleStartEnvironment}
        onDeleteEnvironmentClick={(env) => envs.setEnvToDelete(env)}
        sequenceProgress={sequence.sequenceProgress}
        containersCount={data.containers.length}
        onOpenSaveEnvModal={() => envs.openCreateGroup()}
        filter={filter}
        onFilterChange={setFilter}
        isLoading={data.isLoading}
        onRefreshData={data.loadDockerData}
        onOpenTour={tour.open}
        copyWslIp={wsl.copyWslIp}
        wslIpFeedback={wsl.wslIpFeedback}
      />

      <ContainersMainArea
        data={data}
        envs={envs}
        sequence={sequence}
        batch={batch}
        actions={actions}
        logs={logs}
        tools={tools}
        compose={compose}
        filteredContainers={filteredContainers}
      />

      <ContainersModals
        data={data}
        errors={errors}
        wsl={wsl}
        envs={envs}
        actions={actions}
        logs={logs}
        tools={tools}
        stoppedCount={stoppedCount}
      />

      <OnboardingTour
        steps={CONTAINERS_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={CONTAINERS_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
