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
  <div className="lg:col-span-4 min-w-0 min-h-0 flex flex-col bg-card rounded-xl overflow-hidden border border-border">
    <div className="p-2.5 space-y-2 border-b border-border">
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Filtrar repositórios"
          aria-label="Filtrar repositórios pelo nome"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-8 bg-card border border-input rounded-lg pl-8 pr-3 text-[13px] text-foreground placeholder-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
        />
      </div>
      <GitRepoFilterChips filter={filter} counts={filterCounts} onChange={onFilterChange} />
    </div>

    <ul className="flex-1 min-h-0 overflow-y-auto p-1.5" data-tour="repo-list">
      {projects.length === 0 && (
        <li className="text-[13px] text-muted-foreground text-center py-6">Nenhum repositório neste filtro.</li>
      )}
      {projects.map((p) => {
        const isSelected = selectedPath === p.path;
        const pendingCount = uncommittedCounts[p.path] ?? p.uncommittedCount ?? 0;
        const unpushed = unpushedCounts[p.path] ?? 0;
        const localOnly = isBranchLocalOnly(p);

        return (
          <li key={p.path}>
            <button
              type="button"
              onClick={() => onSelect(p.path)}
              aria-current={isSelected ? 'true' : undefined}
              className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors cursor-pointer ${
                isSelected ? 'bg-accent' : 'hover:bg-muted'
              }`}
            >
              <span
                className={`block text-[13px] truncate ${isSelected ? 'text-accent-foreground font-semibold' : 'text-foreground font-medium'}`}
                title={p.name}
              >
                {p.name}
              </span>
              <span className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground min-w-0">
                <GitBranch className="w-3 h-3 shrink-0" />
                <span className="truncate font-mono" title={p.currentBranch}>
                  {p.currentBranch}
                </span>
                <span className="ml-auto flex items-center gap-2 shrink-0 font-medium tabular-nums">
                  {localOnly && (
                    <span className="text-warning" title="A branch atual ainda não existe no origin">
                      só local
                    </span>
                  )}
                  {unpushed > 0 && (
                    <span
                      className="text-info"
                      title={`${unpushed} ${unpushed === 1 ? 'commit local que o origin ainda não tem' : 'commits locais que o origin ainda não tem'}`}
                    >
                      ↑{unpushed}
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span
                      className="flex items-center gap-1 text-warning"
                      title={`${pendingCount} ${pendingCount === 1 ? 'arquivo modificado' : 'arquivos modificados'}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-warning" aria-hidden="true" />
                      {pendingCount}
                      <span className="sr-only">{pendingCount === 1 ? 'alteração' : 'alterações'}</span>
                    </span>
                  )}
                  {p.isAzure && <span className="font-normal text-muted-foreground/70">Azure</span>}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </div>
);
