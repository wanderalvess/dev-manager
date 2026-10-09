import React from 'react';
import { Search, RefreshCw, X, Sparkles } from 'lucide-react';
import type { DocsIndexStatus, LlmProviderConfig } from '../../../../shared/types';

interface DocsSearchBarProps {
  status: DocsIndexStatus | null;
  query: string;
  sourceFilter: string;
  hasIndex: boolean;
  hasSearched: boolean;
  isSearching: boolean;
  isAskingLlm: boolean;
  activeLlmProvider: LlmProviderConfig | undefined;
  onQueryChange: (value: string) => void;
  onSourceFilterChange: (value: string) => void;
  onSearch: (e?: React.FormEvent) => Promise<void>;
  onAskLlm: () => Promise<void>;
}

export const DocsSearchBar: React.FC<DocsSearchBarProps> = ({
  status,
  query,
  sourceFilter,
  hasIndex,
  hasSearched,
  isSearching,
  isAskingLlm,
  activeLlmProvider,
  onQueryChange,
  onSourceFilterChange,
  onSearch,
  onAskLlm
}) => (
  <div className="cockpit-panel rounded-xl p-4 shadow-xl border border-border shrink-0">
    <form onSubmit={onSearch} className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[280px]" data-tour="search-input">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-2.5" />
        <input
          type="text"
          placeholder="Pergunte algo sobre a documentação dos projetos..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-10 pr-9 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-hidden focus:border-primary"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            title="Limpar busca" aria-label="Limpar busca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {status && status.sourceLabels.length > 0 && (
        <select
          data-tour="source-filter-select"
          value={sourceFilter}
          onChange={(e) => onSourceFilterChange(e.target.value)}
          className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:border-primary font-mono"
        >
          <option value="TODOS">Todas as fontes</option>
          {status.sourceLabels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      )}

      <button
        type="submit"
        data-tour="search-submit-button"
        disabled={isSearching || !query.trim() || !hasIndex}
        className="px-4 py-2 bg-card hover:bg-muted border border-border rounded-xl text-xs font-semibold text-foreground transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isSearching ? 'Buscando...' : 'Buscar'}
      </button>

      <button
        type="button"
        disabled={isSearching || isAskingLlm || !query.trim() || !hasIndex}
        onClick={async () => {
          if (!hasSearched) await onSearch();
          onAskLlm();
        }}
        className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-primary/25 disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
        title={activeLlmProvider ? `Consultar Copilot Técnico (${activeLlmProvider.name} · ${activeLlmProvider.model})` : 'Consultar Copilot Técnico (BYOK)'} aria-label={activeLlmProvider ? `Consultar Copilot Técnico (${activeLlmProvider.name} · ${activeLlmProvider.model})` : 'Consultar Copilot Técnico (BYOK)'}
      >
        {isAskingLlm ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Sintetizando...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Perguntar à IA</span>
          </>
        )}
      </button>
    </form>
  </div>
);
