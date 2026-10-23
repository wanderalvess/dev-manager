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
  Upload,
  Split,
  Eye
} from 'lucide-react';
import type { GitProjectInfo } from '../../../../shared/types';

interface GitBranchActionsBarProps {
  project: GitProjectInfo;
  isExecutingGit: boolean;
  isPublishing: boolean;
  /** A branch atual ainda não existe no origin. */
  isLocalOnly: boolean;
  hasPendingChanges: boolean;
  onPublish: () => void;
  onOpenBranchModal: () => void;
  onOpenTaskBranchModal: () => void;
  onOpenDiff: () => void;
  onOpenHistory: () => void;
  onOpenCommit: () => void;
  onExecGit: (command: 'fetch' | 'pull' | 'stash' | 'stash-pop') => void;
}

const ACTION_BUTTON =
  'px-2.5 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

export const GitBranchActionsBar: React.FC<GitBranchActionsBarProps> = ({
  project,
  isExecutingGit,
  isPublishing,
  isLocalOnly,
  hasPendingChanges,
  onPublish,
  onOpenBranchModal,
  onOpenTaskBranchModal,
  onOpenDiff,
  onOpenHistory,
  onOpenCommit,
  onExecGit
}) => (
  <div className="bg-card border border-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 rounded-lg bg-success/10 border border-success/30 flex items-center justify-center text-success">
        <GitBranch className="w-4 h-4" />
      </div>
      <div>
        <span className="text-2xs uppercase font-bold text-muted-foreground block tracking-wider">
          Branch Atual
        </span>
        <div className="flex items-center gap-1.5 mt-0.5" data-tour="branch-atual">
          <span className="text-xs font-mono font-bold text-success">
            {project.currentBranch}
          </span>
          {isLocalOnly && (
            <span
              className="text-2xs bg-warning/15 text-warning border border-warning/30 px-1.5 py-0.5 rounded font-bold"
              title="Esta branch existe só neste computador. Use Publicar para enviá-la ao origin (necessário para abrir o Pull Request)."
            >
              SÓ LOCAL
            </span>
          )}
          {project.detachedHead && (
            <span
              className="text-2xs bg-warning/15 text-warning border border-warning/30 px-1.5 py-0.5 rounded font-bold"
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
          className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-warning/10 hover:bg-warning/20 border border-warning/30 text-warning text-2xs font-mono transition cursor-pointer"
          title="Inspecionar arquivos alterados e visualizador de diff"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>{project.uncommittedCount} alteração(ões)</span>
          <Eye className="w-3 h-3 ml-1 opacity-70" />
        </button>
      )}
    </div>

    {/* Ações Rápidas de Git */}
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onOpenDiff}
        className={ACTION_BUTTON}
        title="Visualizar diff e arquivos alterados"
      >
        <Split className="w-3.5 h-3.5 text-warning" />
        <span>Diff</span>
      </button>
      <button
        type="button"
        onClick={onOpenHistory}
        className={ACTION_BUTTON}
        title="Ver últimos commits deste repositório"
      >
        <Clock className="w-3.5 h-3.5 text-blue-400" />
        <span>Histórico</span>
      </button>
      <button
        type="button"
        data-tour="commit-push"
        onClick={onOpenCommit}
        disabled={!hasPendingChanges}
        className="px-2.5 py-1.5 bg-success/15 hover:bg-success/25 border border-success/40 text-success rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          hasPendingChanges
            ? 'Fazer commit rápido e push para o repositório remoto'
            : 'Sem alterações pendentes para commitar. Para enviar commits já feitos, use Push / Publicar.'
        }
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>Commit & Push</span>
      </button>
      <button
        type="button"
        onClick={onPublish}
        disabled={isExecutingGit}
        className={
          isLocalOnly
            ? 'px-2.5 py-1.5 bg-warning/15 hover:bg-warning/25 border border-warning/40 text-warning rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            : ACTION_BUTTON
        }
        title={
          isLocalOnly
            ? 'Publicar a branch no origin (git push --set-upstream origin). Necessário antes de abrir o Pull Request.'
            : 'Enviar os commits locais para o origin (git push --set-upstream origin)'
        }
      >
        <Upload className={`w-3.5 h-3.5 ${isPublishing ? 'animate-pulse' : ''}`} />
        <span>{isPublishing ? 'Enviando...' : isLocalOnly ? 'Publicar' : 'Push'}</span>
      </button>
      <button
        type="button"
        data-tour="acoes-sync"
        onClick={() => onExecGit('fetch')}
        disabled={isExecutingGit}
        className={ACTION_BUTTON}
        title="Sincronizar referências remotas (git fetch)"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isExecutingGit ? 'animate-spin' : ''}`} />
        <span>Fetch</span>
      </button>
      <button
        type="button"
        onClick={() => onExecGit('pull')}
        disabled={isExecutingGit}
        className={ACTION_BUTTON}
        title="Baixar e mesclar alterações da branch remota (git pull)"
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        <span>Pull</span>
      </button>
      <button
        type="button"
        onClick={() => onExecGit('stash')}
        disabled={isExecutingGit}
        className={ACTION_BUTTON}
        title="Guardar alterações locais temporariamente (git stash)"
        aria-label="Guardar alterações locais (git stash)"
      >
        <Archive className="w-3.5 h-3.5 text-warning" />
        <span>Stash</span>
      </button>
      <button
        type="button"
        onClick={() => onExecGit('stash-pop')}
        disabled={isExecutingGit}
        className={ACTION_BUTTON}
        title="Restaurar alterações locais guardadas (git stash pop)"
        aria-label="Restaurar alterações guardadas (git stash pop)"
      >
        <ArchiveRestore className="w-3.5 h-3.5 text-success" />
        <span>Pop</span>
      </button>
    </div>
  </div>
);
