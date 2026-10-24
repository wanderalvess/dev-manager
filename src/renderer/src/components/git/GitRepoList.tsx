import React from 'react';
import { Search, GitBranch } from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';
import type { GitRepoFilter } from '../../utils/gitRepoFilters';
import { isBranchLocalOnly } from '../../utils/gitPublishViewUtils';
import { GitRepoFilterChips } from './GitRepoFilterChips';

interface GitRepoListProps {
  projects: GitProjectInfo[];
  selectedPath: string | undefined;
  uncommittedCounts: Record<string, number>;
  unpushedCounts: Record<string, number>;
  filter: GitRepoFilter;
  filterCounts: Record<GitRepoFilter, number>;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: GitRepoFilter) => void;
  onSelect: (path: string) => void;
}

export const GitRepoList: React.FC<GitRepoListProps> = ({
  projects,
  selectedPath,
  uncommittedCounts,
  unpushedCounts,
  filter,
  filterCounts,
  searchTerm,
  onSearchChange,
  onFilterChange,
  onSelect
}) => (
  <div className="lg:col-span-4 flex flex-col space-y-3 bg-card rounded-[14px] p-3 overflow-hidden border border-border shadow-xs">
    {/* Busca */}
    <div className="relative">
      <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
      <input
        type="text"
        placeholder="Filtrar repositórios"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full h-9 bg-card border border-input rounded-[10px] pl-9 pr-3 text-sm text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
      />
    </div>

    <GitRepoFilterChips filter={filter} counts={filterCounts} onChange={onFilterChange} />

    {/* Lista Rolável */}
    <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5" data-tour="repo-list">
      {projects.length === 0 && (
        <p className="text-[13px] text-muted-foreground text-center py-6">Nenhum repositório neste filtro.</p>
      )}
      {projects.map((p) => {
        const isSelected = selectedPath === p.path;
        const pendingCount = uncommittedCounts[p.path] ?? p.uncommittedCount ?? 0;
        const hasChanges = pendingCount > 0;
        const unpushed = unpushedCounts[p.path] ?? 0;
        const localOnly = isBranchLocalOnly(p);

        return (
          <button
            key={p.path}
            onClick={() => onSelect(p.path)}
            className={`w-full text-left px-3 py-2.5 rounded-[10px] transition-colors cursor-pointer ${
              isSelected ? 'bg-accent' : 'hover:bg-muted'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`text-sm truncate ${isSelected ? 'text-accent-foreground font-semibold' : 'text-foreground font-medium'}`}>
                {p.name}
              </span>
              {p.isAzure && <span className="text-xs text-muted-foreground shrink-0">Azure</span>}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-[13px] text-muted-foreground">
              <GitBranch className="w-3 h-3 shrink-0" />
              <span className="truncate font-mono" title={p.currentBranch}>
                {p.currentBranch}
              </span>
              {localOnly && (
                <span
                  className="bg-warning/10 text-warning px-2 rounded-full font-medium"
                  title="A branch atual ainda não existe no origin"
                >
                  só local
                </span>
              )}
              {unpushed > 0 && (
                <span
                  className="bg-info/10 text-info px-2 rounded-full font-medium"
                  title={`${unpushed} commit(s) local(is) que o origin ainda não tem`}
                >
                  ↑ {unpushed} sem push
                </span>
              )}
              {hasChanges && (
                <span
                  className="bg-warning/10 text-warning px-2 rounded-full font-medium"
                  title={`${pendingCount} arquivo(s) modificado(s)`}
                >
                  {pendingCount} {pendingCount === 1 ? 'alteração' : 'alterações'}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
