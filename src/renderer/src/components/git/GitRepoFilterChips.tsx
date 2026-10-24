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
          className={`px-2.5 py-1 rounded-full text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
            active
              ? 'bg-accent text-accent-foreground'
              : 'bg-muted text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>{label}</span>
          <span className="opacity-80">{counts[id]}</span>
        </button>
      );
    })}
  </div>
);
