import React from 'react';
import { GIT_REPO_FILTERS, type GitRepoFilter } from '../../utils/gitRepoFilters';

interface GitRepoFilterChipsProps {
  filter: GitRepoFilter;
  counts: Record<GitRepoFilter, number>;
  onChange: (filter: GitRepoFilter) => void;
}

/** Abas de filtro numa linha só: com a coluna estreita, rola na horizontal em vez de quebrar em duas linhas. */
export const GitRepoFilterChips: React.FC<GitRepoFilterChipsProps> = ({ filter, counts, onChange }) => (
  <div
    className="flex gap-0.5 p-0.5 rounded-lg bg-muted overflow-x-auto [scrollbar-width:none]"
    role="group"
    aria-label="Filtrar repositórios"
  >
    {GIT_REPO_FILTERS.map(({ id, label, hint }) => {
      const active = filter === id;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={active}
          title={hint}
          onClick={() => onChange(id)}
          className={`flex-1 h-7 px-2 rounded-md text-xs font-medium whitespace-nowrap flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            active ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>{label}</span>
          <span className={`tabular-nums ${active ? 'text-muted-foreground' : 'opacity-70'}`}>{counts[id]}</span>
        </button>
      );
    })}
  </div>
);
