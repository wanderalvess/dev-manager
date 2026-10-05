import React from 'react';
import { BookOpen, ExternalLink, FolderOpen } from 'lucide-react';
import type { DocFileInfo } from '../../../../shared/types';
import { getDocFileDisplayMeta } from '../../utils/docsFileMeta';

interface DocsFileCardProps {
  file: DocFileInfo;
  onOpenPreview: (filePath: string, title: string) => void;
  onOpenInEditor: (filePath: string) => void;
  onOpenInFolder: (filePath: string) => void;
}

export const DocsFileCard: React.FC<DocsFileCardProps> = ({
  file,
  onOpenPreview,
  onOpenInEditor,
  onOpenInFolder
}) => {
  const { fileName, ext, parentFolder } = getDocFileDisplayMeta(file.title);

  return (
    <div className="cockpit-card rounded-xl p-3.5 border border-border shadow-2xs flex items-center justify-between gap-3 hover:border-primary/50 transition-all group">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xs font-mono font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
            {ext}
          </span>
          <span className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors" title={fileName}>
            {fileName}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-2xs text-muted-foreground font-mono truncate">
          {parentFolder && (
            <>
              <span className="truncate max-w-[140px] opacity-75">{parentFolder}</span>
              <span className="opacity-40">/</span>
            </>
          )}
          <span className="text-muted-foreground/75 truncate" title={file.title}>
            {file.chunkCount} {file.chunkCount === 1 ? 'trecho' : 'trechos'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onOpenPreview(file.id, file.title)}
          className="px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all flex items-center gap-1.5 text-[11px] font-bold cursor-pointer active:scale-95 shadow-2xs"
          title="Ler documento formatado"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Ler</span>
        </button>
        <button
          onClick={() => onOpenInEditor(file.id)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Abrir no editor padrão do sistema"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onOpenInFolder(file.id)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          title="Revelar na pasta"
        >
          <FolderOpen className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
