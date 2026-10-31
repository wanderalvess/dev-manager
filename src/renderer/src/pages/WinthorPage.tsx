import React, { useEffect, useMemo } from 'react';
import { OnboardingTour } from '../components/onboarding/OnboardingTour';
import { usePageTour } from '../components/onboarding/usePageTour';
import { WINTHOR_TOUR_STEPS, WINTHOR_TOUR_STORAGE_KEY } from '../components/onboarding/pageTours/winthorTour';
import { computeStackTopology } from '../utils/dockerContainerUtils';
import { WinthorHeader } from '../components/winthor/WinthorHeader';
import { WinthorModals } from '../components/winthor/WinthorModals';
import { WinthorEmptyState } from '../components/winthor/WinthorEmptyState';
import { onInfrFirstStepsRequested, takePendingInfrFirstSteps } from '../utils/infrDeepLink';
import { ContainerTopologyBus } from '../components/containers/topology/ContainerTopologyBus';
import { useDockerData } from '../hooks/containers/useDockerData';
import { useContainerErrors } from '../hooks/containers/useContainerErrors';
import { useWslDistroControls } from '../hooks/containers/useWslDistroControls';
import { useContainerSequenceProgress } from '../hooks/containers/useContainerSequenceProgress';
import { useContainerEnvironments } from '../hooks/containers/useContainerEnvironments';
import { useContainerLogs } from '../hooks/containers/useContainerLogs';
import { useContainerToolModals } from '../hooks/containers/useContainerToolModals';
import { useWslSnapshots } from '../hooks/containers/useWslSnapshots';
import { useInfrBootstrap } from '../hooks/containers/useInfrBootstrap';

interface WinthorPageProps {
  isActive?: boolean;
}

/** Stack WinThor (Oracle XE, WTA, WSH) e distros WSL2: topologia, subir a sequência, snapshots e bootstrap INFR. */
export const WinthorPage: React.FC<WinthorPageProps> = ({ isActive }) => {
  const tour = usePageTour(WINTHOR_TOUR_STORAGE_KEY);

  const data = useDockerData(isActive);
  const errors = useContainerErrors(data);
  const wsl = useWslDistroControls(data, errors);
  const sequence = useContainerSequenceProgress();
  const envs = useContainerEnvironments(data, errors, wsl, sequence);
  const logs = useContainerLogs();
  const tools = useContainerToolModals(data, errors);
  const snapshots = useWslSnapshots(data);
  const infr = useInfrBootstrap(data);

  // Pedido do onboarding (etapa Ambiente → Começar do zero): abre o assistente em Primeiros passos
  useEffect(() => {
    if (isActive && takePendingInfrFirstSteps()) infr.openInfrModal('firstSteps');
    return onInfrFirstStepsRequested(() => infr.openInfrModal('firstSteps'));
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const stackTopology = useMemo(() => computeStackTopology(data.containers), [data.containers]);
  // Sem distro do WinThor e sem containers: a tela vira o ponto de partida do zero
  const noWinthorDistro =
    !data.isLoading && data.containers.length === 0 && !data.availableDistros.some((d) => d.name.toLowerCase().includes('winthor'));

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden select-none">
      <WinthorHeader
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
        sequenceProgress={sequence.sequenceProgress}
        containersCount={data.containers.length}
        onStartWinThorSequence={envs.handleStartWinThorSequence}
        onOpenSnapshotsModal={snapshots.openSnapshotsModal}
        onOpenInfrModal={() => infr.openInfrModal()}
        isLoading={data.isLoading}
        onRefreshData={data.loadDockerData}
        onOpenTour={tour.open}
        copyWslIp={wsl.copyWslIp}
        wslIpFeedback={wsl.wslIpFeedback}
      />

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-8">
        {noWinthorDistro ? (
          <WinthorEmptyState
            hasWsl={data.availableDistros.length > 0}
            onStart={() => infr.openInfrModal('firstSteps')}
            onOpenSnapshots={snapshots.openSnapshotsModal}
          />
        ) : (
          <ContainerTopologyBus
            stackTopology={stackTopology}
            selectedDistro={data.selectedDistro}
            daemonStatus={data.daemonStatus}
            onOpenWslTerminal={() => wsl.handleOpenWslTerminal()}
            onOpenOracleTools={tools.openOracleTools}
            onOpenWtaTools={tools.openWtaTools}
            onOpenWshTools={(c) => tools.openWshTools(c)}
            copyFeedback={logs.copyFeedback}
            onCopyText={(text, key) => logs.copyToClipboard(text, key)}
            containers={data.containers}
          />
        )}
      </div>

      <WinthorModals data={data} errors={errors} wsl={wsl} tools={tools} snapshots={snapshots} infr={infr} />

      <OnboardingTour
        steps={WINTHOR_TOUR_STEPS}
        isOpen={tour.isOpen}
        onClose={tour.close}
        storageKey={WINTHOR_TOUR_STORAGE_KEY}
      />
    </div>
  );
};
