import React from 'react';
import { Search, X } from 'lucide-react';
import { HELP_SEARCH_KIND_LABEL, type HelpSearchEntry } from '../../../utils/helpSearch';

interface HelpSearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  results: HelpSearchEntry[];
  onSelectResult: (entry: HelpSearchEntry) => void;
}

/** Busca no menu da Ajuda: mesmo desenho da busca das Configurações, com a lista de resultados logo abaixo. */
export const HelpSearchBar: React.FC<HelpSearchBarProps> = ({
  query,
  onQueryChange,
  isOpen,
  onOpenChange,
  results,
  onSelectResult
}) => (
  <div className="relative shrink-0">
    <div className="relative">
      <Search className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        aria-label="Buscar na Central de Ajuda"
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
        placeholder="Buscar: porta, deploy, erro…"
        className="w-full h-9 bg-muted/40 border border-border/70 rounded-lg pl-9 pr-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            onQueryChange('');
            onOpenChange(false);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          title="Limpar busca"
          aria-label="Limpar busca"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>

    {isOpen && query.trim() && (
      <>
        <div className="fixed inset-0 z-40" onClick={() => onOpenChange(false)} />
        <div className="absolute left-0 w-full mt-1.5 rounded-xl bg-card border border-border shadow-lg z-50 overflow-hidden">
          {results.length === 0 ? (
            <div className="px-3.5 py-3 text-xs text-muted-foreground">Nada encontrado para "{query}".</div>
          ) : (
            results.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => onSelectResult(entry)}
                className="w-full px-3 py-2 flex flex-col gap-1 text-left hover:bg-muted transition-colors border-b border-border/60 last:border-b-0 cursor-pointer"
              >
                <span className="block text-xs font-semibold text-foreground line-clamp-2">{entry.label}</span>
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-2xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-mono shrink-0">
                    {HELP_SEARCH_KIND_LABEL[entry.kind]}
                  </span>
                  <span className="text-2xs text-muted-foreground truncate">{entry.hint}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </>
    )}
  </div>
);
