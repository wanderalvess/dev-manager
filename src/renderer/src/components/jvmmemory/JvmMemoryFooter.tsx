import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';

interface JvmMemoryFooterProps {
  autoRefresh: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  refreshIntervalSec: number;
  onRefreshIntervalChange: (value: number) => void;
  isGcRunning: boolean;
  onTriggerGc: () => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const JvmMemoryFooter: React.FC<JvmMemoryFooterProps> = ({
  autoRefresh,
  onAutoRefreshChange,
  refreshIntervalSec,
  onRefreshIntervalChange,
  isGcRunning,
  onTriggerGc,
  isLoading,
  onRefresh
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-border bg-muted/20">
    <div className="flex items-center space-x-3 text-xs">
      <label className="flex items-center space-x-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
        <input
          type="checkbox"
          checked={autoRefresh}
          onChange={(e) => onAutoRefreshChange(e.target.checked)}
          className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
        />
        <span className="font-mono text-[11px]">Auto-refresh</span>
      </label>

      {autoRefresh && (
        <select
          value={refreshIntervalSec}
          onChange={(e) => onRefreshIntervalChange(Number(e.target.value))}
          className="bg-card border border-border rounded px-2 py-0.5 text-xs text-foreground font-mono focus:outline-none"
        >
          <option value={2}>2s</option>
          <option value={3}>3s</option>
          <option value={5}>5s</option>
          <option value={10}>10s</option>
        </select>
      )}
    </div>

    <div className="flex items-center space-x-2">
      <button
        onClick={onTriggerGc}
        disabled={isGcRunning}
        className="px-3 py-1.5 rounded-md text-xs font-semibold font-mono flex items-center space-x-1.5 transition-colors bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 cursor-pointer disabled:opacity-40"
        title="Disparar execução de System.gc() na JVM do Karaf"
      >
        <Trash2 className={`w-3.5 h-3.5 ${isGcRunning ? 'animate-spin' : ''}`} />
        <span>{isGcRunning ? 'EXECUTANDO GC...' : 'DISPARAR GC'}</span>
      </button>

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        <span>Atualizar</span>
      </button>
    </div>
  </div>
);
