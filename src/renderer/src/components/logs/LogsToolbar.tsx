import React from 'react';
import { ChevronUp, ChevronDown, Bug } from 'lucide-react';
import { LogLevelFilter, LogLevelCounts } from '../../utils/logsFilterUtils';
import { LogSearchMode, LogContextLines } from '../../utils/logsSearchUtils';
import { LogsSearchControls } from './LogsSearchControls';
import { LogsSeverityFilter } from './LogsSeverityFilter';
import { LogsConsoleControls } from './LogsConsoleControls';

interface LogsToolbarProps {
  searchInputRef: React.RefObject<HTMLInputElement>;
  filterText: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  invertFilter: boolean;
  searchMode: LogSearchMode;
  contextLines: LogContextLines;
  currentMatchPosition: number;
  totalMatches: number;
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
  onSearchModeChange: (mode: LogSearchMode) => void;
  onContextLinesChange: (lines: LogContextLines) => void;
  onNavigateMatch: (direction: 'next' | 'prev') => void;
  onClearSearch: () => void;
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
      searchMode={props.searchMode}
      contextLines={props.contextLines}
      currentMatchPosition={props.currentMatchPosition}
      totalMatches={props.totalMatches}
      onFilterTextChange={props.onFilterTextChange}
      onToggleCaseSensitive={props.onToggleCaseSensitive}
      onToggleRegex={props.onToggleRegex}
      onToggleInvert={props.onToggleInvert}
      onSearchModeChange={props.onSearchModeChange}
      onContextLinesChange={props.onContextLinesChange}
      onNavigateMatch={props.onNavigateMatch}
      onClearSearch={props.onClearSearch}
    />

    <LogsSeverityFilter
      levelFilter={props.levelFilter}
      totalLines={props.totalLines}
      levelCounts={props.levelCounts}
      onChange={props.onLevelChange}
    />

    {/* Navegador Rápido de Erros (Signature Element) */}
    {props.errorCount > 0 && (
      <div className="flex items-center space-x-1 bg-danger/10 border border-danger/30 px-2 py-0.5 rounded-lg text-danger text-2xs font-mono">
        <span className="font-bold mr-1">Erros: {props.errorCount}</span>
        <button
          onClick={() => props.onNavigateErrors('prev')}
          className="p-0.5 hover:bg-danger/20 rounded transition-colors"
          title="Ir para o erro anterior"
          aria-label="Ir para o erro anterior"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => props.onNavigateErrors('next')}
          className="p-0.5 hover:bg-danger/20 rounded transition-colors"
          title="Ir para o próximo erro"
          aria-label="Ir para o próximo erro"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    )}

    {/* Botão Log Analyzer & Exceções WinThor */}
    <button
      onClick={props.onOpenAnalyzer}
      className="px-2 py-1 rounded-md text-xs font-mono font-semibold flex items-center space-x-1.5 border transition-colors bg-danger/10 hover:bg-danger/20 text-danger border-danger/30 cursor-pointer"
      title="Abrir Log Analyzer com diagnóstico detalhado de erros WinThor (ORA, NPE, OSGi, OOM)"
    >
      <Bug className="w-3.5 h-3.5" />
      <span>Exceções</span>
      {props.detectedExceptionsCount > 0 && (
        <span className="px-1.5 py-0.2 rounded text-2xs bg-danger text-background font-mono font-bold tabular-nums">
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
