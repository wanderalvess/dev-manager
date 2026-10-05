import React from 'react';
import { Database, PanelLeftOpen } from 'lucide-react';
import { DatabaseConnectionConfig } from '../../../../../shared/types';

interface DatabaseSidebarCollapsedProps {
  activeConnection: DatabaseConnectionConfig | null;
  onToggleCollapse?: () => void;
}

export const DatabaseSidebarCollapsed: React.FC<DatabaseSidebarCollapsedProps> = ({
  activeConnection,
  onToggleCollapse
}) => (
  <aside
    className="w-12 bg-card/60 border-r border-border/70 flex flex-col items-center py-3 shrink-0 gap-3 transition-all"
    title="Barra lateral recolhida"
  >
    <button
      type="button"
      onClick={onToggleCollapse}
      className="p-1.5 rounded-lg bg-card hover:bg-muted border border-border text-foreground transition cursor-pointer"
      title="Expandir barra lateral (Conexões e Tabelas)"
    >
      <PanelLeftOpen className="w-4 h-4 text-primary" />
    </button>
    <div className="w-6 border-b border-border/60" />
    <div className="flex flex-col items-center gap-2" title={activeConnection?.name || 'Conexões'}>
      <Database className="w-4 h-4 text-muted-foreground" />
      {activeConnection && (
        <span className="text-2xs font-mono text-muted-foreground [writing-mode:vertical-rl] rotate-180 truncate max-h-36 tracking-wider">
          {activeConnection.name}
        </span>
      )}
    </div>
  </aside>
);
