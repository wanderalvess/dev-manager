import React from 'react';
import { RefreshCw, Check, Split, Code2 } from 'lucide-react';
import type { GitFileStatus } from '../../../../shared/types';
import { fileStatusBadge } from '../../utils/gitPageUtils';

interface GitPendingChangesPanelProps {
  files: GitFileStatus[];
  isLoading: boolean;
  ideFeedback: string | null;
  onOpenDiff: (filePath?: string) => void;
  onOpenFileInIde: (filePath: string) => void;
}

/** Separa pasta e nome: o nome do arquivo é o que se procura, a pasta só situa. */
function splitPath(filePath: string): { dir: string; name: string } {
  const index = filePath.lastIndexOf('/');
  return index < 0 ? { dir: '', name: filePath } : { dir: filePath.slice(0, index + 1), name: filePath.slice(index + 1) };
}

export const GitPendingChangesPanel: React.FC<GitPendingChangesPanelProps> = ({
  files,
  isLoading,
  ideFeedback,
  onOpenDiff,
  onOpenFileInIde
}) => (
  <section className="space-y-2" aria-labelledby="git-pending-title">
    <div className="flex items-center justify-between gap-2 min-h-8">
      <div className="flex items-baseline gap-2">
        <h3 id="git-pending-title" className="text-sm font-semibold text-foreground">
          Alterações pendentes
        </h3>
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {files.length} {files.length === 1 ? 'arquivo' : 'arquivos'}
        </span>
        {ideFeedback && (
          <span className="text-xs text-success font-medium flex items-center gap-1 self-center">
            <Check className="w-3.5 h-3.5" /> Aberto na IDE ({ideFeedback})
          </span>
        )}
      </div>

      {files.length > 0 && (
        <button
          type="button"
          onClick={() => onOpenDiff()}
          className="h-8 px-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          title="Abrir visualizador de diff completo"
        >
          <Split className="w-3.5 h-3.5" />
          <span>Ver diff geral</span>
        </button>
      )}
    </div>

    {isLoading ? (
      <div className="py-6 flex items-center justify-center text-[13px] text-muted-foreground gap-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
        <span>Verificando status dos arquivos...</span>
      </div>
    ) : files.length === 0 ? (
      <p className="py-2 flex items-center gap-2 text-[13px] text-muted-foreground">
        <Check className="w-4 h-4 text-success" />
        Nada pendente: a árvore de trabalho está limpa.
      </p>
    ) : (
      <ul className="max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border">
        {files.map((file) => {
          const badge = fileStatusBadge(file.status);
          const { dir, name } = splitPath(file.path);
          return (
            <li key={file.path} className="group flex items-center hover:bg-muted/60 transition-colors">
              <button
                type="button"
                onClick={() => onOpenDiff(file.path)}
                className="flex items-center gap-2.5 min-w-0 flex-1 h-8 pl-2.5 pr-2 text-left cursor-pointer"
                title={`Ver o diff de ${file.path}`}
              >
                <span
                  className={`w-4 text-center text-xs font-mono font-semibold shrink-0 ${badge.textClassName}`}
                >
                  {badge.label}
                </span>
                <span className="font-mono text-xs truncate min-w-0">
                  <span className="text-muted-foreground">{dir}</span>
                  <span className="text-foreground">{name}</span>
                  {file.originalPath && <span className="text-muted-foreground"> (de {file.originalPath})</span>}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onOpenFileInIde(file.path)}
                className="mr-1 h-6 px-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition cursor-pointer"
                title="Abrir na IDE / Editor"
                aria-label={`Abrir ${file.path} na IDE`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>IDE</span>
              </button>
            </li>
          );
        })}
      </ul>
    )}
  </section>
);
