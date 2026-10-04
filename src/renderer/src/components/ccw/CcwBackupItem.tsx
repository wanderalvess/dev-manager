import React from 'react';
import { X, RotateCcw, Trash2, Clock } from 'lucide-react';
import type { RoutineBackupEntry } from '../../../../shared/types';
import { getBackupPath, getPathBaseName } from '../../utils/ccwModalUtils';

interface CcwBackupItemProps {
  entry: RoutineBackupEntry;
  restoringBackupPath: string | null;
  deletingBackupPath: string | null;
  confirmingRestorePath: string | null;
  confirmingDeletePath: string | null;
  onRestore: (entry: RoutineBackupEntry) => void;
  onDelete: (entry: RoutineBackupEntry) => void;
  onCancelRestore: () => void;
  onCancelDelete: () => void;
}

export const CcwBackupItem: React.FC<CcwBackupItemProps> = ({
  entry,
  restoringBackupPath,
  deletingBackupPath,
  confirmingRestorePath,
  confirmingDeletePath,
  onRestore,
  onDelete,
  onCancelRestore,
  onCancelDelete
}) => {
  const backupPath = getBackupPath(entry);
  const isRestoring = restoringBackupPath === backupPath;
  const isDeleting = deletingBackupPath === backupPath;
  const isConfirmingRestore = confirmingRestorePath === backupPath;
  const isConfirmingDelete = confirmingDeletePath === backupPath;

  return (
    <div
      className={`p-3 rounded-xl bg-card border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all shadow-2xs ${
        isConfirmingRestore
          ? 'border-amber-500/60 bg-amber-500/5'
          : isConfirmingDelete
          ? 'border-destructive/60 bg-destructive/5'
          : 'border-border/80 hover:border-primary/40'
      }`}
    >
      <div className="space-y-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold font-mono text-foreground truncate max-w-xs" title={entry.fileName}>
            {entry.fileName}
          </span>
          {entry.isPreRollback && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1 uppercase tracking-wider">
              <span>Pré-Rollback</span>
            </span>
          )}
          {entry.version?.fileVersion && (
            <span
              className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-2xs"
              title={`Versão do Executável (PE Header): FileVersion ${entry.version.fileVersion}${entry.version.productVersion ? ` / ProductVersion ${entry.version.productVersion}` : ''}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>v{entry.version.fileVersion}</span>
            </span>
          )}
          <span className="text-[10px] font-mono text-muted-foreground">
            {entry.sizeFormatted}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-3">
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <Clock className="w-3 h-3 text-muted-foreground/70" />
            {entry.dateFormatted}
          </span>
          <span className="truncate text-[10px] font-mono opacity-80" title={entry.targetRoutinePath || ''}>
            Destino: {entry.targetRoutinePath ? getPathBaseName(entry.targetRoutinePath) : 'N/A'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {isConfirmingRestore ? (
          <div className="flex items-center gap-1 animate-in fade-in duration-100">
            <button
              type="button"
              onClick={() => onRestore(entry)}
              disabled={isRestoring || isDeleting}
              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs animate-pulse"
              title="Confirmar restauração desta versão"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Confirmar?</span>
            </button>
            <button
              type="button"
              onClick={onCancelRestore}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onRestore(entry)}
            disabled={isRestoring || isDeleting}
            className="px-2.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Restaurar esta versão para o arquivo executável ativo"
          >
            <RotateCcw className={`w-3 h-3 ${isRestoring ? 'animate-spin' : ''}`} />
            <span>{isRestoring ? 'Restaurando...' : 'Restaurar'}</span>
          </button>
        )}

        {isConfirmingDelete ? (
          <div className="flex items-center gap-1 animate-in fade-in duration-100">
            <button
              type="button"
              onClick={() => onDelete(entry)}
              disabled={isRestoring || isDeleting}
              className="px-2 py-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
              title="Confirmar exclusão definitiva do backup"
            >
              <Trash2 className="w-3 h-3" />
              <span>Excluir?</span>
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
              title="Cancelar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onDelete(entry)}
            disabled={isRestoring || isDeleting}
            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            title="Excluir este arquivo .bak definitivamente"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
