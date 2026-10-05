import React from 'react';
import { Box, Compass, AlertCircle, Network, Copy } from 'lucide-react';
import type { DockerDaemonStatus } from '../../../../../shared/types';
import { containersHeaderRuntimeLabel } from '../../../utils/containersHeaderLabels';

interface ContainersHeaderTitleProps {
  daemonStatus: DockerDaemonStatus | null;
  onOpenTour: () => void;
  copyWslIp: (text: string, key: string) => void;
  wslIpFeedback: string | null;
}

export const ContainersHeaderTitle: React.FC<ContainersHeaderTitleProps> = ({
  daemonStatus,
  onOpenTour,
  copyWslIp,
  wslIpFeedback
}) => (
  <div className="flex items-center space-x-3.5">
    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0 shadow-xs">
      <Box className="w-5 h-5" />
    </div>
    <div>
      <div className="flex items-center space-x-2.5">
        <h2 className="text-base font-bold text-foreground tracking-tight">Containers & WSL</h2>
        <button
          type="button"
          onClick={onOpenTour}
          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
          title="Rever o tour guiado desta página"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
        {daemonStatus &&
          (daemonStatus.running ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-2xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                {containersHeaderRuntimeLabel(daemonStatus)}
              </span>
              {daemonStatus.wslIp && (
                <button
                  type="button"
                  onClick={() => copyWslIp(daemonStatus.wslIp!, 'wsl-ip')}
                  title="IP do WSL no Host (Clique para copiar)"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/25 text-2xs font-mono transition cursor-pointer"
                >
                  <Network className="w-3 h-3 text-sky-500" />
                  <span>{daemonStatus.wslIp}</span>
                  <Copy className="w-2.5 h-2.5 opacity-70" />
                  {wslIpFeedback === 'wsl-ip' && (
                    <span className="text-2xs font-bold text-emerald-500 ml-0.5">Copiado!</span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <span className="text-2xs px-2 py-0.5 rounded-full font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
              <AlertCircle className="w-3 h-3" /> Offline
            </span>
          ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Orquestração de microsserviços, distros WSL2 e isolamento de runtime
      </p>
    </div>
  </div>
);
