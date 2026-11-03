import React from 'react';
import type { DockerDataState } from '../../hooks/containers/useDockerData';
import type { ContainerErrorsState } from '../../hooks/containers/useContainerErrors';
import type { WslDistroControlsState } from '../../hooks/containers/useWslDistroControls';
import type { ContainerToolModalsState } from '../../hooks/containers/useContainerToolModals';
import type { WslSnapshotsState } from '../../hooks/containers/useWslSnapshots';
import type { InfrBootstrapState } from '../../hooks/containers/useInfrBootstrap';
import { ContainerToolModals } from '../containers/ContainerToolModals';
import { WslSnapshotsModal } from '../containers/modals/WslSnapshotsModal';
import { InfrBootstrapModal } from '../containers/modals/InfrBootstrapModal';
import { ContainerSmartErrorModal } from '../containers/modals/ContainerSmartErrorModal';

interface WinthorModalsProps {
  data: DockerDataState;
  errors: ContainerErrorsState;
  wsl: WslDistroControlsState;
  tools: ContainerToolModalsState;
  snapshots: WslSnapshotsState;
  infr: InfrBootstrapState;
}

/** Modais da tela WinThor & WSL: utilitários da stack, snapshots do WSL, assistente INFR e erros do Docker. */
export const WinthorModals: React.FC<WinthorModalsProps> = ({ data, errors, wsl, tools, snapshots, infr }) => (
  <>
    <ContainerToolModals tools={tools} errors={errors} />

    <WslSnapshotsModal
      isOpen={snapshots.isSnapshotsModalOpen}
      onClose={snapshots.closeSnapshotsModal}
      snapshotsList={snapshots.snapshotsList}
      snapshotsDirInput={snapshots.snapshotsDirInput}
      setSnapshotsDirInput={snapshots.setSnapshotsDirInput}
      isLoadingSnapshots={snapshots.isLoadingSnapshots}
      availableDistros={data.availableDistros}
      onLoadSnapshots={snapshots.loadSnapshots}
      onSaveSnapshotsDir={snapshots.handleSaveSnapshotsDir}
      onImportSnapshot={snapshots.handleImportSnapshot}
      onExportSnapshot={snapshots.handleExportSnapshot}
      onUnregisterDistro={snapshots.handleUnregisterDistro}
      snapshotImporting={snapshots.snapshotImporting}
      snapshotExporting={snapshots.snapshotExporting}
      snapshotUnregistering={snapshots.snapshotUnregistering}
      snapshotFeedback={snapshots.snapshotFeedback}
      setSnapshotFeedback={snapshots.setSnapshotFeedback}
    />

    <InfrBootstrapModal
      isOpen={infr.isInfrModalOpen}
      onClose={infr.closeInfrModal}
      infrScripts={infr.infrScripts}
      isLoadingInfrScripts={infr.isLoadingInfrScripts}
      onLoadInfrScripts={infr.loadInfrScripts}
      onRunInfrScript={infr.handleRunInfrScript}
      isExecutingInfr={infr.isExecutingInfr}
      infrOutput={infr.infrOutput}
      initialTab={infr.initialTab}
      distro={data.selectedDistro || data.daemonStatus?.wslDistro || undefined}
    />

    <ContainerSmartErrorModal
      smartError={errors.smartError}
      selectedDistro={data.selectedDistro}
      onClose={() => errors.setSmartError(null)}
      onStartDaemon={wsl.handleStartDockerDaemon}
      onOpenWslTerminal={wsl.handleOpenWslTerminal}
      isStartingDaemon={wsl.isStartingDaemon}
    />
  </>
);
