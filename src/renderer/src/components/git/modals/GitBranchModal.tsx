import React from 'react';
import { GitBranch, X, AlertCircle, Plus, Search } from 'lucide-react';
import type { GitProjectInfo } from '../../../../../shared/types';
import { buildBranchEntries } from '../../../utils/gitViewUtils';
import { Modal } from '../../ui/Modal';

interface GitBranchModalProps {
  project: GitProjectInfo;
  newBranchName: string;
  branchFilter: string;
  branchError: string | null;
  isExecutingGit: boolean;
  onNewBranchNameChange: (value: string) => void;
  onBranchFilterChange: (value: string) => void;
  onCheckout: (branchName: string, createNew: boolean) => void;
  onClose: () => void;
}

export const GitBranchModal: React.FC<GitBranchModalProps> = ({
  project,
  newBranchName,
  branchFilter,
  branchError,
  isExecutingGit,
  onNewBranchNameChange,
  onBranchFilterChange,
  onCheckout,
  onClose
}) => {
  const { entries, total } = buildBranchEntries(project.branches, project.remoteBranches, branchFilter);

  return (
    <Modal
      open
      onClose={onClose}
      bare
      panelClassName="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-fade-in"
      closeOnBackdrop={false}
      closeOnEscape={false}
    >
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-foreground">Gerenciar Branches - {project.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {branchError && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-2xs font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{branchError}</span>
            </div>
          )}

          {/* Criar Nova Branch */}
          <div className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-2">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" /> Criar e alternar para nova branch:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => onNewBranchNameChange(e.target.value)}
                placeholder="ex: feature/rotina-1400"
                className="flex-1 bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-hidden focus:border-primary"
              />
              <button
                type="button"
                onClick={() => onCheckout(newBranchName, true)}
                disabled={isExecutingGit || !newBranchName.trim()}
                className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-xs hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer"
              >
                Criar
              </button>
            </div>
          </div>

          {/* Lista de Branches Existentes (locais + só no origin, que o checkout passa a rastrear) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="font-bold text-muted-foreground uppercase text-2xs tracking-wider block">
                Branches Disponíveis ({total}):
              </label>
              <div className="relative">
                <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1.5" />
                <input
                  type="text"
                  value={branchFilter}
                  onChange={(e) => onBranchFilterChange(e.target.value)}
                  placeholder="Filtrar..."
                  aria-label="Filtrar branches"
                  className="w-36 bg-background border border-border rounded-lg pl-6 pr-2 py-1 text-2xs text-foreground font-mono focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {entries.length === 0 && (
                <p className="text-2xs text-muted-foreground text-center py-3">Nenhuma branch encontrada.</p>
              )}
              {entries.map(({ name, remote }) => {
                const isCurrent = !remote && name === project.currentBranch;
                return (
                  <button
                    key={`${remote ? 'remote' : 'local'}:${name}`}
                    type="button"
                    onClick={() => !isCurrent && onCheckout(name, false)}
                    disabled={isCurrent || isExecutingGit}
                    className={`w-full text-left p-2 rounded-lg font-mono text-xs flex items-center justify-between transition border cursor-pointer ${
                      isCurrent
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
                        : 'bg-card border-transparent hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    {isCurrent ? (
                      <span className="text-2xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 px-1.5 py-0.5 rounded font-sans">Ativa</span>
                    ) : remote ? (
                      <span
                        className="text-2xs text-sky-600 dark:text-sky-400 font-sans shrink-0"
                        title="Existe só no origin; o checkout cria a branch local rastreando origin"
                      >
                        origin · Checkout
                      </span>
                    ) : (
                      <span className="text-2xs text-muted-foreground font-sans">Checkout</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
    </Modal>
  );
};
