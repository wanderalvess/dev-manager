import React from 'react';
import { Archive, Play, RefreshCw, RotateCw, Sliders } from 'lucide-react';
import type { DockerDaemonStatus, WslDistroInfo } from '../../../../shared/types';
import { ContainersHeaderTitle } from '../containers/header/ContainersHeaderTitle';
import { ContainersRuntimeControls } from '../containers/header/ContainersRuntimeControls';
import { ContainersSequenceBanner } from '../containers/header/ContainersSequenceBanner';
import { ContainersDaemonAlert } from '../containers/header/ContainersDaemonAlert';

interface WinthorHeaderProps {
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
  sequenceProgress: {
    running: boolean;
    currentName?: string;
    index?: number;
    total?: number;
    waitingSeconds?: number;
  };
  containersCount: number;
  onStartWinThorSequence: () => void;
  onOpenSnapshotsModal: () => void;
  onOpenInfrModal: () => void;
  isLoading: boolean;
  onRefreshData: () => void;
  onOpenTour: () => void;
  copyWslIp: (text: string, key: string) => void;
  wslIpFeedback: string | null;
}

const SECONDARY_BTN =
  'flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98';

/** Cabeçalho da tela WinThor & WSL: runtime WSL, subir a stack, snapshots e assistente INFR. */
export const WinthorHeader: React.FC<WinthorHeaderProps> = (p) => (
  <>
    <header
      className="px-4 py-3 bg-card/85 backdrop-blur-sm border-b border-border/80 flex flex-wrap items-center justify-between gap-3 shrink-0"
      data-tour="winthor-header"
    >
      <ContainersHeaderTitle
        daemonStatus={p.daemonStatus}
        onOpenTour={p.onOpenTour}
        copyWslIp={p.copyWslIp}
        wslIpFeedback={p.wslIpFeedback}
        title="WinThor & WSL"
        subtitle="Stack WinThor (Oracle XE, WTA, WSH), distros WSL2, snapshots e bootstrap INFR"
      />

      <div className="flex flex-wrap items-center gap-3">
        <ContainersRuntimeControls
          selectedDistro={p.selectedDistro}
          availableDistros={p.availableDistros}
          isSwitchingDistro={p.isSwitchingDistro}
          isOpeningWslTerminal={p.isOpeningWslTerminal}
          isTerminatingDistro={p.isTerminatingDistro}
          onSelectDistro={p.onSelectDistro}
          onOpenWslTerminal={p.onOpenWslTerminal}
          onTerminateDistro={p.onTerminateDistro}
          environments={[]}
          selectedEnvId=""
          onSelectEnvId={() => undefined}
          onStartEnvironment={() => undefined}
          onDeleteEnvironmentClick={() => undefined}
          sequenceRunning={p.sequenceProgress.running}
        />

        <div className="flex items-center gap-2" data-tour="winthor-actions">
          <button
            onClick={p.onStartWinThorSequence}
            disabled={p.sequenceProgress.running || p.containersCount === 0}
            title="Inicia sequencialmente Oracle XE -> WTA -> WSH"
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {p.sequenceProgress.running ? (
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Subir WinThor</span>
          </button>

          <button
            onClick={p.onOpenSnapshotsModal}
            title="Gerenciamento de Snapshots .tar do WSL (Importar / Exportar / Remover)"
            className={SECONDARY_BTN}
          >
            <Archive className="w-3.5 h-3.5 text-primary" />
            <span className="hidden lg:inline">Snapshots WSL</span>
          </button>

          <button
            onClick={p.onOpenInfrModal}
            title="Assistente de Bootstrap INFR-Docker (Setup Oracle XE, WTA, WSH)"
            className={SECONDARY_BTN}
          >
            <Sliders className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden lg:inline">Assistente INFR</span>
          </button>

          <button
            onClick={p.onRefreshData}
            disabled={p.isLoading}
            title="Atualizar status" aria-label="Atualizar status"
            className="p-1.5 bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground rounded-lg text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${p.isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>
    </header>

    {p.sequenceProgress.running && (
      <ContainersSequenceBanner
        currentName={p.sequenceProgress.currentName}
        index={p.sequenceProgress.index}
        total={p.sequenceProgress.total}
        waitingSeconds={p.sequenceProgress.waitingSeconds}
      />
    )}

    {p.daemonStatus && !p.daemonStatus.running && (
      <ContainersDaemonAlert
        daemonStatus={p.daemonStatus}
        selectedDistro={p.selectedDistro}
        isStartingDaemon={p.isStartingDaemon}
        onStartDockerDaemon={p.onStartDockerDaemon}
        onOpenWslTerminal={p.onOpenWslTerminal}
        onRefreshData={p.onRefreshData}
      />
    )}
  </>
);
