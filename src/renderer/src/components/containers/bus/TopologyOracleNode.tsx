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
    className={`bg-card border rounded-xl p-3.5 flex flex-col justify-between space-y-2 relative transition ${
      node.running
        ? 'border-border hover:border-primary/40 shadow-xs'
        : 'border-border/80 opacity-75 hover:opacity-100'
    }`}
  >
    <div className="flex items-start justify-between gap-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[10px] bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <Database className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[13px] text-muted-foreground">
            Oracle XE 11g
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
      <button
        type="button"
        onClick={() => {
          onCopyText(getOracleTnsConfig(node.port), 'topo-tns');
        }}
        className="px-2.5 py-1 bg-card hover:bg-muted text-foreground rounded-lg border border-border font-medium cursor-pointer transition"
      >
        {copyFeedback === 'topo-tns' ? 'Copiado!' : 'Copiar TNS'}
      </button>
      {node.container && (
        <button
          type="button"
          onClick={() => onOpenOracleTools(node.container!)}
          className="text-muted-foreground hover:text-foreground hover:underline cursor-pointer font-medium"
        >
          Ferramentas
        </button>
      )}
    </div>
  </div>
);
