import React from 'react';
import { GIT_REPO_FILTERS, type GitRepoFilter } from '../../utils/gitRepoFilters';

interface GitRepoFilterChipsProps {
  filter: GitRepoFilter;
  counts: Record<GitRepoFilter, number>;
  onChange: (filter: GitRepoFilter) => void;
}

export const GitRepoFilterChips: React.FC<GitRepoFilterChipsProps> = ({ filter, counts, onChange }) => (
  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar repositórios">
    {GIT_REPO_FILTERS.map(({ id, label, hint }) => {
      const active = filter === id;
      return (
        <button
          key={id}
          type="button"
          aria-pressed={active}
          title={hint}
          onClick={() => onChange(id)}
          className={`px-2.5 py-1 rounded-full border text-2xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
            active
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <span>{label}</span>
          <span className="font-mono opacity-80">{counts[id]}</span>
        </button>
      );
    })}
  </div>
);
