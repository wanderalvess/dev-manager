import React from 'react';
import { Plus, X } from 'lucide-react';
import type { DatabaseConnectionConfig, DatabaseType } from '../../../../shared/types';
import type { QueryTab } from '../../utils/queryTabsUtils';
import type { WorkspaceStatus } from './DatabaseWorkspace';

const TYPE_DOT: Record<DatabaseType, string> = {
  oracle: 'bg-rose-500',
  mysql: 'bg-amber-500',
  postgres: 'bg-sky-500'
};

interface DatabaseTabsBarProps {
  tabs: QueryTab[];
  activeId: string | null;
  connections: DatabaseConnectionConfig[];
  status: Record<string, WorkspaceStatus | undefined>;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  canAdd: boolean;
}

/** Abas de consulta: cada uma com a sua conexão, o seu texto e o seu resultado. */
export const DatabaseTabsBar: React.FC<DatabaseTabsBarProps> = ({ tabs, activeId, connections, status, onSelect, onClose, onNew, canAdd }) => (
  <div className="flex items-end gap-1 px-2 pt-1.5 border-b border-border/70 bg-card/40 shrink-0 overflow-x-auto" data-tour="query-tabs">
    <div role="tablist" aria-label="Abas de consulta" className="flex items-end gap-1 min-w-0">
      {tabs.map((tab) => {
        const conn = connections.find((c) => c.id === tab.connectionId);
        const active = tab.id === activeId;
        const st = status[tab.id];
        const pending = (st?.gridPending ?? 0) + (st?.txPending ?? 0) > 0;
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={active}
            tabIndex={0}
            onClick={() => onSelect(tab.id)}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onClose(tab.id);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(tab.id);
              }
            }}
            title={`${conn?.name ?? 'Conexão removida'} · ${tab.title}${pending ? ' (alterações pendentes)' : ''}`}
            className={`group flex items-center gap-1.5 max-w-[220px] pl-2.5 pr-1.5 py-1.5 rounded-t-md border border-b-0 text-xs cursor-pointer select-none transition-colors ${
              active
                ? 'bg-background border-border text-foreground font-semibold'
                : 'bg-muted/40 border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/70'
            }`}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${conn ? TYPE_DOT[conn.type] : 'bg-muted-foreground'}`} aria-hidden="true" />
            <span className="truncate">{conn?.name ?? '?'}</span>
            <span className="text-2xs text-muted-foreground font-mono shrink-0">{tab.title.replace('Consulta ', '#')}</span>
            {pending && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Alterações pendentes" aria-label="Alterações pendentes" />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
              aria-label={`Fechar ${tab.title}`}
              className="p-0.5 rounded hover:bg-rose-500/15 hover:text-rose-500 text-muted-foreground opacity-60 group-hover:opacity-100 cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
    <button
      type="button"
      onClick={onNew}
      disabled={!canAdd}
      title={canAdd ? 'Nova aba de consulta na conexão selecionada' : 'Limite de abas atingido'}
      aria-label="Nova aba de consulta"
      className="mb-0.5 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 cursor-pointer shrink-0"
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  </div>
);
