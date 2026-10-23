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
  <div className="lg:col-span-4 flex flex-col space-y-3 cockpit-panel rounded-xl p-3 overflow-hidden border border-border">
    {/* Busca */}
    <div className="relative">
      <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
      <input
        type="text"
        placeholder="Buscar repositório ou branch..."
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground placeholder-muted-foreground focus:outline-hidden focus:border-primary font-mono"
      />
    </div>

    <GitRepoFilterChips filter={filter} counts={filterCounts} onChange={onFilterChange} />

    {/* Lista Rolável */}
    <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5" data-tour="repo-list">
      {projects.length === 0 && (
        <p className="text-2xs text-muted-foreground text-center py-6">Nenhum repositório neste filtro.</p>
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
            className={`w-full text-left p-3 rounded-xl border transition-all ${
              isSelected
                ? 'bg-primary/10 border-primary shadow-xs font-semibold'
                : 'bg-card/70 border-border/70 hover:border-border hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                {p.name}
              </span>
              <div className="flex items-center space-x-1.5">
                {p.isAzure && (
                  <span className="text-2xs bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.2 rounded font-mono font-bold">
                    AZURE
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-2xs text-muted-foreground">
              <GitBranch className="w-3 h-3 text-success shrink-0" />
              <span className="truncate font-mono text-success font-medium" title={p.currentBranch}>
                {p.currentBranch}
              </span>
              {localOnly && (
                <span
                  className="bg-warning/15 text-warning border border-warning/30 px-1.5 py-0.5 rounded font-bold"
                  title="A branch atual ainda não existe no origin"
                >
                  SÓ LOCAL
                </span>
              )}
              {unpushed > 0 && (
                <span
                  className="bg-info/15 text-info border border-info/30 px-1.5 py-0.5 rounded font-bold"
                  title={`${unpushed} commit(s) local(is) que o origin ainda não tem`}
                >
                  ↑ {unpushed} sem push
                </span>
              )}
              {hasChanges && (
                <span
                  className="bg-warning/15 text-warning border border-warning/30 px-1.5 py-0.5 rounded font-bold"
                  title={`${pendingCount} arquivo(s) modificado(s)`}
                >
                  ● {pendingCount} {pendingCount === 1 ? 'alteração' : 'alterações'}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
