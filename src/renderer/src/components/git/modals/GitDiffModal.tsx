import React from 'react';
import { Split, X, Check, Copy, ExternalLink, UploadCloud } from 'lucide-react';
import type { GitFileStatus, GitProjectInfo } from '../../../../../shared/types';
import { GitDiffFileList } from './GitDiffFileList';
import { GitDiffViewer } from './GitDiffViewer';

interface GitDiffModalProps {
  project: GitProjectInfo;
  files: GitFileStatus[];
  selectedFile: string | null;
  diffText: string;
  renderedDiff: { lines: string[]; hiddenCount: number };
  isLoading: boolean;
  error: string | null;
  copiedKey: string | null;
  onCopyDiff: (text: string) => void;
  onSelectFile: (filePath: string | null) => void;
  onOpenFileInIde: (filePath: string) => void;
  onCommit: () => void;
  onClose: () => void;
}

export const GitDiffModal: React.FC<GitDiffModalProps> = ({
  project,
  files,
  selectedFile,
  diffText,
  renderedDiff,
  isLoading,
  error,
  copiedKey,
  onCopyDiff,
  onSelectFile,
  onOpenFileInIde,
  onCommit,
  onClose
}) => (
  <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-fade-in">
      {/* Cabeçalho do Modal de Diff */}
      <div className="p-3 px-4 border-b border-border flex items-center justify-between bg-muted/30 shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center border border-border text-primary shrink-0">
            <Split className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Diff de Alterações · {project.name}
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              {files.length} arquivo(s) modificado(s) em relação a HEAD
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5">
          {selectedFile && (
            <button
              type="button"
              onClick={() => onOpenFileInIde(selectedFile)}
              className="px-2.5 py-1 bg-card hover:bg-muted border border-border text-foreground rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title={`Abrir ${selectedFile} na IDE`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-primary" />
              <span>Abrir na IDE</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onCopyDiff(diffText)}
            disabled={!diffText || isLoading}
            className="px-2.5 py-1 bg-card hover:bg-muted border border-border text-foreground rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            title="Copiar diff unificado para a área de transferência"
          >
            {copiedKey === diffText ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span>{copiedKey === diffText ? 'Copiado!' : 'Copiar Diff'}</span>
          </button>
          <button
            type="button"
            onClick={onCommit}
            className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Prosseguir para commit destas alterações"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Commitar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Corpo do Modal: Split entre lista de arquivos e visualizador */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        <GitDiffFileList
          files={files}
          selectedFile={selectedFile}
          onSelectFile={onSelectFile}
          onOpenFileInIde={onOpenFileInIde}
        />
        <GitDiffViewer
          isLoading={isLoading}
          error={error}
          diffText={diffText}
          lines={renderedDiff.lines}
          hiddenCount={renderedDiff.hiddenCount}
        />
      </div>
    </div>
  </div>
);
