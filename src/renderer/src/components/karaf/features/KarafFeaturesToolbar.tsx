import React from 'react';
import { Search, X, RotateCw, PlusCircle, Shield, Layers } from 'lucide-react';

export type FeatureScopeFilter = 'ALL' | 'WINTHOR' | 'SYSTEM';

interface KarafFeaturesToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  scopeFilter: FeatureScopeFilter;
  onScopeFilterChange: (scope: FeatureScopeFilter) => void;
  isInstallDrawerOpen: boolean;
  onToggleInstallDrawer: () => void;
  onRefresh: () => void;
  isLoading: boolean;
  totalCount: number;
  winthorCount: number;
  systemCount: number;
  filteredCount: number;
}

export const KarafFeaturesToolbar: React.FC<KarafFeaturesToolbarProps> = ({
  searchQuery,
  onSearchChange,
  scopeFilter,
  onScopeFilterChange,
  isInstallDrawerOpen,
  onToggleInstallDrawer,
  onRefresh,
  isLoading,
  totalCount,
  winthorCount,
  systemCount,
  filteredCount
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="p-3.5 border-b border-border bg-card/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
      {/* Busca e Filtros de Escopo */}
      <div className="flex items-center gap-2.5 flex-1 min-w-[280px]">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filtrar por nome, versão, repositório..."
            className="w-full pl-10 pr-9 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono transition-colors"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
              title="Limpar busca" aria-label="Limpar busca"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-2xs font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border/80 pointer-events-none select-none">
              /
            </kbd>
          )}
        </div>

        {/* Segmented Control de Escopo */}
        <div className="inline-flex items-center bg-muted/60 p-0.5 rounded-lg border border-border text-xs font-mono">
          <button
            type="button"
            onClick={() => onScopeFilterChange('ALL')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
              scopeFilter === 'ALL'
                ? 'bg-background text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Todas</span>
            <span className="text-2xs opacity-70 tabular-nums">({totalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onScopeFilterChange('WINTHOR')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
              scopeFilter === 'WINTHOR'
                ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Shield className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>WinThor</span>
            <span className="text-2xs opacity-70 tabular-nums">({winthorCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onScopeFilterChange('SYSTEM')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center space-x-1.5 ${
              scopeFilter === 'SYSTEM'
                ? 'bg-background text-foreground shadow-2xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Sistema</span>
            <span className="text-2xs opacity-70 tabular-nums">({systemCount})</span>
          </button>
        </div>
      </div>

      {/* Ações: Instalar Feature & Recarregar */}
      <div className="flex items-center gap-2">
        {searchQuery && (
          <span className="text-2xs font-mono text-muted-foreground mr-1 tabular-nums">
            {filteredCount} {filteredCount === 1 ? 'resultado' : 'resultados'}
          </span>
        )}

        <button
          type="button"
          onClick={onToggleInstallDrawer}
          className={`px-3 py-1.5 rounded-lg font-mono font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
            isInstallDrawerOpen
              ? 'bg-indigo-600 text-white shadow-2xs'
              : 'bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
          }`}
          title="Abrir painel de instalação de feature"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>{isInstallDrawerOpen ? 'Fechar Instalador' : 'Instalar Feature'}</span>
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-lg font-mono text-xs bg-muted hover:bg-muted/80 border border-border text-foreground transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
          title="Recarregar features instaladas" aria-label="Recarregar features instaladas"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>
    </div>
  );
};
