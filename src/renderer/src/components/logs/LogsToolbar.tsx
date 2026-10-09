import React from 'react';
import { ChevronUp, ChevronDown, Bug } from 'lucide-react';
import { LogLevelFilter, LogLevelCounts } from '../../utils/logsFilterUtils';
import { LogsSearchControls } from './LogsSearchControls';
import { LogsSeverityFilter } from './LogsSeverityFilter';
import { LogsConsoleControls } from './LogsConsoleControls';

interface LogsToolbarProps {
  searchInputRef: React.RefObject<HTMLInputElement>;
  filterText: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  invertFilter: boolean;
  levelFilter: LogLevelFilter;
  totalLines: number;
  levelCounts: LogLevelCounts;
  errorCount: number;
  detectedExceptionsCount: number;
  isPaused: boolean;
  isAutoScroll: boolean;
  wordWrap: boolean;
  copyFeedback: string | null;
  onFilterTextChange: (value: string) => void;
  onToggleCaseSensitive: () => void;
  onToggleRegex: () => void;
  onToggleInvert: () => void;
  onLevelChange: (level: LogLevelFilter) => void;
  onNavigateErrors: (direction: 'next' | 'prev') => void;
  onOpenAnalyzer: () => void;
  onTogglePause: () => void;
  onToggleAutoScroll: () => void;
  onToggleWrap: () => void;
  onClearScreen: () => void;
  onCopyFiltered: () => void;
  onExport: () => void;
}

export const LogsToolbar: React.FC<LogsToolbarProps> = (props) => (
  <div className="bg-card/75 border-b border-border/70 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs select-none">
    <LogsSearchControls
      searchInputRef={props.searchInputRef}
      filterText={props.filterText}
      isRegex={props.isRegex}
      isCaseSensitive={props.isCaseSensitive}
      invertFilter={props.invertFilter}
      onFilterTextChange={props.onFilterTextChange}
      onToggleCaseSensitive={props.onToggleCaseSensitive}
      onToggleRegex={props.onToggleRegex}
      onToggleInvert={props.onToggleInvert}
    />

    <LogsSeverityFilter
      levelFilter={props.levelFilter}
      totalLines={props.totalLines}
      levelCounts={props.levelCounts}
      onChange={props.onLevelChange}
    />

    {/* Navegador Rápido de Erros (Signature Element) */}
    {props.errorCount > 0 && (
      <div className="flex items-center space-x-1 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg text-rose-300 text-2xs font-mono">
        <span className="font-bold mr-1">Erros: {props.errorCount}</span>
        <button
          onClick={() => props.onNavigateErrors('prev')}
          className="p-0.5 hover:bg-rose-500/20 rounded transition-colors"
          title="Ir para o erro anterior" aria-label="Ir para o erro anterior"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => props.onNavigateErrors('next')}
          className="p-0.5 hover:bg-rose-500/20 rounded transition-colors"
          title="Ir para o próximo erro" aria-label="Ir para o próximo erro"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    )}

    {/* Botão Log Analyzer & Exceções WinThor */}
    <button
      onClick={props.onOpenAnalyzer}
      className="px-2 py-1 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 border transition-colors bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30 cursor-pointer"
      title="Abrir Log Analyzer com diagnóstico detalhado de erros WinThor (ORA, NPE, OSGi, OOM)"
    >
      <Bug className="w-3.5 h-3.5" />
      <span>Exceções</span>
      {props.detectedExceptionsCount > 0 && (
        <span className="px-1.5 py-0.2 rounded text-2xs bg-rose-500 text-white font-mono font-bold tabular-nums">
          {props.detectedExceptionsCount}
        </span>
      )}
    </button>

    <LogsConsoleControls
      isPaused={props.isPaused}
      isAutoScroll={props.isAutoScroll}
      wordWrap={props.wordWrap}
      copyFeedback={props.copyFeedback}
      onTogglePause={props.onTogglePause}
      onToggleAutoScroll={props.onToggleAutoScroll}
      onToggleWrap={props.onToggleWrap}
      onClearScreen={props.onClearScreen}
      onCopyFiltered={props.onCopyFiltered}
      onExport={props.onExport}
    />
  </div>
);
