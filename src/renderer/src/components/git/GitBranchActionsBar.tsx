import React from 'react';
import {
  GitBranch,
  Download,
  RefreshCw,
  Archive,
  ArchiveRestore,
  Clock,
  UploadCloud,
  Upload,
  ChevronDown,
  ListTodo
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
  onOpenHistory: () => void;
  onOpenCommit: () => void;
  onExecGit: (command: 'fetch' | 'pull' | 'stash' | 'stash-pop') => void;
}

const QUIET_BUTTON =
  'h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const GROUP = 'flex items-stretch h-8 rounded-lg border border-border bg-card overflow-hidden divide-x divide-border';
const GROUP_BUTTON =
  'px-2.5 text-[13px] font-medium text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const TAG = 'text-xs font-medium text-warning';

export const GitBranchActionsBar: React.FC<GitBranchActionsBarProps> = ({
  project,
  isExecutingGit,
  isPublishing,
  isLocalOnly,
  hasPendingChanges,
  onPublish,
  onOpenBranchModal,
  onOpenTaskBranchModal,
  onOpenHistory,
  onOpenCommit,
  onExecGit
}) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
    <div className="flex items-center gap-1 min-w-0" data-tour="branch-atual">
      <button
        type="button"
        data-tour="trocar-branch"
        onClick={onOpenBranchModal}
        className="h-8 pl-2 pr-1.5 -ml-2 rounded-lg hover:bg-muted flex items-center gap-2 min-w-0 transition-colors cursor-pointer"
        title="Alternar branch ou criar uma nova"
        aria-label={`Branch atual: ${project.currentBranch}. Trocar ou criar branch`}
      >
        <GitBranch className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-mono font-medium text-foreground truncate">{project.currentBranch}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      </button>
      {isLocalOnly && (
        <span
          className={TAG}
          title="Esta branch existe só neste computador. Use Publicar para enviá-la ao origin (necessário para abrir o Pull Request)."
        >
          só local
        </span>
      )}
      {project.detachedHead && (
        <span className={TAG} title="O repositório está em um commit específico, fora de qualquer branch">
          HEAD destacado
        </span>
      )}
      <button
        type="button"
        onClick={onOpenTaskBranchModal}
        className={QUIET_BUTTON}
        title="Criar branch vinculada a tarefa do Azure DevOps ou Jira"
      >
        <ListTodo className="w-3.5 h-3.5" />
        <span>Branch por tarefa</span>
      </button>
      <button type="button" onClick={onOpenHistory} className={QUIET_BUTTON} title="Ver últimos commits deste repositório">
        <Clock className="w-3.5 h-3.5" />
        <span>Histórico</span>
      </button>
    </div>

    <div className="flex flex-wrap items-center gap-2">
      <div className={GROUP} data-tour="acoes-sync">
        <button
          type="button"
          onClick={() => onExecGit('fetch')}
          disabled={isExecutingGit}
          className={GROUP_BUTTON}
          title="Sincronizar referências remotas (git fetch)"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isExecutingGit ? 'animate-spin' : ''}`} />
          <span>Fetch</span>
        </button>
        <button
          type="button"
          onClick={() => onExecGit('pull')}
          disabled={isExecutingGit}
          className={GROUP_BUTTON}
          title="Baixar e mesclar alterações da branch remota (git pull)"
        >
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Pull</span>
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={isExecutingGit}
          className={`${GROUP_BUTTON} ${isLocalOnly ? 'text-warning' : ''}`}
          title={
            isLocalOnly
              ? 'Publicar a branch no origin (git push --set-upstream origin). Necessário antes de abrir o Pull Request.'
              : 'Enviar os commits locais para o origin (git push --set-upstream origin)'
          }
        >
          <Upload className={`w-3.5 h-3.5 ${isLocalOnly ? '' : 'text-muted-foreground'} ${isPublishing ? 'animate-pulse' : ''}`} />
          <span>{isPublishing ? 'Enviando...' : isLocalOnly ? 'Publicar' : 'Push'}</span>
        </button>
      </div>

      <div className={GROUP}>
        <button
          type="button"
          onClick={() => onExecGit('stash')}
          disabled={isExecutingGit}
          className={GROUP_BUTTON}
          title="Guardar alterações locais temporariamente (git stash)"
          aria-label="Guardar alterações locais (git stash)"
        >
          <Archive className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Stash</span>
        </button>
        <button
          type="button"
          onClick={() => onExecGit('stash-pop')}
          disabled={isExecutingGit}
          className={GROUP_BUTTON}
          title="Restaurar alterações locais guardadas (git stash pop)"
          aria-label="Restaurar alterações guardadas (git stash pop)"
        >
          <ArchiveRestore className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Pop</span>
        </button>
      </div>

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
    </div>
  </div>
);
