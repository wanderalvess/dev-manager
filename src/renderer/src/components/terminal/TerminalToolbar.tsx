import React from 'react';
import { Copy, Check, Trash2, WrapText, ArrowDown, Square, Maximize2, Minimize2, Search } from 'lucide-react';

export const TerminalToolbar: React.FC<{
  title: string;
  lineCount: number;
  isRunning: boolean;
  searchFilter: string;
  onSearchChange: (v: string) => void;
  filterType: string;
  onFilterTypeChange: (v: string) => void;
  onToggleMaximize?: () => void;
  isMaximized: boolean;
  wordWrap: boolean;
  onToggleWordWrap: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  copied: boolean;
  onCopy: () => void;
  onClear: () => void;
  hasLogs: boolean;
  onAbort?: () => void;
  showTitle?: boolean;
}> = ({
  title,
  lineCount,
  isRunning,
  searchFilter,
  onSearchChange,
  onToggleMaximize,
  isMaximized,
  wordWrap,
  onToggleWordWrap,
  autoScroll,
  onToggleAutoScroll,
  copied,
  onCopy,
  onClear,
  hasLogs,
  onAbort,
  showTitle = true
}) => (
  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-[#0d1320] border-b border-slate-800 text-xs text-slate-300 shrink-0 min-w-0">
    <div className="flex items-center gap-1.5 shrink-0">
      <span className={`w-2 h-2 rounded-full shrink-0 ${isRunning ? 'bg-emerald-400' : 'bg-slate-500'}`} />
      {showTitle && <span className="font-semibold text-slate-100 truncate">{title}</span>}
      <span className="text-2xs font-mono tabular-nums text-slate-400 whitespace-nowrap">
        {showTitle ? `(${lineCount})` : `${lineCount} l.`}
      </span>
    </div>
    <div className="flex items-center gap-1 min-w-0 flex-1 justify-end">
      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-0.5 min-w-0 flex-1 max-w-[150px]">
        <Search className="w-3 h-3 text-slate-400 shrink-0" />
        <input
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filtrar..."
          className="bg-transparent text-2xs text-slate-200 placeholder:text-slate-500 focus:outline-none w-full min-w-0"
        />
      </div>
      {isRunning && onAbort && (
        <button type="button" onClick={onAbort} className="px-2 py-1 rounded bg-red-500/20 text-red-300 hover:bg-red-500/30 text-2xs flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap">
          <Square className="w-3 h-3" /> Parar
        </button>
      )}
      <button type="button" onClick={onToggleWordWrap} title="Quebra de linha" className={`p-1 rounded cursor-pointer ${wordWrap ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
        <WrapText className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onToggleAutoScroll} title="Auto-scroll" className={`p-1 rounded cursor-pointer ${autoScroll ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onCopy} disabled={!hasLogs} title="Copiar logs" className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      <button type="button" onClick={onClear} disabled={!hasLogs} title="Limpar" className="p-1 rounded text-slate-400 hover:text-red-400 disabled:opacity-40 cursor-pointer">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      {onToggleMaximize && (
        <button type="button" onClick={onToggleMaximize} className="p-1 rounded text-slate-400 hover:text-white cursor-pointer">
          {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  </div>
);
