import React from 'react';
import { History, Trash2 } from 'lucide-react';
import type { IntegrationTraceListItem } from '../../../../shared/integrationTypes';
import { formatTraceTime, listItemTone, summarizeListItem } from '../../utils/integrationTraceView';
import { TONE_TEXT } from './toneClasses';

interface TraceHistoryListProps {
  items: IntegrationTraceListItem[];
  activeId?: string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Últimos rastreios guardados nesta máquina; clicar reabre o resultado. */
export const TraceHistoryList: React.FC<TraceHistoryListProps> = ({ items, activeId, onOpen, onRemove }) => (
  <div className="bg-card border border-border rounded-xl p-4 space-y-2">
    <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
      <History className="w-4 h-4 text-muted-foreground" /> Histórico
    </h3>
    {items.length === 0 ? (
      <p className="text-xs text-muted-foreground">Os rastreios que você fizer aparecem aqui.</p>
    ) : (
      <ul className="space-y-1 max-h-72 overflow-y-auto">
        {items.map((item) => (
          <li key={item.id} className={`flex items-center gap-1 rounded-lg ${item.id === activeId ? 'bg-muted' : 'hover:bg-muted/60'}`}>
            <button type="button" onClick={() => onOpen(item.id)} className="flex-1 min-w-0 text-left px-2.5 py-2">
              <span className="flex items-center justify-between gap-2 text-xs font-medium text-foreground">
                <span className="font-mono truncate">Lote {item.batchNumber ?? '?'}</span>
                <span className="text-2xs font-mono text-muted-foreground shrink-0">{formatTraceTime(item.startedAt)}</span>
              </span>
              <span className={`block text-2xs truncate ${TONE_TEXT[listItemTone(item)]}`}>
                {item.flowName ?? item.flowId} · {summarizeListItem(item)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              aria-label={`Apagar o rastreio do lote ${item.batchNumber ?? ''}`}
              title="Apagar do histórico"
              className="p-2 mr-1 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    )}
  </div>
);
