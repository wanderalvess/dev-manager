import React from 'react';
import { Search, RefreshCw, CheckCircle2, Loader2, History } from 'lucide-react';
import type { RoutineBackupEntry } from '../../../../shared/types';
import { getBackupPath } from '../../utils/ccwModalUtils';
import { CcwBackupItem } from './CcwBackupItem';

interface CcwRollbackTabProps {
  rollbackRoutine: string;
  onRollbackRoutineChange: (v: string) => void;
  onSearch: () => void;
  isLoadingBackups: boolean;
  rollbackSuccessMsg: string | null;
  backups: RoutineBackupEntry[];
  restoringBackupPath: string | null;
  deletingBackupPath: string | null;
  confirmingRestorePath: string | null;
  confirmingDeletePath: string | null;
  onRestore: (entry: RoutineBackupEntry) => void;
  onDelete: (entry: RoutineBackupEntry) => void;
  onCancelRestore: () => void;
  onCancelDelete: () => void;
}

export const CcwRollbackTab: React.FC<CcwRollbackTabProps> = ({
  rollbackRoutine,
  onRollbackRoutineChange,
  onSearch,
  isLoadingBackups,
  rollbackSuccessMsg,
  backups,
  restoringBackupPath,
  deletingBackupPath,
  confirmingRestorePath,
  confirmingDeletePath,
  onRestore,
  onDelete,
  onCancelRestore,
  onCancelDelete
}) => (
  <div className="space-y-4">
    <div className="space-y-1">
      <span className="text-xs font-bold text-foreground block">
        Gerenciador de Rollback de Rotinas (.bak)
      </span>
      <span className="text-[11px] text-muted-foreground block">
        Restaure versões anteriores criadas automaticamente antes de atualizações ou substituições de executáveis.
      </span>
    </div>

    {/* Busca da rotina */}
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Código ou nome da rotina (ex: 132, PCSIS132)..."
          value={rollbackRoutine}
          onChange={(e) => onRollbackRoutineChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onSearch();
            }
          }}
          className="w-full bg-card border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-foreground font-mono"
        />
      </div>
      <button
        type="button"
        onClick={onSearch}
        disabled={isLoadingBackups || !rollbackRoutine.trim()}
        className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
        <span>Buscar Backups</span>
      </button>
    </div>

    {/* Feedback de sucesso do rollback */}
    {rollbackSuccessMsg && (
      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-in fade-in duration-150">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
        <span>{rollbackSuccessMsg}</span>
      </div>
    )}

    {/* Lista de backups */}
    {isLoadingBackups ? (
      <div className="py-8 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="font-mono">Escaneando backups no diretório...</span>
      </div>
    ) : backups.length === 0 ? (
      <div className="p-5 rounded-xl bg-card/30 border border-border/70 text-center space-y-1.5 shadow-2xs">
        <History className="w-6 h-6 text-muted-foreground/60 mx-auto" />
        <div className="text-xs font-bold font-mono text-foreground">
          {rollbackRoutine.trim()
            ? `Nenhum backup (.bak) encontrado para "${rollbackRoutine}"`
            : 'Informe o código da rotina e clique em "Buscar Backups"'}
        </div>
        <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
          Cópias .bak são criadas automaticamente sempre que uma rotina é atualizada pela CCW ou substituída localmente.
        </p>
      </div>
    ) : (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-bold text-foreground font-mono">
            {backups.length} cópia(s) encontrada(s)
          </span>
          <span className="text-2xs font-mono text-muted-foreground">
            Mais recente para mais antiga
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {backups.map((entry, entryIdx) => (
            <CcwBackupItem
              key={getBackupPath(entry) || entryIdx}
              entry={entry}
              restoringBackupPath={restoringBackupPath}
              deletingBackupPath={deletingBackupPath}
              confirmingRestorePath={confirmingRestorePath}
              confirmingDeletePath={confirmingDeletePath}
              onRestore={onRestore}
              onDelete={onDelete}
              onCancelRestore={onCancelRestore}
              onCancelDelete={onCancelDelete}
            />
          ))}
        </div>
      </div>
    )}
  </div>
);
