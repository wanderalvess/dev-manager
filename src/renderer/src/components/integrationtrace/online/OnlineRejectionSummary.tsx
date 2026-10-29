import React from 'react';
import { topRejections, type OnlineOrderLogEntry } from '../../../../../shared/onlineOrderLog';

/** Os motivos de recusa que mais aparecem no resultado: mostra de cara se o problema é um só repetido ou vários. */
export const OnlineRejectionSummary: React.FC<{ entries: OnlineOrderLogEntry[] }> = ({ entries }) => {
  const groups = topRejections(entries);
  if (groups.length === 0) return null;
  const total = entries.filter((entry) => entry.reason).length;
  return (
    <section className="px-3 py-2 border-b border-border space-y-1" aria-label="Motivos de recusa mais frequentes">
      <h4 className="text-xs font-semibold text-foreground">Motivos de recusa mais frequentes ({total} recusa(s) no resultado)</h4>
      <ul className="space-y-0.5">
        {groups.map((group) => (
          <li key={`${group.code ?? ''}|${group.message}`} className="text-2xs flex gap-2 min-w-0">
            <span className="font-mono text-danger shrink-0 w-8 text-right">{group.count}×</span>
            <span className="min-w-0 break-words">
              {group.code && <span className="font-mono text-muted-foreground">{group.code} </span>}
              <span className="text-foreground">{group.message}</span>
              <span className="text-muted-foreground">
                {' '}
                · {group.orders.length} pedido(s): {group.orders.slice(0, 5).join(', ')}
                {group.orders.length > 5 ? '…' : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
