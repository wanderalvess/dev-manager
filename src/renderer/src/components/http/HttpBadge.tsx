import React from 'react';
import { HttpMethod } from '../../../../shared/types';

interface HttpBadgeProps {
  method: HttpMethod | string;
  size?: 'sm' | 'md';
}

const METHOD_STYLES: Record<string, string> = {
  GET: 'bg-success/15 text-success border-success/30',
  POST: 'bg-warning/15 text-warning border-warning/30',
  PUT: 'bg-info/15 text-info border-info/30',
  DELETE: 'bg-danger/15 text-danger border-danger/30',
  PATCH: 'bg-primary/15 text-primary border-primary/30',
  HEAD: 'bg-info/15 text-info border-info/30',
  OPTIONS: 'bg-slate-500/15 text-slate-400 border-slate-500/30'
};

export const HttpBadge: React.FC<HttpBadgeProps> = ({ method, size = 'sm' }) => {
  const m = (method || 'GET').toUpperCase();
  const style = METHOD_STYLES[m] || 'bg-slate-500/15 text-slate-400 border-slate-500/30';
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-semibold rounded border ${sizeClass} ${style}`}>
      {m}
    </span>
  );
};
