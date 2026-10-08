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
  <div className="p-3 mx-4 mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
    <div className="flex items-start sm:items-center space-x-2.5">
      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
      <div className="leading-snug">
        <span className="font-bold block sm:inline mr-1">Docker Engine offline:</span>
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
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50 active:scale-98"
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
            className="px-2.5 py-1 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Abrir Terminal WSL
          </button>
        </>
      )}
      <button
        onClick={onRefreshData}
        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 border border-amber-500/35 rounded-lg font-semibold transition cursor-pointer shrink-0"
      >
        Recarregar
      </button>
    </div>
  </div>
);
