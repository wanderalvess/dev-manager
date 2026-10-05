import React from 'react';
import {
  getTerminalEntryStyle,
  getTerminalStringLogColor,
  type TerminalLog
} from '../../utils/terminalViewerUtils';

interface TerminalLogLineProps {
  log: TerminalLog;
  index: number;
  wordWrap: boolean;
}

export const TerminalLogLine: React.FC<TerminalLogLineProps> = ({ log, index, wordWrap }) => {
  const widthClass = wordWrap ? 'w-full min-w-0' : 'w-fit min-w-full';
  const textWrapClass = wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre';

  if (typeof log === 'string') {
    const color = getTerminalStringLogColor(log);
    return (
      <div
        className={`flex items-start space-x-2 font-mono text-[11px] leading-relaxed group hover:bg-slate-800/40 px-1 rounded ${widthClass}`}
      >
        <span className="text-slate-600 select-none w-6 text-right text-[10px] shrink-0 font-mono opacity-60">
          {index + 1}
        </span>
        <span className={`flex-1 min-w-0 ${textWrapClass} ${color}`}>{log}</span>
      </div>
    );
  }

  const { color, badge } = getTerminalEntryStyle(log.type);

  return (
    <div
      className={`flex items-start space-x-2 font-mono text-[11px] py-0.5 leading-relaxed group hover:bg-slate-800/40 px-1 rounded ${widthClass}`}
    >
      <span className="text-slate-600 select-none w-6 text-right text-[10px] shrink-0 font-mono opacity-60">
        {index + 1}
      </span>
      <span className="text-slate-500 select-none text-[10px] shrink-0">{log.timestamp}</span>
      <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded border font-semibold select-none shrink-0 ${badge}`}>
        {log.type}
      </span>
      <span className={`flex-1 min-w-0 ${textWrapClass} ${color}`}>{log.message}</span>
    </div>
  );
};
