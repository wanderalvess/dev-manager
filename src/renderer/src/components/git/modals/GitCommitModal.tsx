import React from 'react';
import { UploadCloud, X, AlertCircle, Eye } from 'lucide-react';
import type { GitFileStatus, GitProjectInfo } from '../../../../../shared/types';
import { fileStatusBadge } from '../../../utils/gitPageUtils';

interface GitCommitModalProps {
  project: GitProjectInfo;
  commitMessage: string;
  commitError: string | null;
  commitFiles: GitFileStatus[];
  isLoadingFiles: boolean;
  isCommitting: boolean;
  onMessageChange: (value: string) => void;
  onInspectFile: (filePath: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const GitCommitModal: React.FC<GitCommitModalProps> = ({
  project,
  commitMessage,
  commitError,
  commitFiles,
  isLoadingFiles,
  isCommitting,
  onMessageChange,
  onInspectFile,
  onConfirm,
  onClose
}) => (
  <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
        <div className="flex items-center space-x-2">
          <UploadCloud className="w-5 h-5 text-emerald-500" />
          <div>
            <h3 className="text-sm font-bold text-foreground">Commit & Push Rápido</h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              {project.name} [{project.currentBranch}]
            </span>
          </div>
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

      <div className="p-4 space-y-3">
        {commitError && (
          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-[11px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{commitError}</span>
          </div>
        )}
        <div>
          <label className="text-xs font-bold text-foreground block mb-1">
            Mensagem de Commit (git add -A && git commit && git push):
          </label>
          <textarea
            value={commitMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            placeholder="ex: feat: ajustes na rotina de faturamento 1400"
            rows={3}
            className="w-full bg-background border border-border rounded-xl p-2.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* git add -A inclui arquivos não rastreados: listar evita subir um .env ou build por engano */}
        <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-xl border border-border/60 overflow-hidden">
          <div className="flex items-center justify-between p-2.5 border-b border-border/60">
            <span>
              {isLoadingFiles
                ? 'Carregando arquivos alterados...'
                : `${commitFiles.length} arquivo(s) serão incluídos (inclusive não rastreados).`}
            </span>
            <span className="text-primary font-mono font-bold">git push origin</span>
          </div>
          {!isLoadingFiles && commitFiles.length > 0 && (
            <div className="max-h-36 overflow-y-auto p-1.5 space-y-0.5">
              {commitFiles.map((file) => {
                const badge = fileStatusBadge(file.status);
                return (
                  <button
                    key={file.path}
                    type="button"
                    onClick={() => onInspectFile(file.path)}
                    className="w-full text-left flex items-center justify-between gap-2 px-1.5 py-1 rounded-md font-mono text-[11px] text-foreground hover:bg-muted/70 transition cursor-pointer"
                    title={`Clique para inspecionar o diff de ${file.path}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`px-1 rounded text-[9px] font-bold border shrink-0 ${badge.className}`}>{badge.label}</span>
                      <span className="truncate">{file.path}</span>
                    </div>
                    <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0 opacity-70" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isCommitting || !commitMessage.trim() || (!isLoadingFiles && commitFiles.length === 0)}
            className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs flex items-center space-x-1.5 transition disabled:opacity-50 shadow-md shadow-primary/25 cursor-pointer"
          >
            <UploadCloud className={`w-3.5 h-3.5 ${isCommitting ? 'animate-pulse' : ''}`} />
            <span>{isCommitting ? 'Enviando...' : 'Confirmar & Enviar (Push)'}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
