import React from 'react';
import type {
  DockerDaemonStatus,
  WslDistroInfo,
  ContainerEnvironment
} from '../../../../shared/types';
import { ContainersHeaderTitle } from './header/ContainersHeaderTitle';
import { ContainersRuntimeControls } from './header/ContainersRuntimeControls';
import { ContainersActionsBar } from './header/ContainersActionsBar';
import { ContainersSequenceBanner } from './header/ContainersSequenceBanner';
import { ContainersDaemonAlert } from './header/ContainersDaemonAlert';

export interface ContainersHeaderProps {
  daemonStatus: DockerDaemonStatus | null;
  selectedDistro: string;
  availableDistros: WslDistroInfo[];
  isSwitchingDistro: boolean;
  isOpeningWslTerminal: boolean;
  isTerminatingDistro: boolean;
  onSelectDistro: (distro: string) => void;
  onOpenWslTerminal: (distro?: string) => void;
  onTerminateDistro: (distro?: string) => void;
  onStartDockerDaemon: (distro?: string) => void;
  isStartingDaemon: boolean;
  environments: ContainerEnvironment[];
  selectedEnvId: string;
  onSelectEnvId: (id: string) => void;
  onStartEnvironment: (env: ContainerEnvironment) => void;
  onDeleteEnvironmentClick: (env: ContainerEnvironment) => void;
  onStartWinThorSequence: () => void;
  sequenceProgress: {
    running: boolean;
    currentName?: string;
    index?: number;
    total?: number;
    waitingSeconds?: number;
  };
  containersCount: number;
  onOpenSaveEnvModal: () => void;
  onOpenSnapshotsModal: () => void;
  onOpenInfrModal: () => void;
  showTopologyBus: boolean;
  onToggleTopologyBus: () => void;
  filter: string;
  onFilterChange: (value: string) => void;
  isLoading: boolean;
  onRefreshData: () => void;
  onOpenTour: () => void;
  copyWslIp: (text: string, key: string) => void;
  wslIpFeedback: string | null;
}

export const ContainersHeader: React.FC<ContainersHeaderProps> = ({
  daemonStatus,
  selectedDistro,
  availableDistros,
  isSwitchingDistro,
  isOpeningWslTerminal,
  isTerminatingDistro,
  onSelectDistro,
  onOpenWslTerminal,
  onTerminateDistro,
  onStartDockerDaemon,
  isStartingDaemon,
  environments,
  selectedEnvId,
  onSelectEnvId,
  onStartEnvironment,
  onDeleteEnvironmentClick,
  onStartWinThorSequence,
  sequenceProgress,
  containersCount,
  onOpenSaveEnvModal,
  onOpenSnapshotsModal,
  onOpenInfrModal,
  showTopologyBus,
  onToggleTopologyBus,
  filter,
  onFilterChange,
  isLoading,
  onRefreshData,
  onOpenTour,
  copyWslIp,
  wslIpFeedback
}) => {
  return (
    <>
      {/* Topo / Header da Página */}
      <header
        className="px-4 py-3 bg-card/85 backdrop-blur border-b border-border/80 flex flex-wrap items-center justify-between gap-3 shrink-0"
        data-tour="page-header"
      >
        <ContainersHeaderTitle
          daemonStatus={daemonStatus}
          onOpenTour={onOpenTour}
          copyWslIp={copyWslIp}
          wslIpFeedback={wslIpFeedback}
        />

        {/* Controles Agrupados Semanticamente */}
        <div className="flex flex-wrap items-center gap-3">
          <ContainersRuntimeControls
            selectedDistro={selectedDistro}
            availableDistros={availableDistros}
            isSwitchingDistro={isSwitchingDistro}
            isOpeningWslTerminal={isOpeningWslTerminal}
            isTerminatingDistro={isTerminatingDistro}
            onSelectDistro={onSelectDistro}
            onOpenWslTerminal={onOpenWslTerminal}
            onTerminateDistro={onTerminateDistro}
            environments={environments}
            selectedEnvId={selectedEnvId}
            onSelectEnvId={onSelectEnvId}
            onStartEnvironment={onStartEnvironment}
            onDeleteEnvironmentClick={onDeleteEnvironmentClick}
            sequenceRunning={sequenceProgress.running}
          />
          <ContainersActionsBar
            sequenceRunning={sequenceProgress.running}
            containersCount={containersCount}
            onStartWinThorSequence={onStartWinThorSequence}
            onOpenSaveEnvModal={onOpenSaveEnvModal}
            onOpenSnapshotsModal={onOpenSnapshotsModal}
            onOpenInfrModal={onOpenInfrModal}
            showTopologyBus={showTopologyBus}
            onToggleTopologyBus={onToggleTopologyBus}
            filter={filter}
            onFilterChange={onFilterChange}
            isLoading={isLoading}
            onRefreshData={onRefreshData}
          />
        </div>
      </header>

      {sequenceProgress.running && (
        <ContainersSequenceBanner
          currentName={sequenceProgress.currentName}
          index={sequenceProgress.index}
          total={sequenceProgress.total}
          waitingSeconds={sequenceProgress.waitingSeconds}
        />
      )}

      {daemonStatus && !daemonStatus.running && (
        <ContainersDaemonAlert
          daemonStatus={daemonStatus}
          selectedDistro={selectedDistro}
          isStartingDaemon={isStartingDaemon}
          onStartDockerDaemon={onStartDockerDaemon}
          onOpenWslTerminal={onOpenWslTerminal}
          onRefreshData={onRefreshData}
        />
      )}
    </>
  );
};
