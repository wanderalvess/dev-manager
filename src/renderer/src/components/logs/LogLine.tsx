import React from 'react';
import { Locate } from 'lucide-react';
import { analyzeLogLine } from '../../../../shared/logAnalyzerUtils';
import { getLogRowKind, isStackTraceLine, isSystemNoticeLine, escapeRegExp } from '../../utils/logsFilterUtils';
import { LogSearchMode } from '../../utils/logsSearchUtils';

export type LogFontSize = 'xs' | 'sm' | 'base';

interface LogLineProps {
  line: string;
  originalIndex: number;
  isTargetedError: boolean;
  isSearchMatch?: boolean;
  isActiveSearchMatch?: boolean;
  isContextLine?: boolean;
  filterText: string;
  invertFilter: boolean;
  isCaseSensitive: boolean;
  isRegex?: boolean;
  searchMode?: LogSearchMode;
  fontSize: LogFontSize;
  wordWrap: boolean;
  onOpenAnalyzer: () => void;
  onViewInContext?: () => void;
}

const FONT_CLASSES: Record<LogFontSize, string> = {
  xs: 'text-2xs leading-[19px]',
  sm: 'text-xs leading-[22px]',
  base: 'text-sm leading-[26px]'
};

const Badge: React.FC<{ className: string; label: string }> = ({ className, label }) => (
  <span className={`text-2xs font-mono tracking-wider px-1.5 py-0.2 rounded border uppercase shrink-0 mr-2 select-none ${className}`}>
    {label}
  </span>
);

export const LogLine: React.FC<LogLineProps> = ({
  line,
  originalIndex,
  isTargetedError,
  isSearchMatch,
  isActiveSearchMatch,
  isContextLine,
  filterText,
  invertFilter,
  isCaseSensitive,
  isRegex,
  searchMode,
  fontSize,
  wordWrap,
  onOpenAnalyzer,
  onViewInContext
}) => {
  const kind = getLogRowKind(line);
  const isStackTrace = isStackTraceLine(line);
  const isSystemNotice = isSystemNoticeLine(line);

  let rowBg = 'hover:bg-slate-800/30';
  let textClass = 'text-slate-300';
  let badge: React.ReactNode = null;

  if (isTargetedError) {
    rowBg = 'bg-rose-950/60 ring-1 ring-rose-500 shadow-inner';
  } else if (isActiveSearchMatch) {
    rowBg = 'bg-amber-950/40 ring-1 ring-amber-400/80 shadow-md border-l-2 border-amber-400';
  } else if (isSearchMatch) {
    rowBg = 'bg-amber-950/15 hover:bg-amber-950/25';
  } else if (kind === 'error') {
    rowBg = 'bg-rose-950/15 hover:bg-rose-950/25';
    textClass = 'text-rose-300 font-medium';
    badge = <Badge className="font-black bg-rose-500/20 text-rose-400 border-rose-500/30" label="ERR" />;
  } else if (kind === 'warn') {
    rowBg = 'bg-amber-950/10 hover:bg-amber-950/20';
    textClass = 'text-amber-300';
    badge = <Badge className="font-bold bg-amber-500/20 text-amber-400 border-amber-500/30" label="WRN" />;
  } else if (kind === 'info' && !isStackTrace) {
    textClass = 'text-sky-200/90';
    badge = <Badge className="font-semibold bg-sky-500/10 text-sky-400 border-sky-500/20" label="INF" />;
  } else if (kind === 'debug') {
    textClass = 'text-slate-400';
  } else if (isSystemNotice) {
    textClass = 'text-yellow-400 font-bold';
    rowBg = 'bg-yellow-950/25';
  }

  // Realce do termo pesquisado
  let contentNode: React.ReactNode = line;
  if (filterText.trim() && !invertFilter) {
    const q = filterText.trim();
    let reg: RegExp | null = null;
    try {
      reg = new RegExp(`(${isRegex ? q : escapeRegExp(q)})`, isCaseSensitive ? 'g' : 'gi');
    } catch {
      reg = null;
    }

    if (reg) {
      const parts = line.split(reg);
      if (parts.length > 1) {
        contentNode = parts.map((part, pIdx) => {
          let matches = false;
          try {
            matches = isRegex
              ? new RegExp(`^${q}$`, isCaseSensitive ? '' : 'i').test(part)
              : isCaseSensitive
              ? part === q
              : part.toLowerCase() === q.toLowerCase();
          } catch {
            matches = false;
          }

          if (matches) {
            return (
              <mark
                key={pIdx}
                className={
                  isActiveSearchMatch
                    ? 'bg-amber-300 text-slate-950 px-1 py-0.2 rounded-xs font-black shadow-xs ring-1 ring-amber-500 not-italic'
                    : 'bg-amber-400/85 text-slate-950 px-1 py-0.2 rounded-xs font-bold not-italic shadow-2xs'
                }
              >
                {part}
              </mark>
            );
          }
          return part;
        });
      }
    }
  }

  const exceptionMatch = analyzeLogLine(line, originalIndex);

  return (
    <div
      id={`log-line-${originalIndex}`}
      className={`flex items-start px-3 py-0.5 font-mono ${FONT_CLASSES[fontSize]} ${rowBg} transition-colors select-text group ${
        isStackTrace ? 'pl-8 border-l-2 border-slate-700/50' : ''
      }`}
    >
      {/* Numero real da linha no arquivo */}
      <span
        className={`w-12 shrink-0 select-none text-right pr-3 font-mono text-2xs transition-colors ${
          isActiveSearchMatch
            ? 'text-amber-400 font-bold'
            : 'text-slate-600 group-hover:text-slate-400'
        }`}
        title={`Linha ${originalIndex + 1} no arquivo`}
      >
        {originalIndex + 1}
      </span>

      <div className="flex-1 flex items-baseline flex-wrap">
        {badge}
        {isContextLine && (
          <span
            className="text-2xs font-mono tracking-wider px-1 py-0.2 rounded border uppercase shrink-0 mr-1.5 select-none bg-slate-800/80 text-slate-400 border-slate-700/60"
            title="Linha de contexto ao redor da ocorrência"
          >
            CTX
          </span>
        )}
        {exceptionMatch && (
          <button
            type="button"
            onClick={onOpenAnalyzer}
            className="text-2xs font-bold font-mono tracking-wider px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 border border-rose-500/40 uppercase shrink-0 mr-2 cursor-pointer hover:bg-rose-500/40 select-none"
            title={`${exceptionMatch.title} — clique para abrir diagnóstico e comandos recomendados`}
          >
            {exceptionMatch.code}
          </button>
        )}
        <span className={`${textClass} ${wordWrap ? 'break-all whitespace-pre-wrap' : 'whitespace-pre'}`}>
          {contentNode}
        </span>
      </div>

      {/* Ação de ir para o contexto completo quando estiver no modo filter */}
      {searchMode === 'filter' && onViewInContext && (
        <button
          type="button"
          onClick={onViewInContext}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0 px-1.5 py-0.5 rounded text-2xs font-mono text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 flex items-center space-x-1 cursor-pointer select-none"
          title="Ver esta linha no log completo (com todo o contexto ao redor)"
        >
          <Locate className="w-3 h-3" />
          <span>Contexto</span>
        </button>
      )}
    </div>
  );
};
