import React from 'react';
import { Clock, X, RefreshCw, AlertCircle, GitCommit } from 'lucide-react';
import type { GitCommitInfo, GitProjectInfo } from '../../../../../shared/types';

interface GitHistoryModalProps {
  project: GitProjectInfo;
  commits: GitCommitInfo[];
  isLoading: boolean;
  error: string | null;
  copiedHash: string | null;
  onCopyHash: (hash: string) => void;
  onClose: () => void;
}

export const GitHistoryModal: React.FC<GitHistoryModalProps> = ({
  project,
  commits,
  isLoading,
  error,
  copiedHash,
  onCopyHash,
  onClose
}) => (
  <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40 shrink-0">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Histórico de Commits - {project.name}</h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              Últimos commits da branch {project.currentBranch}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-muted-foreground space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            <span>Carregando histórico do Git...</span>
          </div>
        ) : error ? (
          <div className="h-48 flex flex-col items-center justify-center text-xs text-rose-600 dark:text-rose-400 space-y-2 text-center px-4">
            <AlertCircle className="w-8 h-8 opacity-70" />
            <p className="font-semibold text-foreground">Falha ao carregar histórico</p>
            <p className="text-muted-foreground font-mono">{error}</p>
          </div>
        ) : commits.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center text-xs text-muted-foreground">
            <GitCommit className="w-8 h-8 opacity-30 mb-2" />
            <p>Nenhum commit retornado pelo repositório.</p>
          </div>
        ) : (
          commits.map((c) => (
            <div
              key={c.hash}
              className="p-3 rounded-xl bg-card border border-border/70 hover:border-border transition space-y-1"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => onCopyHash(c.hash)}
                    title="Clique para copiar hash do commit"
                    className="font-mono font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 px-1.5 py-0.5 rounded text-2xs transition cursor-pointer"
                  >
                    {copiedHash === c.hash ? 'Copiado!' : c.hash}
                  </button>
                  <span className="font-bold text-foreground truncate max-w-[280px] sm:max-w-md">{c.author}</span>
                </div>
                <span className="text-2xs text-muted-foreground font-mono">{c.date}</span>
              </div>
              <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{c.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);
