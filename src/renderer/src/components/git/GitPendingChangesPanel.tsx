import React from 'react';
import { RefreshCw, FileEdit, UploadCloud, Check, Split, Eye, Code2 } from 'lucide-react';
import type { GitFileStatus } from '../../../../shared/types';
import { fileStatusBadge } from '../../utils/gitPageUtils';

interface GitPendingChangesPanelProps {
  files: GitFileStatus[];
  isLoading: boolean;
  ideFeedback: string | null;
  onOpenDiff: (filePath?: string) => void;
  onOpenCommit: () => void;
  onOpenFileInIde: (filePath: string) => void;
}

export const GitPendingChangesPanel: React.FC<GitPendingChangesPanelProps> = ({
  files,
  isLoading,
  ideFeedback,
  onOpenDiff,
  onOpenCommit,
  onOpenFileInIde
}) => (
  <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <FileEdit className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
          Alterações Pendentes
        </span>
        <span className="text-[10px] bg-muted text-muted-foreground border border-border px-1.5 py-0.5 rounded font-mono font-medium">
          {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
        </span>
        {ideFeedback && (
          <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> Aberto na IDE ({ideFeedback})
          </span>
        )}
      </div>

      <div className="flex items-center space-x-1.5">
        <button
          type="button"
          onClick={() => onOpenDiff()}
          disabled={files.length === 0}
          className="px-2.5 py-1 bg-card hover:bg-muted border border-border text-foreground rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          title="Abrir visualizador de diff completo"
        >
          <Split className="w-3.5 h-3.5 text-muted-foreground" />
          <span>Ver Diff Geral</span>
        </button>
        <button
          type="button"
          onClick={onOpenCommit}
          disabled={files.length === 0}
          className="px-2.5 py-1 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
          title="Prosseguir para commit"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>Commitar</span>
        </button>
      </div>
    </div>

    {isLoading ? (
      <div className="py-6 flex items-center justify-center text-xs text-muted-foreground gap-2 font-mono">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        <span>Verificando status dos arquivos...</span>
      </div>
    ) : files.length === 0 ? (
      <div className="py-3 px-3 bg-muted/20 border border-border/50 rounded-lg flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>Árvore de trabalho limpa. Nenhuma modificação pendente neste repositório.</span>
        </div>
        <span className="text-[10px] font-mono opacity-60">git status limpo</span>
      </div>
    ) : (
      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {files.map((file) => {
          const badge = fileStatusBadge(file.status);
          return (
            <div
              key={file.path}
              className="group flex items-center justify-between p-1.5 px-2 rounded-lg bg-muted/20 hover:bg-muted/50 border border-border/50 hover:border-border transition-colors"
            >
              <button
                type="button"
                onClick={() => onOpenDiff(file.path)}
                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                title={`Clique para ver o diff de ${file.path}`}
              >
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border shrink-0 ${badge.className}`}>
                  {badge.label}
                </span>
                <span className="font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">
                  {file.path}
                </span>
                {file.originalPath && (
                  <span className="text-[10px] text-muted-foreground font-mono truncate">
                    (de {file.originalPath})
                  </span>
                )}
              </button>

              <div className="flex items-center space-x-1 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={() => onOpenFileInIde(file.path)}
                  className="px-2 py-0.5 bg-card hover:bg-muted border border-border/70 text-muted-foreground hover:text-foreground rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Abrir na IDE / Editor"
                >
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                  <span className="hidden sm:inline">Abrir na IDE</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDiff(file.path)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                  title="Visualizar diff deste arquivo"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
