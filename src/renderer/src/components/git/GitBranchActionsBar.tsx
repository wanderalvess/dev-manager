import React from 'react';
import {
  GitBranch,
  Download,
  RefreshCw,
  Archive,
  ArchiveRestore,
  FileEdit,
  Clock,
  UploadCloud,
  Split,
  Eye
} from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';

interface GitBranchActionsBarProps {
  project: GitProjectInfo;
  isExecutingGit: boolean;
  onOpenBranchModal: () => void;
  onOpenTaskBranchModal: () => void;
  onOpenDiff: () => void;
  onOpenHistory: () => void;
  onOpenCommit: () => void;
  onExecGit: (command: 'fetch' | 'pull' | 'stash' | 'stash-pop') => void;
}

export const GitBranchActionsBar: React.FC<GitBranchActionsBarProps> = ({
  project,
  isExecutingGit,
  onOpenBranchModal,
  onOpenTaskBranchModal,
  onOpenDiff,
  onOpenHistory,
  onOpenCommit,
  onExecGit
}) => (
  <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
        <GitBranch className="w-4 h-4" />
      </div>
      <div>
        <span className="text-2xs uppercase font-bold text-muted-foreground block tracking-wider">
          Branch Atual
        </span>
        <div className="flex items-center gap-1.5 mt-0.5" data-tour="branch-atual">
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-300">
            {project.currentBranch}
          </span>
          {project.detachedHead && (
            <span
              className="text-2xs bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-bold"
              title="O repositório está em um commit específico, fora de qualquer branch"
            >
              HEAD DESTACADO
            </span>
          )}
          <button
            type="button"
            data-tour="trocar-branch"
            onClick={onOpenBranchModal}
            className="px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted border border-border text-2xs font-semibold text-muted-foreground hover:text-foreground transition cursor-pointer"
            title="Alternar branch ou criar uma nova"
          >
            Trocar / Nova
          </button>
          <button
            type="button"
            onClick={onOpenTaskBranchModal}
            className="px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/25 text-2xs font-semibold text-primary transition-colors cursor-pointer flex items-center gap-1.5"
            title="Criar branch vinculada a tarefa do Azure DevOps ou Jira"
          >
            <GitBranch className="w-3 h-3 text-primary" />
            <span>Branch por Tarefa</span>
          </button>
        </div>
      </div>

      {(project.uncommittedCount || 0) > 0 && (
        <button
          type="button"
          onClick={onOpenDiff}
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[11px] font-mono transition cursor-pointer"
          title="Inspecionar arquivos alterados e visualizador de diff"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>{project.uncommittedCount} alteração(ões)</span>
          <Eye className="w-3 h-3 ml-1 opacity-70" />
        </button>
      )}
    </div>

    {/* Ações Rápidas de Git */}
    <div className="flex items-center space-x-1.5">
      <button
        type="button"
        onClick={onOpenDiff}
        className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
        title="Visualizar diff e arquivos alterados"
      >
        <Split className="w-3.5 h-3.5 text-amber-400" />
        <span>Diff</span>
      </button>
      <button
        type="button"
        onClick={onOpenHistory}
        className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
        title="Ver últimos commits deste repositório"
      >
        <Clock className="w-3.5 h-3.5 text-blue-400" />
        <span>Histórico</span>
      </button>
      <button
        type="button"
        data-tour="commit-push"
        onClick={onOpenCommit}
        className="px-2.5 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 text-emerald-500 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
        title="Fazer commit rápido e push para o repositório remoto"
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>Commit & Push</span>
      </button>
      <button
        data-tour="acoes-sync"
        onClick={() => onExecGit('fetch')}
        disabled={isExecutingGit}
        className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
        title="Sincronizar referências remotas (git fetch)"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isExecutingGit ? 'animate-spin' : ''}`} />
        <span>Fetch</span>
      </button>
      <button
        onClick={() => onExecGit('pull')}
        disabled={isExecutingGit}
        className="px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
        title="Baixar e mesclar alterações da branch remota (git pull)"
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        <span>Pull</span>
      </button>
      <button
        onClick={() => onExecGit('stash')}
        disabled={isExecutingGit}
        className="p-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors shadow-sm"
        title="Guardar alterações locais temporariamente (git stash)"
        aria-label="Guardar alterações locais (git stash)"
      >
        <Archive className="w-3.5 h-3.5 text-amber-500" />
      </button>
      <button
        onClick={() => onExecGit('stash-pop')}
        disabled={isExecutingGit}
        className="p-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg transition-colors shadow-sm"
        title="Restaurar alterações locais guardadas (git stash pop)"
        aria-label="Restaurar alterações guardadas (git stash pop)"
      >
        <ArchiveRestore className="w-3.5 h-3.5 text-emerald-500" />
      </button>
    </div>
  </div>
);
