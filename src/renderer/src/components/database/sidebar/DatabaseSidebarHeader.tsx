import React from 'react';
import { Database, Plus, Sparkles, PanelLeftClose } from 'lucide-react';

interface DatabaseSidebarHeaderProps {
  onOpenCreateModal: () => void;
  onOpenTour: () => void;
  onToggleCollapse?: () => void;
}

export const DatabaseSidebarHeader: React.FC<DatabaseSidebarHeaderProps> = ({
  onOpenCreateModal,
  onOpenTour,
  onToggleCollapse
}) => (
  <div className="p-3 border-b border-border/70 flex items-center justify-between">
    <div className="flex items-center space-x-2">
      <Database className="w-4 h-4 text-primary" />
      <span className="text-xs font-bold text-foreground tracking-wide uppercase">Conexões</span>
    </div>
    <div className="flex items-center gap-1.5">
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
          title="Recolher barra lateral (mais espaço para queries)"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={onOpenTour}
        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-muted transition cursor-pointer"
        title="Rever o tour guiado desta página"
      >
        <Sparkles className="w-3.5 h-3.5" />
      </button>
      <button
        data-tour="new-connection-button"
        onClick={onOpenCreateModal}
        className="flex items-center space-x-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-semibold hover:bg-primary/90 transition shadow-sm cursor-pointer"
      >
        <Plus className="w-3 h-3" />
        <span>Nova</span>
      </button>
    </div>
  </div>
);
