import React from 'react';
import { HttpMethod } from '../../../../shared/types';

interface HttpBadgeProps {
  method: HttpMethod | string;
  size?: 'sm' | 'md';
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  POST: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  PUT: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
  PATCH: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  HEAD: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  OPTIONS: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
};

export const HttpBadge: React.FC<HttpBadgeProps> = ({ method, size = 'sm' }) => {
  const m = (method || 'GET').toUpperCase();
  const style = METHOD_STYLES[m] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-mono font-bold rounded border uppercase tracking-wider ${sizeClass} ${style}`}>
      {m}
    </span>
  );
};
