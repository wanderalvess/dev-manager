import React from 'react';
import type { DockerDataState } from '../../hooks/containers/useDockerData';
import type { ContainerErrorsState } from '../../hooks/containers/useContainerErrors';
import type { WslDistroControlsState } from '../../hooks/containers/useWslDistroControls';
import type { ContainerEnvironmentsState } from '../../hooks/containers/useContainerEnvironments';
import type { ContainerActionsState } from '../../hooks/containers/useContainerActions';
import type { ContainerLogsState } from '../../hooks/containers/useContainerLogs';
import type { ContainerToolModalsState } from '../../hooks/containers/useContainerToolModals';
import { getStateBadge } from './ContainerStateBadge';
import { ContainerLogsModal } from './modals/ContainerLogsModal';
import { SaveEnvironmentModal } from './modals/SaveEnvironmentModal';
import { ContainerRemoveConfirmModal } from './modals/ContainerRemoveConfirmModal';
import { EnvironmentDeleteConfirmModal } from './modals/EnvironmentDeleteConfirmModal';
import { ContainerToolModals } from './ContainerToolModals';
import { ContainerSmartErrorModal } from './modals/ContainerSmartErrorModal';
import { ContainerPruneModal } from './modals/ContainerPruneModal';
import { ContainerInspectModal } from './modals/ContainerInspectModal';

interface ContainersModalsProps {
  data: DockerDataState;
  errors: ContainerErrorsState;
  wsl: WslDistroControlsState;
  envs: ContainerEnvironmentsState;
  actions: ContainerActionsState;
  logs: ContainerLogsState;
  tools: ContainerToolModalsState;
  stoppedCount: number;
}

/** Todos os modais da página de Containers, controlados pelos hooks de cada responsabilidade. */
export const ContainersModals: React.FC<ContainersModalsProps> = ({
  data,
  errors,
  wsl,
  envs,
  actions,
  logs,
  tools,
  stoppedCount
}) => (
  <>
    {logs.selectedContainer && (
      <ContainerLogsModal
        container={logs.selectedContainer}
        logs={logs.logs}
        isLoadingLogs={logs.isLoadingLogs}
        logLines={logs.logLines}
        onSetLogLines={logs.setLogLines}
        onRefreshLogs={logs.handleRefreshLogs}
        onDownloadLogs={logs.handleDownloadLogs}
        onCopyLogs={logs.handleCopyLogs}
        copyFeedback={logs.copyFeedback}
        onClose={logs.closeLogs}
      />
    )}

    <SaveEnvironmentModal
      isOpen={envs.isCreatingEnv}
      containers={data.containers}
      selectedDistro={data.selectedDistro}
      editingEnvironment={envs.editingEnv}
      preselectedContainerNames={envs.preselectedForGroup}
      onClose={envs.closeEnvironmentEditor}
      onSave={envs.handleSaveEnvironment}
    />

    <ContainerRemoveConfirmModal
      container={actions.containerToRemove}
      onClose={() => actions.setContainerToRemove(null)}
      onConfirm={async (c) => {
        actions.setContainerToRemove(null);
        await actions.executeContainerAction(c, 'remove');
      }}
    />

    <EnvironmentDeleteConfirmModal
      environment={envs.envToDelete}
      onClose={() => envs.setEnvToDelete(null)}
      onConfirm={async (env) => {
        envs.setEnvToDelete(null);
        await envs.handleDeleteEnvironment(env.id);
      }}
    />

    <ContainerToolModals tools={tools} errors={errors} />

    <ContainerSmartErrorModal
      smartError={errors.smartError}
      selectedDistro={data.selectedDistro}
      onClose={() => errors.setSmartError(null)}
      onStartDaemon={wsl.handleStartDockerDaemon}
      onOpenWslTerminal={wsl.handleOpenWslTerminal}
      isStartingDaemon={wsl.isStartingDaemon}
    />

    <ContainerPruneModal
      isOpen={actions.showPruneConfirm}
      stoppedCount={stoppedCount}
      isPruning={actions.isPruning}
      onClose={() => actions.setShowPruneConfirm(false)}
      onConfirm={actions.handlePruneContainers}
    />

    <ContainerInspectModal
      inspectingContainer={actions.inspectingContainer}
      onClose={() => actions.setInspectingContainer(null)}
      getStateBadge={getStateBadge}
    />
  </>
);
