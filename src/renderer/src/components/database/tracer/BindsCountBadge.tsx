import React from 'react';
import { formatBindsCount } from '../../../utils/statementTracerUtils';

export const BindsCountBadge: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
      {formatBindsCount(count)}
    </span>
  ) : (
    <span className="text-muted-foreground text-[10px]">-</span>
  );
