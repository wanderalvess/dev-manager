import React from 'react';
import { Search, X } from 'lucide-react';
import type { SettingsSearchEntry } from './settingsSearchData';

interface SettingsSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  results: SettingsSearchEntry[];
  onSelectResult: (entry: SettingsSearchEntry) => void;
}

export const SettingsSearchBar: React.FC<SettingsSearchBarProps> = ({
  query,
  onQueryChange,
  isOpen,
  onOpenChange,
  results,
  onSelectResult
}) => {
  return (
    <div className="relative shrink-0">
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          aria-label="Buscar em Configurações"
          type="text"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            onOpenChange(true);
          }}
          onFocus={() => onOpenChange(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              onQueryChange('');
              onOpenChange(false);
            } else if (e.key === 'Enter' && results.length > 0) {
              onSelectResult(results[0]);
            }
          }}
          placeholder="Buscar em Configurações (ex: senha, porta, cookie, backup, api key)..."
          className="w-full bg-card border border-border rounded-xl pl-9 pr-9 py-2.5 text-xs text-foreground focus:outline-hidden focus:border-primary shadow-xs"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('');
              onOpenChange(false);
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            title="Limpar busca" aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && query.trim() && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
          <div className="absolute left-0 right-0 mt-1.5 rounded-xl bg-card border border-border shadow-2xl z-50 overflow-hidden">
            {results.length === 0 ? (
              <div className="px-3.5 py-3 text-xs text-muted-foreground">Nenhum campo encontrado para "{query}".</div>
            ) : (
              results.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelectResult(entry)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left hover:bg-muted transition-colors border-b border-border/60 last:border-b-0"
                >
                  <span className="text-xs font-semibold text-foreground">{entry.label}</span>
                  <span className="text-2xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-mono shrink-0">
                    {entry.tabLabel}
                  </span>
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};
