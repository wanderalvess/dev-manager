import React from 'react';
import { AlertCircle, RotateCw, Power } from 'lucide-react';
import type { DockerDaemonStatus } from '../../../../../shared/types';
import { containersHeaderOfflineMessage } from '../../../utils/containersHeaderLabels';

interface ContainersDaemonAlertProps {
  daemonStatus: DockerDaemonStatus;
  selectedDistro: string;
  isStartingDaemon: boolean;
  onStartDockerDaemon: (distro?: string) => void;
  onOpenWslTerminal: (distro?: string) => void;
  onRefreshData: () => void;
}

/** Alerta preventivo quando o Docker Engine não está rodando. */
export const ContainersDaemonAlert: React.FC<ContainersDaemonAlertProps> = ({
  daemonStatus,
  selectedDistro,
  isStartingDaemon,
  onStartDockerDaemon,
  onOpenWslTerminal,
  onRefreshData
}) => (
  <div className="p-3.5 mx-7 mt-1 bg-warning/10 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] text-foreground">
    <div className="flex items-start sm:items-center space-x-2.5">
      <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5 sm:mt-0" />
      <div className="leading-snug">
        <span className="font-semibold block sm:inline mr-1">Docker Engine parado:</span>
        <span>{containersHeaderOfflineMessage(daemonStatus.error, selectedDistro)}</span>
      </div>
    </div>
    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
      {selectedDistro && (
        <>
          <button
            type="button"
            onClick={() => onStartDockerDaemon(selectedDistro)}
            disabled={isStartingDaemon}
            className="flex items-center gap-1.5 h-8 px-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-[13px] font-medium transition cursor-pointer disabled:opacity-50"
          >
            {isStartingDaemon ? (
              <RotateCw className="w-3 h-3 animate-spin" />
            ) : (
              <Power className="w-3 h-3" />
            )}
            <span>{isStartingDaemon ? 'Iniciando Docker...' : 'Iniciar Docker no WSL'}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenWslTerminal(selectedDistro)}
            className="h-8 px-3 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-[13px] font-medium transition cursor-pointer"
          >
            Abrir terminal WSL
          </button>
        </>
      )}
      <button
        onClick={onRefreshData}
        className="h-8 px-3 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-[13px] font-medium transition cursor-pointer shrink-0"
      >
        Recarregar
      </button>
    </div>
  </div>
);
