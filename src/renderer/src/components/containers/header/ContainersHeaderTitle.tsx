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
    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary shrink-0 shadow-2xs">
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
              <span className="text-2xs px-2.5 py-0.5 rounded-full font-semibold bg-success/10 text-success border border-success/30 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                {containersHeaderRuntimeLabel(daemonStatus)}
              </span>
              {daemonStatus.wslIp && (
                <button
                  type="button"
                  onClick={() => copyWslIp(daemonStatus.wslIp!, 'wsl-ip')}
                  title="IP do WSL no Host (Clique para copiar)"
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-info/10 hover:bg-info/20 text-info border border-info/25 text-2xs font-mono transition cursor-pointer"
                >
                  <Network className="w-3 h-3 text-info" />
                  <span>{daemonStatus.wslIp}</span>
                  <Copy className="w-2.5 h-2.5 opacity-70" />
                  {wslIpFeedback === 'wsl-ip' && (
                    <span className="text-2xs font-bold text-success ml-0.5">Copiado!</span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <span className="text-2xs px-2 py-0.5 rounded-full font-semibold bg-danger/10 text-danger border border-danger/30 flex items-center gap-1.5">
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
