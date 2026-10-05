import React from 'react';
import { Search } from 'lucide-react';

interface QuickSearchButtonProps {
  onOpenQuickLauncher?: () => void;
}

export const QuickSearchButton: React.FC<QuickSearchButtonProps> = ({ onOpenQuickLauncher }) => {
  if (!onOpenQuickLauncher) return null;

  return (
    <button
      type="button"
      data-tour="search"
      onClick={onOpenQuickLauncher}
      className="h-9 flex-1 min-w-0 max-w-xs sm:max-w-sm md:max-w-md xl:max-w-md px-2.5 sm:px-3 rounded-lg bg-muted/40 hover:bg-muted/80 border border-border/70 hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all text-xs flex items-center justify-between group shadow-xs cursor-pointer select-none"
      title="Abrir busca rápida de rotinas, comandos e ações (Ctrl+K)"
    >
      <div className="flex items-center space-x-2 min-w-0 pr-1.5">
        <Search className="w-4 h-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
        <span className="truncate text-xs font-normal hidden sm:inline">
          Buscar rotinas, tabelas, esteiras...
        </span>
        <span className="truncate text-xs font-normal sm:hidden">
          Buscar...
        </span>
      </div>
      <kbd className="px-1.5 py-0.5 rounded bg-card text-2xs font-mono font-bold text-foreground border border-border/70 shadow-xs shrink-0">
        Ctrl+K
      </kbd>
    </button>
  );
};
