import React from 'react';
import { analyzeLogLine } from '../../utils/logAnalyzerUtils';
import { getLogRowKind, isStackTraceLine, isSystemNoticeLine, escapeRegExp } from '../../utils/logsFilterUtils';

export type LogFontSize = 'xs' | 'sm' | 'base';

interface LogLineProps {
  line: string;
  index: number;
  isTargetedError: boolean;
  filterText: string;
  invertFilter: boolean;
  isCaseSensitive: boolean;
  fontSize: LogFontSize;
  wordWrap: boolean;
  onOpenAnalyzer: () => void;
}

const FONT_CLASSES: Record<LogFontSize, string> = {
  xs: 'text-[11px] leading-[19px]',
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
  index,
  isTargetedError,
  filterText,
  invertFilter,
  isCaseSensitive,
  fontSize,
  wordWrap,
  onOpenAnalyzer
}) => {
  const kind = getLogRowKind(line);
  const isStackTrace = isStackTraceLine(line);
  const isSystemNotice = isSystemNoticeLine(line);

  let rowBg = 'hover:bg-slate-800/30';
  let textClass = 'text-slate-300';
  let badge: React.ReactNode = null;

  if (isTargetedError) {
    rowBg = 'bg-rose-950/60 ring-1 ring-rose-500 shadow-inner';
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
    const parts = line.split(new RegExp(`(${escapeRegExp(q)})`, isCaseSensitive ? 'g' : 'gi'));
    if (parts.length > 1) {
      contentNode = parts.map((part, pIdx) => {
        const matches = isCaseSensitive ? part === q : part.toLowerCase() === q.toLowerCase();
        if (matches) {
          return (
            <mark key={pIdx} className="bg-amber-400 text-slate-950 px-1 py-0.2 rounded-xs font-bold not-italic shadow-xs">
              {part}
            </mark>
          );
        }
        return part;
      });
    }
  }

  const exceptionMatch = analyzeLogLine(line, index);

  return (
    <div
      id={`log-line-${index}`}
      className={`flex items-start px-3 py-0.5 font-mono ${FONT_CLASSES[fontSize]} ${rowBg} transition-colors select-text group ${
        isStackTrace ? 'pl-8 border-l-2 border-slate-700/50' : ''
      }`}
    >
      <span className="w-12 shrink-0 text-slate-600 select-none text-right pr-3 font-mono text-2xs group-hover:text-slate-400">
        {index + 1}
      </span>

      <div className="flex-1 flex items-baseline flex-wrap">
        {badge}
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
    </div>
  );
};
