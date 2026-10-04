import React from 'react';
import { Check, ExternalLink } from 'lucide-react';
import type { GitFileStatus } from '../../../../../shared/types';
import { fileStatusBadge } from '../../../utils/gitPageUtils';

interface GitDiffFileListProps {
  files: GitFileStatus[];
  selectedFile: string | null;
  onSelectFile: (filePath: string | null) => void;
  onOpenFileInIde: (filePath: string) => void;
}

export const GitDiffFileList: React.FC<GitDiffFileListProps> = ({
  files,
  selectedFile,
  onSelectFile,
  onOpenFileInIde
}) => (
  <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border bg-muted/15 flex flex-col shrink-0">
    <div className="p-2.5 px-3 border-b border-border flex items-center justify-between text-xs font-semibold text-muted-foreground shrink-0">
      <span>Arquivos Alterados</span>
      <button
        type="button"
        onClick={() => onSelectFile(null)}
        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
          selectedFile === null
            ? 'bg-primary text-primary-foreground font-semibold'
            : 'bg-muted hover:bg-muted/80 text-foreground border border-border/60'
        }`}
      >
        Ver Todos
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
      {files.length === 0 ? (
        <div className="h-32 flex flex-col items-center justify-center text-xs text-muted-foreground text-center p-3">
          <Check className="w-5 h-5 text-emerald-500 mb-1" />
          <span>Árvore de trabalho limpa.</span>
        </div>
      ) : (
        files.map((file) => {
          const isSelected = selectedFile === file.path;
          const badge = fileStatusBadge(file.status);

          return (
            <div
              key={file.path}
              className={`w-full p-1.5 px-2 rounded-md text-xs font-mono flex items-center gap-1.5 transition-colors ${
                isSelected
                  ? 'bg-muted border border-border text-foreground font-semibold'
                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectFile(file.path)}
                className="flex-1 flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
              >
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border shrink-0 ${badge.className}`}>
                  {badge.label}
                </span>
                <span
                  className="truncate flex-1"
                  title={file.originalPath ? `${file.originalPath} → ${file.path}` : file.path}
                >
                  {file.path}
                </span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenFileInIde(file.path);
                }}
                className="p-1 rounded hover:bg-card text-muted-foreground hover:text-primary transition-colors shrink-0 cursor-pointer"
                title={`Abrir ${file.path} na IDE`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })
      )}
    </div>
  </div>
);
