import React from 'react';
import { Key } from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';
import type { StackTopologyNode } from '../../../utils/dockerContainerUtils';

interface TopologyWshNodeProps {
  node: StackTopologyNode;
  containers: DockerContainerInfo[];
  onOpenWshTools: (container: DockerContainerInfo | null, tab?: 'md5' | 'files' | 'rotina2650') => void;
}

/** Nó 4: WSH (Smart Hub). Sem container WSH, as ferramentas abrem no primeiro container da lista. */
export const TopologyWshNode: React.FC<TopologyWshNodeProps> = ({ node, containers, onOpenWshTools }) => (
  <div
    className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
      node.running
        ? 'border-violet-500/40 hover:border-violet-500/60 shadow-xs'
        : 'border-border/80 opacity-75 hover:opacity-100'
    }`}
  >
    <div className="flex items-start justify-between gap-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-violet-500/10 border border-violet-500/25 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
          <Key className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-2xs font-mono uppercase tracking-wider text-violet-600 dark:text-violet-400 font-bold">
            WinThor Hub (WSH)
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
        {node.running ? ':8080' : 'OFF'}
      </span>
    </div>

    <div className="pt-1 flex items-center justify-between gap-1 text-2xs">
      <button
        type="button"
        onClick={() => {
          onOpenWshTools(node.container || (containers[0] ?? null), 'md5');
        }}
        className="px-1.5 py-0.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-700 dark:text-violet-400 rounded border border-violet-500/30 font-semibold cursor-pointer transition"
      >
        Gerador MD5
      </button>
      <button
        type="button"
        onClick={() => {
          onOpenWshTools(node.container || (containers[0] ?? null), 'rotina2650');
        }}
        className="text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 hover:underline cursor-pointer font-medium"
      >
        Rotina 2650
      </button>
    </div>
  </div>
);
