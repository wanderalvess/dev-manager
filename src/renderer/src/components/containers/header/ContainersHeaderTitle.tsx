import React from 'react';
import { Compass, AlertCircle, Network, Copy } from 'lucide-react';
import type { DockerDaemonStatus } from '../../../../../shared/types';
import { containersHeaderRuntimeLabel } from '../../../utils/containersHeaderLabels';

interface ContainersHeaderTitleProps {
  daemonStatus: DockerDaemonStatus | null;
  onOpenTour: () => void;
  copyWslIp: (text: string, key: string) => void;
  wslIpFeedback: string | null;
  title?: string;
  subtitle?: string;
}

export const ContainersHeaderTitle: React.FC<ContainersHeaderTitleProps> = ({
  daemonStatus,
  onOpenTour,
  copyWslIp,
  wslIpFeedback,
  title = 'Containers',
  subtitle = 'Docker/Podman: lista, grupos, lote, Compose e métricas'
}) => (
  <div className="min-w-0">
    <div className="flex items-center gap-3 flex-wrap">
      <h1 className="text-[26px] leading-tight font-semibold tracking-tight text-foreground">{title}</h1>
      <button
        type="button"
        onClick={onOpenTour}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
        title="Rever o tour guiado desta página" aria-label="Rever o tour guiado desta página"
      >
        <Compass className="w-4 h-4" />
      </button>
      {daemonStatus &&
        (daemonStatus.running ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] px-2.5 py-0.5 rounded-full font-medium bg-success/10 text-success flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              {containersHeaderRuntimeLabel(daemonStatus)}
            </span>
            {daemonStatus.wslIp && (
              <button
                type="button"
                onClick={() => copyWslIp(daemonStatus.wslIp!, 'wsl-ip')}
                title="IP do WSL no Host (Clique para copiar)"
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted hover:bg-muted/70 text-foreground text-[13px] font-mono transition cursor-pointer"
              >
                <Network className="w-3 h-3 text-muted-foreground" />
                <span>{daemonStatus.wslIp}</span>
                <Copy className="w-3 h-3 text-muted-foreground" />
                {wslIpFeedback === 'wsl-ip' && (
                  <span className="text-xs font-sans font-medium text-success ml-0.5">Copiado</span>
                )}
              </button>
            )}
          </div>
        ) : (
          <span className="text-[13px] px-2.5 py-0.5 rounded-full font-medium bg-danger/10 text-danger flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Parado
          </span>
        ))}
    </div>
    <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
  </div>
);
