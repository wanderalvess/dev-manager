import React from 'react';
import { Database } from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';
import { getOracleTnsConfig, type StackTopologyNode } from '../../../utils/dockerContainerUtils';

interface TopologyOracleNodeProps {
  node: StackTopologyNode;
  copyFeedback: string | null;
  onCopyText: (text: string, key: string) => void;
  onOpenOracleTools: (container: DockerContainerInfo) => void;
}

/** Nó 2: Oracle XE 11g. */
export const TopologyOracleNode: React.FC<TopologyOracleNodeProps> = ({
  node,
  copyFeedback,
  onCopyText,
  onOpenOracleTools
}) => (
  <div
    className={`bg-muted/30 dark:bg-muted/15 border rounded-lg p-3 flex flex-col justify-between space-y-2 relative transition ${
      node.running
        ? 'border-orange-500/40 hover:border-orange-500/60 shadow-xs'
        : 'border-border/80 opacity-75 hover:opacity-100'
    }`}
  >
    <div className="flex items-start justify-between gap-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
          <Database className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold">
            Oracle XE 11g
          </div>
          <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">{node.name}</div>
        </div>
      </div>
      <span
        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
          node.running
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
            : 'bg-muted text-muted-foreground border-border/70'
        }`}
      >
        {node.running ? `:${node.port}` : 'OFF'}
      </span>
    </div>

    <div className="pt-1 flex items-center justify-between gap-1 text-[10px]">
      <button
        type="button"
        onClick={() => {
          onCopyText(getOracleTnsConfig(node.port), 'topo-tns');
        }}
        className="px-1.5 py-0.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 rounded border border-orange-500/30 font-semibold cursor-pointer transition"
      >
        {copyFeedback === 'topo-tns' ? 'Copiado!' : 'Copiar TNS'}
      </button>
      {node.container && (
        <button
          type="button"
          onClick={() => onOpenOracleTools(node.container!)}
          className="text-muted-foreground hover:text-orange-600 dark:hover:text-orange-400 hover:underline cursor-pointer font-medium"
        >
          Ferramentas
        </button>
      )}
    </div>
  </div>
);
