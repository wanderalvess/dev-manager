import React from 'react';
import { CheckCheck, XOctagon, Undo2 } from 'lucide-react';
import type { DbSessionState } from '../../../../../shared/types';
import { describePending, type TxMode } from '../../../utils/databaseSessionUtils';

export interface SqlTransactionControls {
  mode: TxMode;
  state: DbSessionState | null;
  isProduction: boolean;
  onChangeMode: (mode: TxMode) => void;
  onCommit: () => void;
  onRollback: () => void;
  onCancel: () => void;
}

interface SqlTransactionBarProps extends SqlTransactionControls {
  isExecuting: boolean;
}

const SEGMENT = 'px-2.5 py-1 text-2xs font-semibold transition-colors cursor-pointer';

/** Controle de transação do editor: auto-commit ou manual, commit (F11), rollback (F12) e cancelar consulta. */
export const SqlTransactionBar: React.FC<SqlTransactionBarProps> = ({
  mode,
  state,
  isProduction,
  isExecuting,
  onChangeMode,
  onCommit,
  onRollback,
  onCancel
}) => {
  const pending = state?.pendingStatements ?? 0;
  const manual = mode === 'manual';

  return (
    <div className="px-2.5 py-1.5 bg-card/20 border-b border-border/60 flex flex-wrap items-center gap-2.5 shrink-0" data-tour="transaction-bar">
      <div role="group" aria-label="Modo de transação" className="flex rounded-md border border-border/70 overflow-hidden">
        <button
          type="button"
          aria-pressed={!manual}
          onClick={() => onChangeMode('auto')}
          className={`${SEGMENT} ${!manual ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
          title="Cada comando é confirmado (commit) assim que termina"
        >
          Auto-commit
        </button>
        <button
          type="button"
          aria-pressed={manual}
          onClick={() => onChangeMode('manual')}
          className={`${SEGMENT} ${manual ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:text-foreground'}`}
          title="As alterações ficam pendentes até você confirmar (commit) ou desfazer (rollback)"
        >
          Manual
        </button>
      </div>

      {isProduction && (
        <span className="px-1.5 py-0.5 rounded text-2xs font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30" title="Conexão marcada como produção">
          PRODUÇÃO
        </span>
      )}

      {manual ? (
        <>
          <span
            className={`text-2xs font-mono ${pending > 0 ? 'text-amber-500 font-semibold' : 'text-muted-foreground'}`}
            aria-live="polite"
          >
            {describePending(state)}
          </span>
          <button
            type="button"
            onClick={onCommit}
            disabled={pending === 0 || isExecuting}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-2xs font-bold disabled:opacity-50 cursor-pointer"
            title="Confirmar as alterações pendentes (F11)"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Commit</span>
            <span className="opacity-70 font-mono">F11</span>
          </button>
          <button
            type="button"
            onClick={onRollback}
            disabled={pending === 0 || isExecuting}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-card hover:bg-muted border border-border/70 text-foreground text-2xs font-bold disabled:opacity-50 cursor-pointer"
            title="Desfazer as alterações pendentes (F12)"
          >
            <Undo2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Rollback</span>
            <span className="opacity-60 font-mono">F12</span>
          </button>
          {pending > 0 && (
            <span className="text-2xs text-muted-foreground">
              DDL (CREATE, ALTER, DROP...) confirma tudo sozinho no Oracle e no MySQL.
            </span>
          )}
        </>
      ) : (
        <span className="text-2xs text-muted-foreground">Cada comando é confirmado na hora.</span>
      )}

      {isExecuting && (
        <button
          type="button"
          onClick={onCancel}
          className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-2xs font-bold cursor-pointer"
          title="Interromper a consulta em andamento"
        >
          <XOctagon className="w-3.5 h-3.5" />
          <span>Cancelar consulta</span>
        </button>
      )}
    </div>
  );
};
