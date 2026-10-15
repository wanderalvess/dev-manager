import React from 'react';
import { formatBindsCount } from '../../../utils/statementTracerUtils';

export const BindsCountBadge: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <span className="px-1.5 py-0.5 rounded text-2xs font-mono font-bold bg-info/15 text-info border border-info/30">
      {formatBindsCount(count)}
    </span>
  ) : (
    <span className="text-muted-foreground text-2xs">-</span>
  );
