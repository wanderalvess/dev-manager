import React from 'react';
import { Globe, ExternalLink } from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';
import type { StackTopologyNode } from '../../../utils/dockerContainerUtils';

interface TopologyWtaNodeProps {
  node: StackTopologyNode;
  onOpenWtaTools: (container: DockerContainerInfo) => void;
}

/** Nó 3: WTA (Apache Karaf). */
export const TopologyWtaNode: React.FC<TopologyWtaNodeProps> = ({ node, onOpenWtaTools }) => (
  <div
    className={`bg-card border rounded-xl p-3.5 flex flex-col justify-between space-y-2 relative transition ${
      node.running
        ? 'border-border hover:border-primary/40 shadow-xs'
        : 'border-border/80 opacity-75 hover:opacity-100'
    }`}
  >
    <div className="flex items-start justify-between gap-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[10px] bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <Globe className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[13px] text-muted-foreground">
            WTA (Karaf)
          </div>
          <div className="text-sm font-semibold text-foreground font-mono truncate max-w-[120px]">{node.name}</div>
        </div>
      </div>
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          node.running
            ? 'bg-success/10 text-success'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {node.running ? `:${node.port}` : 'OFF'}
      </span>
    </div>

    <div className="pt-1 flex items-center justify-between gap-1 text-[13px]">
      {node.running ? (
        <button
          type="button"
          onClick={() => window.electronAPI?.openExternal?.(`http://localhost:${node.port}/wta/`)}
          className="px-2.5 py-1 bg-card hover:bg-muted text-foreground rounded-lg border border-border font-medium cursor-pointer transition flex items-center gap-1"
        >
          <span>Abrir Portal</span>
          <ExternalLink className="w-3 h-3" />
        </button>
      ) : (
        <span className="text-muted-foreground text-[13px]">Porta 8080</span>
      )}
      {node.container && (
        <button
          type="button"
          onClick={() => onOpenWtaTools(node.container!)}
          className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer font-medium"
        >
          Karaf
        </button>
      )}
    </div>
  </div>
);
