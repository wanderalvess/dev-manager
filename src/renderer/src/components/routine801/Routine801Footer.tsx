import React from 'react';
import { Terminal, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Routine801InstallResult } from '../../../../shared/types';

interface Routine801FooterProps {
  filteredCount: number;
  lastResult: Routine801InstallResult | null;
  consoleLogCount: number;
  isConsoleExpanded: boolean;
  onToggleConsole: () => void;
  onClose: () => void;
}

export const Routine801Footer: React.FC<Routine801FooterProps> = ({
  filteredCount,
  lastResult,
  consoleLogCount,
  isConsoleExpanded,
  onToggleConsole,
  onClose
}) => (
  <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/20 text-xs text-muted-foreground shrink-0">
    <div className="flex items-center gap-4">
      <span className="font-mono">
        Total no catálogo: <strong className="text-foreground tabular-nums">{filteredCount}</strong>
      </span>

      {lastResult && (
        <span
          className={`flex items-center gap-1 font-medium font-mono ${
            lastResult.success ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {lastResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
          <span>
            {lastResult.installedCount} instalado(s), {lastResult.failedCount} com falha
          </span>
        </span>
      )}
    </div>

    <div className="flex items-center gap-2">
      <button
        onClick={onToggleConsole}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-border hover:bg-muted text-foreground transition-colors font-mono text-2xs"
      >
        <Terminal className="w-3 h-3 text-primary" />
        <span>Terminal Karaf</span>
        <span className="px-1 py-0.2 rounded text-2xs bg-muted text-muted-foreground">
          {consoleLogCount}
        </span>
        {isConsoleExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      <button
        onClick={onClose}
        className="px-3.5 py-1 rounded bg-muted hover:bg-muted/80 text-foreground font-medium transition-colors"
      >
        Fechar
      </button>
    </div>
  </div>
);
