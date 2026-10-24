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
  <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col justify-between space-y-2 relative group transition">
    <div className="flex items-start justify-between gap-1">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-[10px] bg-muted flex items-center justify-center text-muted-foreground shrink-0">
          <Terminal className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="text-[13px] text-muted-foreground">
            Host Runtime
          </div>
          <div className="text-sm font-semibold text-foreground font-mono truncate max-w-[120px]">
            {selectedDistro || daemonStatus?.wslDistro || 'WSL2 Nativo'}
          </div>
        </div>
      </div>
      <span
        className={`w-2 h-2 rounded-full mt-1 ${
          daemonStatus?.running ? 'bg-success shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-danger'
        }`}
        title={daemonStatus?.running ? 'Docker Engine Ativo' : 'Docker Engine Offline'}
      />
    </div>

    <div className="pt-1 flex items-center justify-between gap-1 text-[13px]">
      {daemonStatus?.wslIp ? (
        <span className="text-foreground bg-muted px-2 py-0.5 rounded-full">
          IP: {daemonStatus.wslIp}
        </span>
      ) : (
        <span className="text-muted-foreground">IP Local</span>
      )}
      <button
        type="button"
        onClick={onOpenWslTerminal}
        className="text-[13px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer flex items-center gap-1"
      >
        <Terminal className="w-3 h-3" /> Terminal
      </button>
    </div>
  </div>
);
