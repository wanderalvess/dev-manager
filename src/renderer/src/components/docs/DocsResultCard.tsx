import React from 'react';
import { BookOpen, ExternalLink, FileText, FolderOpen } from 'lucide-react';
import type { DocSearchResult } from '../../../../shared/types';

interface DocsResultCardProps {
  result: DocSearchResult;
  onOpenPreview: (filePath: string, title: string) => void;
  onOpenInEditor: (filePath: string) => void;
  onOpenInFolder: (filePath: string) => void;
}

export const DocsResultCard: React.FC<DocsResultCardProps> = ({
  result,
  onOpenPreview,
  onOpenInEditor,
  onOpenInFolder
}) => (
  <div className="cockpit-card rounded-2xl p-4 border border-border shadow-sm space-y-2">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/80 shrink-0">
          {result.chunk.sourceLabel}
        </span>
        <span className="text-xs font-semibold text-foreground truncate flex items-center gap-1" title={result.chunk.entryTitle}>
          <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          {result.chunk.entryTitle}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-2xs font-mono text-muted-foreground mr-1">
          {(result.score * 100).toFixed(0)}% relevante
        </span>
        <button
          onClick={() => onOpenPreview(result.chunk.entryId, result.chunk.entryTitle)}
          className="px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
          title="Ler documento formatado"
        >
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Ler</span>
        </button>
        <button
          onClick={() => onOpenInEditor(result.chunk.entryId)}
          className="px-2 py-1 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
          title="Abrir arquivo no editor padrão do sistema / VS Code"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Editor</span>
        </button>
        <button
          onClick={() => onOpenInFolder(result.chunk.entryId)}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Revelar na pasta"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-6">
      {result.chunk.text}
    </p>
  </div>
);
