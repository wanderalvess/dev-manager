import React from 'react';
import { Terminal } from 'lucide-react';
import type { DockerDaemonStatus } from '../../../../../shared/types';

interface TopologyHostNodeProps {
  selectedDistro?: string;
  daemonStatus: DockerDaemonStatus | null;
  onOpenWslTerminal: () => void;
}

/** Nó 1: WSL2 Runtime Host. */
export const TopologyHostNode: React.FC<TopologyHostNodeProps> = ({
  selectedDistro,
  daemonStatus,
  onOpenWslTerminal
}) => (
  <div className="bg-muted/30 dark:bg-muted/15 border border-border/80 rounded-lg p-3 flex flex-col justify-between space-y-2 relative group hover:border-sky-500/40 transition shadow-2xs">
    <div className="flex items-start justify-between gap-1">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
          <Terminal className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-2xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
            Host Runtime
          </div>
          <div className="text-xs font-bold text-foreground font-mono truncate max-w-[120px]">
            {selectedDistro || daemonStatus?.wslDistro || 'WSL2 Nativo'}
          </div>
        </div>
      </div>
      <span
        className={`w-2 h-2 rounded-full mt-1 ${
          daemonStatus?.running ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-rose-500'
        }`}
        title={daemonStatus?.running ? 'Docker Engine Ativo' : 'Docker Engine Offline'}
      />
    </div>

    <div className="pt-1 flex items-center justify-between gap-1 text-2xs font-mono">
      {daemonStatus?.wslIp ? (
        <span className="text-sky-700 dark:text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
          IP: {daemonStatus.wslIp}
        </span>
      ) : (
        <span className="text-muted-foreground">IP Local</span>
      )}
      <button
        type="button"
        onClick={onOpenWslTerminal}
        className="text-2xs text-muted-foreground hover:text-sky-600 dark:hover:text-sky-400 hover:underline cursor-pointer flex items-center gap-1"
      >
        <Terminal className="w-2.5 h-2.5" /> Terminal
      </button>
    </div>
  </div>
);
