import React from 'react';
import {
  Terminal,
  Trash2,
  Copy,
  Check,
  Search,
  ArrowDown,
  WrapText,
  AlignLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { TerminalFilterType } from '../../utils/terminalViewerUtils';

interface TerminalToolbarProps {
  title: string;
  lineCount: number;
  isRunning: boolean;
  searchFilter: string;
  onSearchChange: (value: string) => void;
  filterType: TerminalFilterType;
  onFilterTypeChange: (type: TerminalFilterType) => void;
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
}

export const TerminalToolbar: React.FC<TerminalToolbarProps> = ({
  title,
  lineCount,
  isRunning,
  searchFilter,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  onToggleMaximize,
  isMaximized,
  wordWrap,
  onToggleWordWrap,
  autoScroll,
  onToggleAutoScroll,
  copied,
  onCopy,
  onClear,
  hasLogs
}) => (
  <div className="flex flex-wrap items-center justify-between px-3.5 py-2 bg-[#0e1422] border-b border-[#1b283f] gap-2 shrink-0">
    <div className="flex items-center space-x-2.5">
      <div className="p-1 rounded-lg bg-primary/15 border border-primary/30 text-primary">
        <Terminal className="w-3.5 h-3.5" />
      </div>
      <div>
        <span className="text-xs font-bold text-white tracking-wide">{title}</span>
        <span className="text-2xs font-mono text-slate-400 ml-2">
          ({lineCount} {lineCount === 1 ? 'linha' : 'linhas'})
        </span>
      </div>

      {isRunning && (
        <span className="flex items-center space-x-1.5 text-2xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-semibold animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span>Execução Ativa</span>
        </span>
      )}
    </div>

    {/* Filtros e Busca */}
    <div className="flex items-center space-x-2">
      {/* Busca no log */}
      <div className="relative">
        <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
        <input
          type="text"
          placeholder="Filtrar logs..."
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
          className="bg-[#080d17] border border-slate-700 hover:border-slate-500 rounded-lg pl-7 pr-2 py-1 text-[11px] text-slate-100 placeholder-slate-400 focus:outline-none focus:border-primary font-mono w-28 md:w-36 transition-colors"
        />
      </div>

      {/* Filtros por Tipo */}
      <div className="hidden sm:flex items-center space-x-1 bg-[#080d17] p-0.5 rounded-lg border border-slate-700">
        <button
          onClick={() => onFilterTypeChange('all')}
          className={`px-2 py-0.5 rounded text-2xs font-semibold transition-colors ${
            filterType === 'all'
              ? 'bg-primary text-primary-foreground font-bold shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => onFilterTypeChange('error')}
          className={`px-2 py-0.5 rounded text-2xs font-semibold transition-colors ${
            filterType === 'error'
              ? 'bg-rose-600 text-white font-bold shadow-sm'
              : 'text-slate-300 hover:text-rose-300 hover:bg-rose-950/40'
          }`}
        >
          Erros
        </button>
      </div>

      {/* Ações */}
      {onToggleMaximize && (
        <button
          onClick={onToggleMaximize}
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            isMaximized
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-bold'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title={isMaximized ? 'Restaurar tamanho normal do console' : 'Maximizar console (largura e altura total)'}
        >
          {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      )}

      <button
        onClick={onToggleWordWrap}
        className={`p-1.5 rounded-lg border text-xs transition-colors ${
          wordWrap
            ? 'bg-primary/20 border-primary/50 text-primary font-bold'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
        }`}
        title={wordWrap ? 'Quebra de Linha Ativa (clique para modo tabela / scroll horizontal)' : 'Quebra de Linha Desativada (modo colunas / tabela Karaf preservado)'}
      >
        {wordWrap ? <WrapText className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
      </button>

      <button
        onClick={onToggleAutoScroll}
        className={`p-1.5 rounded-lg border text-xs transition-colors ${
          autoScroll
            ? 'bg-primary/20 border-primary/50 text-primary font-bold'
            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
        }`}
        title={autoScroll ? 'Auto-rolagem Ativa' : 'Auto-rolagem Pausada'}
      >
        <ArrowDown className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onCopy}
        disabled={!hasLogs}
        className="p-1.5 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-xs transition-colors disabled:opacity-30 cursor-pointer"
        title="Copiar Conteúdo do Console"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      <button
        onClick={onClear}
        disabled={!hasLogs}
        className="p-1.5 text-slate-300 hover:text-rose-300 bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 rounded-lg text-xs transition-colors disabled:opacity-30 cursor-pointer"
        title="Limpar Console"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);
