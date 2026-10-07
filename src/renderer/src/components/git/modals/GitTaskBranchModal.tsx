import React from 'react';
import { GitBranch, X, AlertCircle, Check, Copy } from 'lucide-react';
import type { GitProjectInfo } from '../../../../../shared/types';
import type { useGitTaskBranch } from '../../../hooks/git/useGitTaskBranch';
import { GitTaskImportSection } from './GitTaskImportSection';
import { Modal } from '../../ui/Modal';

type TaskBranchState = ReturnType<typeof useGitTaskBranch>;

interface GitTaskBranchModalProps {
  project: GitProjectInfo;
  task: TaskBranchState;
  copiedKey: string | null;
  onCopy: (text: string) => void;
}

const INPUT_CLASS =
  'w-full bg-background border border-border rounded-md px-2 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:border-primary';

export const GitTaskBranchModal: React.FC<GitTaskBranchModalProps> = ({ project, task, copiedKey, onCopy }) => (
  <Modal
    open
    onClose={task.closeTaskBranchModal}
    bare
    panelClassName="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-fade-in"
    closeOnBackdrop={false}
    closeOnEscape={false}
    ariaLabel="Criar branch por tarefa"
  >
    {/* Header */}
    <div className="p-3 px-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
      <div className="flex items-center space-x-2.5">
        <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center border border-border text-primary shrink-0">
          <GitBranch className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-xs font-semibold text-foreground tracking-tight">Criar Branch por Tarefa</h3>
          <span className="text-[11px] text-muted-foreground font-mono">
            {project.name} [{project.currentBranch}]
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={task.closeTaskBranchModal}
        className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        title="Fechar"
      >
        <X className="w-4 h-4" />
      </button>
    </div>

    {/* Modal Body */}
    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
      {task.taskBranchError && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-[11px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{task.taskBranchError}</span>
        </div>
      )}

      <GitTaskImportSection
        rawInput={task.taskRawInput}
        isLoadingTasks={task.isLoadingTasks}
        tasks={task.taskItems}
        selectedTaskId={task.selectedTask?.id}
        onRawInputChange={task.handleTaskRawInputChange}
        onSearch={() => task.handleSearchTasks(task.taskSearchQuery || task.taskRawInput)}
        onSelectTask={task.handleSelectTask}
      />

      {/* Parâmetros da Branch */}
      <div className="space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Prefixo:</label>
            <select
              value={task.taskBranchPrefix}
              onChange={(e) => task.setTaskBranchPrefix(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="feature/">feature/</option>
              <option value="bugfix/">bugfix/</option>
              <option value="fix/">fix/</option>
              <option value="hotfix/">hotfix/</option>
              <option value="chore/">chore/</option>
              <option value="refactor/">refactor/</option>
              <option value="test/">test/</option>
              <option value="docs/">docs/</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">ID da Tarefa:</label>
            <input
              type="text"
              value={task.taskBranchId}
              onChange={(e) => task.setTaskBranchId(e.target.value)}
              placeholder="Ex: 10482"
              className={`${INPUT_CLASS} placeholder:text-muted-foreground/50`}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Branch Base:</label>
            <select
              value={task.taskBaseBranch}
              onChange={(e) => task.setTaskBaseBranch(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value={project.currentBranch}>{project.currentBranch} (atual)</option>
              {project.branches
                .filter((b) => b !== project.currentBranch)
                .map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              {(project.remoteBranches || [])
                .filter((rb) => !project.branches.includes(rb) && rb !== project.currentBranch)
                .map((rb) => (
                  <option key={rb} value={rb}>
                    {rb} (remota)
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">Título / Resumo da Tarefa:</label>
          <input
            type="text"
            value={task.taskBranchTitle}
            onChange={(e) => task.setTaskBranchTitle(e.target.value)}
            placeholder="Ex: Ajustes na rotina de faturamento"
            className="w-full bg-background border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:border-primary placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      {/* Preview da Branch Gerada estilo Terminal */}
      <div className="p-3 bg-muted/20 border border-border/60 rounded-lg space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span className="uppercase tracking-wider font-semibold text-2xs">Branch Destino</span>
          <span className="text-2xs text-muted-foreground/60">checkout &amp; switch</span>
        </div>
        <div className="flex items-center gap-2 bg-background border border-border rounded-md px-2.5 py-1.5 font-mono text-xs">
          <span className="text-muted-foreground select-none">$</span>
          <span className="text-muted-foreground/70 select-none">git checkout -b</span>
          <span className="font-semibold text-primary flex-1 truncate">{task.computedTaskBranchName || '...'}</span>
          {task.computedTaskBranchName && (
            <button
              type="button"
              onClick={() => onCopy(task.computedTaskBranchName)}
              className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-colors cursor-pointer shrink-0"
              title="Copiar nome da branch"
            >
              {copiedKey === task.computedTaskBranchName ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
        {!task.taskBranchValidation.valid && (
          <p className="text-[11px] text-rose-500 font-medium">{task.taskBranchValidation.error}</p>
        )}
      </div>
    </div>

    {/* Footer */}
    <div className="p-3 px-4 border-t border-border bg-muted/15 flex items-center justify-end gap-2 shrink-0">
      <button
        type="button"
        onClick={task.closeTaskBranchModal}
        className="px-3 py-1.5 rounded-md text-xs font-medium hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={task.handleCreateTaskBranch}
        disabled={!task.taskBranchValidation.valid || task.isCreatingTaskBranch}
        className="px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <GitBranch className={`w-3.5 h-3.5 ${task.isCreatingTaskBranch ? 'animate-pulse' : ''}`} />
        <span>{task.isCreatingTaskBranch ? 'Criando e Alternando...' : 'Criar e Alternar Branch'}</span>
      </button>
    </div>
  </Modal>
);
