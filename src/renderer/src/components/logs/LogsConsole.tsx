import React from 'react';
import { ArrowDown } from 'lucide-react';
import { LogWatchStatus } from '../../../../shared/types';
import { LogLine, LogFontSize } from './LogLine';
import { LogsEmptyState } from './LogsEmptyState';

interface LogsConsoleProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  lines: string[];
  hasSources: boolean;
  status: LogWatchStatus | null;
  filePath: string;
  hasNewLinesBelow: boolean;
  activeErrorIndex: number;
  filterText: string;
  invertFilter: boolean;
  isCaseSensitive: boolean;
  hasActiveFilter: boolean;
  fontSize: LogFontSize;
  wordWrap: boolean;
  onScroll: () => void;
  onScrollToBottom: () => void;
  onOpenAnalyzer: () => void;
  onOpenManage: () => void;
}

/** Viewport do terminal: linhas filtradas, estado vazio e aviso de novos logs. */
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
      {props.lines.length > 0 ? (
        <div className="min-w-full divide-y divide-slate-900/30">
          {props.lines.map((line, idx) => (
            <LogLine
              key={idx}
              line={line}
              index={idx}
              isTargetedError={idx === props.activeErrorIndex}
              filterText={props.filterText}
              invertFilter={props.invertFilter}
              isCaseSensitive={props.isCaseSensitive}
              fontSize={props.fontSize}
              wordWrap={props.wordWrap}
              onOpenAnalyzer={props.onOpenAnalyzer}
            />
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
