import React from 'react';
import { X } from 'lucide-react';
import type {
  DockerContainerInfo,
  DockerDaemonStatus
} from '../../../../../shared/types';
import { computeStackTopology } from '../../../utils/dockerContainerUtils';
import { topologyBusStackState } from '../../../utils/topologyBusState';
import { TopologyStackBadge } from '../bus/TopologyStackBadge';
import { TopologyHostNode } from '../bus/TopologyHostNode';
import { TopologyOracleNode } from '../bus/TopologyOracleNode';
import { TopologyWtaNode } from '../bus/TopologyWtaNode';
import { TopologyWshNode } from '../bus/TopologyWshNode';

export interface ContainerTopologyBusProps {
  showTopologyBus: boolean;
  onClose: () => void;
  stackTopology: ReturnType<typeof computeStackTopology>;
  selectedDistro?: string;
  daemonStatus: DockerDaemonStatus | null;
  onOpenWslTerminal: () => void;
  onOpenOracleTools: (container: DockerContainerInfo) => void;
  onOpenWtaTools: (container: DockerContainerInfo) => void;
  onOpenWshTools: (container: DockerContainerInfo | null, tab?: 'md5' | 'files' | 'rotina2650') => void;
  copyFeedback: string | null;
  onCopyText: (text: string, key: string) => void;
  containers: DockerContainerInfo[];
}

export const ContainerTopologyBus: React.FC<ContainerTopologyBusProps> = ({
  showTopologyBus,
  onClose,
  stackTopology,
  selectedDistro,
  daemonStatus,
  onOpenWslTerminal,
  onOpenOracleTools,
  onOpenWtaTools,
  onOpenWshTools,
  copyFeedback,
  onCopyText,
  containers
}) => {
  if (!showTopologyBus) return null;

  return (
    <div className="mx-4 mt-3 bg-card border border-border/80 rounded-xl p-3.5 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            <span>Topologia do Ambiente WinThor</span>
            <span className="text-2xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/60 font-normal">
              WSL2 &amp; Containers
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <TopologyStackBadge state={topologyBusStackState(stackTopology)} />

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            title="Ocultar Barramento de Topologia"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nós Interconectados da Topologia */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-stretch relative">
        <TopologyHostNode
          selectedDistro={selectedDistro}
          daemonStatus={daemonStatus}
          onOpenWslTerminal={onOpenWslTerminal}
        />
        <TopologyOracleNode
          node={stackTopology.oracle}
          copyFeedback={copyFeedback}
          onCopyText={onCopyText}
          onOpenOracleTools={onOpenOracleTools}
        />
        <TopologyWtaNode node={stackTopology.wta} onOpenWtaTools={onOpenWtaTools} />
        <TopologyWshNode node={stackTopology.wsh} containers={containers} onOpenWshTools={onOpenWshTools} />
      </div>
    </div>
  );
};
