import React from 'react';
import { ArrowDown } from 'lucide-react';
import { LogWatchStatus } from '../../../../shared/types';
import { LogDisplayLine, LogSearchMode } from '../../utils/logsSearchUtils';
import { LogLine, LogFontSize } from './LogLine';
import { LogsEmptyState } from './LogsEmptyState';

interface LogsConsoleProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  displayLines: LogDisplayLine[];
  activeOriginalIndex: number | null;
  activeErrorIndex: number;
  hasSources: boolean;
  status: LogWatchStatus | null;
  filePath: string;
  hasNewLinesBelow: boolean;
  filterText: string;
  invertFilter: boolean;
  isCaseSensitive: boolean;
  isRegex: boolean;
  searchMode: LogSearchMode;
  hasActiveFilter: boolean;
  fontSize: LogFontSize;
  wordWrap: boolean;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onOpenAnalyzer: () => void;
  onOpenManage: () => void;
  onJumpToLineInContext: (originalIndex: number) => void;
}

/** Viewport do terminal: linhas exibidas com contexto, separadores de lacunas e estado vazio. */
export const LogsConsole: React.FC<LogsConsoleProps> = (props) => (
  <>
    {/* Alerta Flutuante de Novos Logs */}
    {props.hasNewLinesBelow && (
      <button
        onClick={props.onScrollToBottom}
        className="absolute bottom-4 right-6 z-20 px-3.5 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-xl shadow-primary/30 flex items-center space-x-1.5 hover:scale-105 active:scale-95 transition-all animate-bounce"
      >
        <ArrowDown className="w-3.5 h-3.5" />
        <span>Novos logs recebidos</span>
      </button>
    )}

    {/* Viewport de Linhas */}
    <div
      ref={props.scrollContainerRef}
      onScroll={props.onScroll}
      data-tour="console-live-tail"
      className="flex-1 overflow-y-auto overflow-x-auto p-1.5 font-mono scroll-smooth select-text"
    >
      {props.displayLines.length > 0 ? (
        <div className="min-w-full divide-y divide-slate-900/30">
          {props.displayLines.map((item, idx) => (
            <React.Fragment key={`${item.originalIndex}-${idx}`}>
              {item.gapBeforeCount && item.gapBeforeCount > 0 ? (
                <div className="flex items-center justify-center py-1 text-2xs text-slate-500 font-mono bg-slate-900/40 border-y border-slate-800/60 select-none">
                  ··· {item.gapBeforeCount} {item.gapBeforeCount === 1 ? 'linha omitida' : 'linhas omitidas'} ···
                </div>
              ) : null}
              <LogLine
                line={item.text}
                originalIndex={item.originalIndex}
                isTargetedError={item.originalIndex === props.activeErrorIndex}
                isSearchMatch={item.isMatch}
                isActiveSearchMatch={item.originalIndex === props.activeOriginalIndex}
                isContextLine={item.isContext}
                filterText={props.filterText}
                invertFilter={props.invertFilter}
                isCaseSensitive={props.isCaseSensitive}
                isRegex={props.isRegex}
                searchMode={props.searchMode}
                fontSize={props.fontSize}
                wordWrap={props.wordWrap}
                onOpenAnalyzer={props.onOpenAnalyzer}
                onViewInContext={() => props.onJumpToLineInContext(item.originalIndex)}
              />
            </React.Fragment>
          ))}
        </div>
      ) : (
        <LogsEmptyState
          hasSources={props.hasSources}
          status={props.status}
          filePath={props.filePath}
          hasActiveFilter={props.hasActiveFilter}
          onOpenManage={props.onOpenManage}
        />
      )}
    </div>
  </>
);
