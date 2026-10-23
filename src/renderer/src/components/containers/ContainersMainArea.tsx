import React from 'react';
import type { DockerDataState } from '../../hooks/containers/useDockerData';
import type { ContainerEnvironmentsState } from '../../hooks/containers/useContainerEnvironments';
import type { SequenceProgressState } from '../../hooks/containers/useContainerSequenceProgress';
import type { ContainerBatchState } from '../../hooks/containers/useContainerBatch';
import type { ContainerActionsState } from '../../hooks/containers/useContainerActions';
import type { ContainerLogsState } from '../../hooks/containers/useContainerLogs';
import type { ContainerToolModalsState } from '../../hooks/containers/useContainerToolModals';
import type { DockerComposeState } from '../../hooks/containers/useDockerCompose';
import type { DockerContainerInfo } from '../../../../shared/types';
import { DockerComposePanel } from './compose/DockerComposePanel';
import { ContainerGroupsBar } from './groups/ContainerGroupsBar';
import { ContainerBatchBar } from './batch/ContainerBatchBar';
import { ContainersStatusBar } from './ContainersStatusBar';
import { ContainerListSection } from './ContainerListSection';

interface ContainersMainAreaProps {
  data: DockerDataState;
  envs: ContainerEnvironmentsState;
  sequence: SequenceProgressState;
  batch: ContainerBatchState;
  actions: ContainerActionsState;
  logs: ContainerLogsState;
  tools: ContainerToolModalsState;
  compose: DockerComposeState;
  filteredContainers: DockerContainerInfo[];
}

/** Área rolável: compose, grupos, barra de status/lote e lista de containers. */
export const ContainersMainArea: React.FC<ContainersMainAreaProps> = ({
  data,
  envs,
  sequence,
  batch,
  actions,
  logs,
  tools,
  compose,
  filteredContainers
}) => {
  const { containers } = data;
  const runningCount = containers.filter((c) => c.state === 'running').length;
  const stoppedCount = containers.filter((c) => c.state !== 'running').length;
  const selectedCount = batch.selectedContainerIds.size;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-3 pb-8">
      <DockerComposePanel
        composeFilePath={compose.composeFilePath}
        setComposeFilePath={compose.setComposeFilePath}
        composeProfile={compose.composeProfile}
        setComposeProfile={compose.setComposeProfile}
        composeBuild={compose.composeBuild}
        setComposeBuild={compose.setComposeBuild}
        composeVolumes={compose.composeVolumes}
        setComposeVolumes={compose.setComposeVolumes}
        isComposeRunning={compose.isComposeRunning}
        isComposeRestarting={compose.isComposeRestarting}
        isLoadingComposeStatus={compose.isLoadingComposeStatus}
        composeServices={compose.composeServices}
        composeOutput={compose.composeOutput}
        recentComposeFiles={compose.recentComposeFiles}
        onSelectComposeFile={compose.handleSelectComposeFile}
        onComposeUp={compose.handleComposeUp}
        onComposeDown={compose.handleComposeDown}
        onComposeRestart={compose.handleComposeRestart}
        onComposeLogs={compose.handleComposeLogs}
        onComposeStatus={compose.handleComposeStatus}
        isComposeExpanded={compose.isComposeExpanded}
        setIsComposeExpanded={compose.setIsComposeExpanded}
        composeOutputRef={compose.composeOutputRef}
      />

      <ContainerGroupsBar
        environments={envs.environments}
        containers={containers}
        sequenceProgress={sequence.sequenceProgress}
        activeGroupId={envs.activeGroupId}
        onStartGroup={envs.handleStartEnvironment}
        onStopGroup={envs.handleStopEnvironment}
        onEditGroup={envs.openEditGroup}
        onDeleteGroup={(env) => envs.setEnvToDelete(env)}
        onCreateGroup={() => envs.openCreateGroup()}
      />

      <ContainersStatusBar
        runningCount={runningCount}
        stoppedCount={stoppedCount}
        totalCount={containers.length}
        isPruning={actions.isPruning}
        onPruneClick={() => actions.setShowPruneConfirm(true)}
      />

      {/* Barra de Ações em Lote (Sticky no topo durante a rolagem) */}
      {selectedCount > 0 && (
        <div className="sticky top-2 z-20">
          <ContainerBatchBar
            selectedCount={selectedCount}
            totalFilteredCount={filteredContainers.length}
            isAllSelected={selectedCount > 0 && selectedCount === filteredContainers.length}
            onToggleSelectAll={batch.handleToggleSelectAll}
            onClearSelection={batch.handleClearSelection}
            onBatchStart={batch.handleBatchStart}
            onBatchStop={batch.handleBatchStop}
            onBatchRestart={batch.handleBatchRestart}
            onCreateGroupFromSelection={batch.handleCreateGroupFromSelection}
            isExecutingBatch={batch.isExecutingBatch}
            batchActionType={batch.batchActionType}
          />
        </div>
      )}

      <ContainerListSection
        containers={containers}
        filteredContainers={filteredContainers}
        containerStats={data.containerStats}
        selectedDistro={data.selectedDistro}
        onReload={data.loadDockerData}
        actions={actions}
        batch={batch}
        logs={logs}
        tools={tools}
      />
    </div>
  );
};
