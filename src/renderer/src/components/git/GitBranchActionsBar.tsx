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
  'h-8 px-3 bg-card hover:bg-muted border border-border text-foreground rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const QUIET_BUTTON =
  'h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const PILL = 'text-[13px] bg-warning/10 text-warning px-2.5 py-0.5 rounded-full font-medium';

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
  <div className="bg-muted/60 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
    <div className="flex flex-wrap items-center gap-3">
      <GitBranch className="w-4 h-4 text-primary shrink-0" />
      <div>
        <span className="text-xs text-muted-foreground block">Branch atual</span>
        <div className="flex flex-wrap items-center gap-2 mt-0.5" data-tour="branch-atual">
          <span className="text-[15px] font-mono font-medium text-foreground">
            {project.currentBranch}
          </span>
          {isLocalOnly && (
            <span
              className={PILL}
              title="Esta branch existe só neste computador. Use Publicar para enviá-la ao origin (necessário para abrir o Pull Request)."
            >
              só local
            </span>
          )}
          {project.detachedHead && (
            <span className={PILL} title="O repositório está em um commit específico, fora de qualquer branch">
              HEAD destacado
            </span>
          )}
          <button
            type="button"
            data-tour="trocar-branch"
            onClick={onOpenBranchModal}
            className={ACTION_BUTTON}
            title="Alternar branch ou criar uma nova"
          >
            Trocar / nova
          </button>
          <button
            type="button"
            onClick={onOpenTaskBranchModal}
            className={ACTION_BUTTON}
            title="Criar branch vinculada a tarefa do Azure DevOps ou Jira"
          >
            <span>Branch por tarefa</span>
          </button>
        </div>
      </div>

      {(project.uncommittedCount || 0) > 0 && (
        <button
          type="button"
          onClick={onOpenDiff}
          className="hidden sm:flex items-center gap-1.5 h-8 px-3 rounded-full bg-warning/10 hover:bg-warning/20 text-warning text-[13px] font-medium transition cursor-pointer"
          title="Inspecionar arquivos alterados e visualizador de diff"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>{project.uncommittedCount} {project.uncommittedCount === 1 ? 'alteração' : 'alterações'}</span>
          <Eye className="w-3 h-3 opacity-70" />
        </button>
      )}
    </div>

    {/* Ações Rápidas de Git */}
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onOpenDiff}
        className={QUIET_BUTTON}
        title="Visualizar diff e arquivos alterados"
      >
        <Split className="w-3.5 h-3.5" />
        <span>Diff</span>
      </button>
      <button
        type="button"
        onClick={onOpenHistory}
        className={QUIET_BUTTON}
        title="Ver últimos commits deste repositório"
      >
        <Clock className="w-3.5 h-3.5" />
        <span>Histórico</span>
      </button>
      <button
        type="button"
        data-tour="commit-push"
        onClick={onOpenCommit}
        disabled={!hasPendingChanges}
        className="h-8 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          hasPendingChanges
            ? 'Fazer commit rápido e push para o repositório remoto'
            : 'Sem alterações pendentes para commitar. Para enviar commits já feitos, use Push / Publicar.'
        }
      >
        <UploadCloud className="w-3.5 h-3.5" />
        <span>Commit e push</span>
      </button>
      <button
        type="button"
        onClick={onPublish}
        disabled={isExecutingGit}
        className={
          isLocalOnly
            ? 'h-8 px-3 bg-warning/10 hover:bg-warning/20 border border-warning/40 text-warning rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
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
        <Download className="w-3.5 h-3.5" />
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
        <Archive className="w-3.5 h-3.5" />
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
        <ArchiveRestore className="w-3.5 h-3.5" />
        <span>Pop</span>
      </button>
    </div>
  </div>
);
