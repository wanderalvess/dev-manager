import React from 'react';
import { Search } from 'lucide-react';

interface KarafBundleTableToolbarProps {
  search: string;
  onSearchChange: (search: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  selectedCount: number;
  filteredCount: number;
  totalCount: number;
  onClearSelection: () => void;
}

export const KarafBundleTableToolbar: React.FC<KarafBundleTableToolbarProps> = ({
  search,
  onSearchChange,
  searchRef,
  selectedCount,
  filteredCount,
  totalCount,
  onClearSelection
}) => (
  <div className="px-4 sm:px-6 py-2 border-b border-border/70 bg-card flex items-center justify-between gap-3 shrink-0">
    <div className="relative flex-1 max-w-2xl">
      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
      <input
        ref={searchRef}
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Pesquisar por ID, nome do bundle, versão ou symbolic name... (Atalho: /)"
        className="w-full bg-background border border-border rounded-md pl-9 pr-12 py-1.5 text-xs text-foreground focus:outline-hidden focus:border-primary font-mono transition"
      />
      <div className="absolute right-2.5 top-1.5 text-2xs font-mono text-muted-foreground bg-muted/60 px-1 py-0.2 rounded border border-border/60 pointer-events-none">
        /
      </div>
    </div>

    <div className="flex items-center gap-2">
      {selectedCount > 0 && (
        <button
          type="button"
          onClick={onClearSelection}
          className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted hover:bg-muted/80 text-foreground border border-border transition cursor-pointer"
          title="Desmarcar todos os bundles"
        >
          Limpar seleção ({selectedCount})
        </button>
      )}
      <span className="text-xs text-muted-foreground font-mono tabular-nums font-medium">
        {filteredCount} de {totalCount} bundles
      </span>
    </div>
  </div>
);
