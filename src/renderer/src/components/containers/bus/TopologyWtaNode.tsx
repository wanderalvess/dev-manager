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
    className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
      node.running
        ? 'border-cyan-500/40 hover:border-cyan-500/60 shadow-2xs'
        : 'border-border/80 opacity-75 hover:opacity-100'
    }`}
  >
    <div className="flex items-start justify-between gap-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
          <Globe className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-2xs font-mono uppercase tracking-wider text-cyan-600 dark:text-cyan-400 font-bold">
            WTA (Karaf)
          </div>
          <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">{node.name}</div>
        </div>
      </div>
      <span
        className={`text-2xs font-mono font-bold px-1.5 py-0.2 rounded border ${
          node.running
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            : 'bg-muted text-muted-foreground border-border/70'
        }`}
      >
        {node.running ? `:${node.port}` : 'OFF'}
      </span>
    </div>

    <div className="pt-1 flex items-center justify-between gap-1 text-2xs">
      {node.running ? (
        <button
          type="button"
          onClick={() => window.electronAPI?.openExternal?.(`http://localhost:${node.port}/wta/`)}
          className="px-1.5 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 rounded border border-cyan-500/30 font-semibold cursor-pointer transition flex items-center gap-1"
        >
          <span>Abrir Portal</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </button>
      ) : (
        <span className="text-muted-foreground text-2xs font-mono">Porta 8080</span>
      )}
      {node.container && (
        <button
          type="button"
          onClick={() => onOpenWtaTools(node.container!)}
          className="text-muted-foreground hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline cursor-pointer font-medium"
        >
          Karaf
        </button>
      )}
    </div>
  </div>
);
