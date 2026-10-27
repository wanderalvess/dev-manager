import React from 'react';
import type { WshItem, WshItemTone } from '../../../../../shared/wshMonitorTypes';
import { formatTraceTime } from '../../../utils/integrationTraceView';
import { findFlowByRoute, flowLabel } from '../../../../../shared/wshFlowCatalog';

const routeLabel = (route: string) => {
  const flow = findFlowByRoute(route);
  return flow ? flowLabel(flow) : route;
};

// Literais completos para o scanner do Tailwind
const WSH_TONE_BADGE: Record<WshItemTone, string> = {
  ok: 'bg-success/10 text-success',
  error: 'bg-danger/10 text-danger',
  other: 'bg-muted text-muted-foreground'
};

interface WshItemListProps {
  items: WshItem[];
  limit: number;
  selectedId?: number;
  onSelect: (id: number) => void;
}

/** Linhas da PCINTEGRACAOCORE encontradas, mais recentes primeiro. */
export const WshItemList: React.FC<WshItemListProps> = ({ items, limit, selectedId, onSelect }) => (
  <div className="bg-card border border-border rounded-xl overflow-hidden">
    <p className="px-3 py-2 text-2xs text-muted-foreground border-b border-border">
      {items.length} item(ns){items.length >= limit ? ` · mostrando os ${limit} mais recentes, refine a busca` : ''}
    </p>
    <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            aria-pressed={item.id === selectedId}
            className={`w-full text-left px-3 py-2.5 space-y-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
              item.id === selectedId ? 'bg-muted' : 'hover:bg-muted/60'
            }`}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-foreground truncate" title={item.externalId}>{item.externalId}</span>
              <span className={`px-2 py-0.5 rounded-full text-2xs font-medium shrink-0 ${WSH_TONE_BADGE[item.tone]}`}>{item.statusLabel}</span>
            </span>
            <span className="flex items-center justify-between gap-2 text-2xs text-muted-foreground">
              <span className="truncate">{routeLabel(item.route)}</span>
              <span className="font-mono shrink-0">{item.createdAt ? formatTraceTime(item.createdAt) : ''}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  </div>
);
