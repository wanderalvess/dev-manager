import React from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';
import type { KarafFeatureRepoInfo } from '../../../../../shared/types';

interface KarafFeaturesManagerRepoListProps {
  repos: KarafFeatureRepoInfo[];
  actionInProgress: string | null;
  onRefresh: (repoNameOrUrl: string) => void;
  onRemove: (repo: KarafFeatureRepoInfo) => void;
}

export const KarafFeaturesManagerRepoList: React.FC<KarafFeaturesManagerRepoListProps> = ({
  repos,
  actionInProgress,
  onRefresh,
  onRemove
}) => {
  if (repos.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-xs font-mono">
        Nenhum repositório de features encontrado.
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/60 border border-border rounded-lg overflow-hidden bg-background">
      {repos.map((repo) => {
        const isBusy =
          actionInProgress === `refresh_${repo.name}` || actionInProgress === `remove_${repo.name}`;

        return (
          <div
            key={repo.name || repo.url}
            className="px-3.5 py-2.5 flex items-center justify-between hover:bg-muted/20 transition-colors gap-3"
          >
            <div className="flex items-center space-x-2.5 min-w-0 flex-1">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${repo.isWinThor ? 'bg-primary' : 'bg-muted-foreground'}`}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-foreground font-mono truncate">{repo.name}</span>
                  {repo.isWinThor && (
                    <span className="text-2xs font-mono font-bold px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                      WinThor
                    </span>
                  )}
                </div>

                <p
                  className="text-2xs text-muted-foreground font-mono mt-0.5 break-all select-all hover:text-foreground transition-colors"
                  title={repo.url}
                >
                  {repo.url}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                onClick={() => onRefresh(repo.name || repo.url)}
                disabled={isBusy}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted border border-border/40 transition-colors cursor-pointer disabled:opacity-50"
                title="Recarregar repositório (feature:repo-refresh)" aria-label="Recarregar repositório (feature:repo-refresh)"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${actionInProgress === `refresh_${repo.name}` ? 'animate-spin' : ''}`}
                />
              </button>

              <button
                onClick={() => onRemove(repo)}
                disabled={isBusy}
                className="p-1.5 text-rose-400 hover:text-rose-300 rounded-md hover:bg-rose-500/10 border border-border/40 hover:border-rose-500/30 transition-colors cursor-pointer disabled:opacity-50"
                title="Remover repositório do Karaf" aria-label="Remover repositório do Karaf"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
