import React from 'react';
import { Search, GitBranch } from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';

interface GitRepoListProps {
  projects: GitProjectInfo[];
  selectedPath: string | undefined;
  uncommittedCounts: Record<string, number>;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSelect: (path: string) => void;
}

export const GitRepoList: React.FC<GitRepoListProps> = ({
  projects,
  selectedPath,
  uncommittedCounts,
  searchTerm,
  onSearchChange,
  onSelect
}) => (
  <div className="lg:col-span-4 flex flex-col space-y-3 cockpit-panel rounded-2xl p-3.5 overflow-hidden border border-border">
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

    {/* Lista Rolável */}
    <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5" data-tour="repo-list">
      {projects.map((p) => {
        const isSelected = selectedPath === p.path;
        const pendingCount = uncommittedCounts[p.path] ?? p.uncommittedCount ?? 0;
        const hasChanges = pendingCount > 0;

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
                {hasChanges && (
                  <span
                    className="text-2xs bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono font-bold"
                    title={`${pendingCount} arquivo(s) modificado(s)`}
                  >
                    ● {pendingCount}
                  </span>
                )}
                {p.isAzure && (
                  <span className="text-2xs bg-primary/10 text-primary border border-primary/30 px-1.5 py-0.2 rounded font-mono font-bold">
                    AZURE
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1.5 mt-1.5 text-[11px] text-muted-foreground truncate">
              <GitBranch className="w-3 h-3 text-emerald-500 shrink-0" />
              <span className="truncate font-mono text-emerald-600 dark:text-emerald-300 font-medium">
                {p.currentBranch}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);
