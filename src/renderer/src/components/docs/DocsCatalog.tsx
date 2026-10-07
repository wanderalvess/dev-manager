import React from 'react';
import { FileText, Search, X } from 'lucide-react';
import type { DocFileInfo } from '../../../../shared/types';
import { DocsFileCard } from './DocsFileCard';

interface DocsCatalogProps {
  files: DocFileInfo[];
  fileFilter: string;
  onFileFilterChange: (value: string) => void;
  onOpenPreview: (filePath: string, title: string) => void;
  onOpenInEditor: (filePath: string) => void;
  onOpenInFolder: (filePath: string) => void;
}

export const DocsCatalog: React.FC<DocsCatalogProps> = ({
  files,
  fileFilter,
  onFileFilterChange,
  onOpenPreview,
  onOpenInEditor,
  onOpenInFolder
}) => (
  <div className="space-y-3" data-tour="indexed-docs-catalog">
    <div className="flex items-center justify-between gap-3 px-1">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-primary" />
        <h3 className="text-xs font-bold text-foreground">
          Documentos Indexados ({files.length})
        </h3>
      </div>
      <div className="relative w-72">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Filtrar documentos por nome..."
          value={fileFilter}
          onChange={(e) => onFileFilterChange(e.target.value)}
          className="w-full bg-card border border-border rounded-xl pl-8 pr-7 py-1.5 text-[11px] text-foreground placeholder-muted-foreground focus:outline-hidden focus:border-primary"
        />
        {fileFilter && (
          <button
            type="button"
            onClick={() => onFileFilterChange('')}
            className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>

    {files.length === 0 ? (
      <div className="cockpit-panel rounded-2xl p-8 text-center border border-border">
        <p className="text-xs text-muted-foreground">Nenhum documento encontrado com esse filtro.</p>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {files.map((file) => (
          <DocsFileCard
            key={file.id}
            file={file}
            onOpenPreview={onOpenPreview}
            onOpenInEditor={onOpenInEditor}
            onOpenInFolder={onOpenInFolder}
          />
        ))}
      </div>
    )}
  </div>
);
