import React from 'react';
import type { EnvironmentLog } from '../../../../shared/types';

export const TerminalLogLine: React.FC<{ log: string | EnvironmentLog; index: number; wordWrap: boolean }> = ({
  log,
  wordWrap
}) => {
  const text = typeof log === 'string' ? log : `[${log.level.toUpperCase()}] ${log.message}`;
  const isErr = /error|exception|failed|falha/i.test(text) || (typeof log !== 'string' && log.level === 'error');
  const isWarn = /warn|aviso/i.test(text) || (typeof log !== 'string' && log.level === 'warn');
  const color = isErr ? 'text-red-400' : isWarn ? 'text-amber-300' : 'text-slate-200';
  return (
    <div className={`font-mono text-2xs leading-5 ${color} ${wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'}`}>
      {text}
    </div>
  );
};
