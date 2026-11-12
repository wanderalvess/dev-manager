import React, { useEffect, useState } from 'react';
import { GitPullRequest, GitBranch, GitCommit, RefreshCw } from 'lucide-react';
import type { GitCommitInfo, GitFileStatus, GitProjectInfo } from '../../../shared/types';

export const GitAzurePage: React.FC<{
  projects: GitProjectInfo[];
  onRefreshProjects: () => Promise<void>;
  isRefreshing: boolean;
  onNavigateToSettings: () => void;
  settingsVersion: number;
}> = ({ projects, onRefreshProjects, isRefreshing }) => {
  const [selected, setSelected] = useState<GitProjectInfo | null>(null);
  const [commits, setCommits] = useState<GitCommitInfo[]>([]);
  const [files, setFiles] = useState<GitFileStatus[]>([]);

  useEffect(() => {
    if (!selected && projects[0]) setSelected(projects[0]);
  }, [projects, selected]);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/git/details?path=${encodeURIComponent(selected.path)}`)
      .then((r) => r.json())
      .then((data) => {
        setCommits(data.commits || []);
        setFiles(data.files || []);
      })
      .catch(() => {});
  }, [selected]);

  return (
    <div className="h-full flex overflow-hidden">
      <aside className="w-72 border-r border-border bg-card p-3 space-y-2 overflow-y-auto shrink-0">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs font-bold text-foreground">Repositórios ({projects.length})</span>
          <button type="button" onClick={() => void onRefreshProjects()} className="p-1 rounded hover:bg-muted cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
        {projects.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => setSelected(p)}
            className={`w-full p-2.5 rounded-xl border text-left transition cursor-pointer ${
              selected?.name === p.name ? 'bg-accent border-primary/40' : 'bg-muted/20 border-border hover:bg-muted'
            }`}
          >
            <div className="text-xs font-bold text-foreground truncate">{p.name}</div>
            <div className="flex items-center justify-between text-2xs text-muted-foreground mt-1">
              <span className="font-mono flex items-center gap-1 truncate"><GitBranch className="w-3 h-3" /> {p.branch}</span>
              {p.uncommittedCount ? <span className="text-warning font-bold">{p.uncommittedCount} alt.</span> : null}
            </div>
          </button>
        ))}
      </aside>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {selected ? (
          <>
            <div>
              <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <GitPullRequest className="w-5 h-5 text-primary" /> {selected.name}
              </h1>
              <p className="text-2xs font-mono text-muted-foreground">{selected.path} • branch {selected.branch}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="bg-card border border-border rounded-xl p-4 space-y-2.5">
                <h2 className="text-sm font-bold text-foreground">Alterações Pendentes ({files.length})</h2>
                {files.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Working tree limpo.</p>
                ) : (
                  files.map((f, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/20 border border-border/60">
                      <span className="font-mono truncate">{f.path}</span>
                      <span className="px-1.5 py-0.5 rounded bg-warning/15 text-warning font-mono text-2xs font-bold">{f.status}</span>
                    </div>
                  ))
                )}
              </section>

              <section className="bg-card border border-border rounded-xl p-4 space-y-2.5">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <GitCommit className="w-4 h-4 text-primary" /> Histórico Recente
                </h2>
                {commits.map((c) => (
                  <div key={c.hash} className="p-2.5 rounded-lg bg-muted/20 border border-border/60 text-xs">
                    <div className="font-semibold text-foreground">{c.message}</div>
                    <div className="text-2xs font-mono text-muted-foreground mt-0.5">{c.shortHash} • {c.author} • {c.date}</div>
                  </div>
                ))}
              </section>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
