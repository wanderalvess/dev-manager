import React from 'react';
import { FolderOpen, Plus, Trash2, Check, Copy, ExternalLink } from 'lucide-react';
import type { DocFolderConfig } from '../../../../shared/types';
import { getFolderDisplayTitle } from '../../utils/docSettingsUtils';

interface DocSettingsFolderListProps {
  docFolders: DocFolderConfig[];
  isAddingFolder: boolean;
  copiedFolderPath: string | null;
  onAddFolder: () => Promise<void>;
  onRemoveFolder: (path: string) => Promise<void>;
  onCopyPath: (path: string) => void;
  onOpenInExplorer: (path: string) => void;
}

export const DocSettingsFolderList: React.FC<DocSettingsFolderListProps> = ({
  docFolders,
  isAddingFolder,
  copiedFolderPath,
  onAddFolder,
  onRemoveFolder,
  onCopyPath,
  onOpenInExplorer
}) => (
  <div className="p-4 rounded-xl border border-border/90 bg-card space-y-3.5 shadow-2xs">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-primary" />
            <span>Pastas Locais Dedicadas</span>
          </h4>
          <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
            {docFolders.length} {docFolders.length === 1 ? 'pasta' : 'pastas'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Diretórios fora do Git contendo manuais, especificações ou guias (.md, .txt, .pdf, .docx).
        </p>
      </div>
      <button
        type="button"
        onClick={onAddFolder}
        disabled={isAddingFolder}
        className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Adicionar pasta de docs</span>
      </button>
    </div>

    {docFolders.length === 0 ? (
      <div className="text-center py-7 px-4 border border-dashed border-border/80 rounded-xl bg-muted/10 space-y-2">
        <div className="w-10 h-10 mx-auto rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/60">
          <FolderOpen className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Nenhuma pasta local configurada</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
            Adicione diretórios dedicados de documentação para que seus arquivos sejam indexados no RAG.
          </p>
        </div>
        <button
          type="button"
          onClick={onAddFolder}
          disabled={isAddingFolder}
          className="mt-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-foreground border border-border text-xs font-semibold rounded-xl inline-flex items-center gap-1.5 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Selecionar Pasta no Computador</span>
        </button>
      </div>
    ) : (
      <div className="space-y-2">
        {docFolders.map((folder) => (
          <div
            key={folder.path}
            className="group p-3 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/80 hover:border-primary/40 transition-all flex items-center justify-between gap-3 shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary shrink-0 group-hover:scale-105 transition-transform">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground truncate">{getFolderDisplayTitle(folder)}</span>
                  <span className="text-2xs font-mono uppercase font-bold px-1.5 py-0.2 rounded-md bg-muted text-muted-foreground border border-border/60 shrink-0">
                    Pasta Local
                  </span>
                </div>
                <p className="text-2xs font-mono text-muted-foreground truncate mt-0.5" title={folder.path}>
                  {folder.path}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onCopyPath(folder.path)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                title={copiedFolderPath === folder.path ? 'Caminho copiado!' : 'Copiar caminho completo'}
              >
                {copiedFolderPath === folder.path ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onOpenInExplorer(folder.path)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                title="Revelar pasta no Explorador de Arquivos"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRemoveFolder(folder.path)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                title="Remover pasta da indexação"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
