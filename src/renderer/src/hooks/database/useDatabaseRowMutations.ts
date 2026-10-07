import { useCallback, useMemo, useRef, useState } from 'react';
import type { DatabaseConnectionConfig } from '../../../../shared/types';
import { showToast } from '../../components/ToastHost';
import { getRowKeyColumns } from '../../utils/databaseMutationUtils';
import type { EditableTableState } from '../../utils/dbPageTypes';
import type { TxMode } from '../../utils/databaseSessionUtils';
import { requestConfirm } from '../../components/ui/confirmService';
import {
  EMPTY_PENDING,
  applyPendingChanges,
  pendingCount,
  removeInsert,
  stageCellChange,
  stageDelete,
  stageInsert,
  type PendingChanges
} from '../../utils/gridPendingChanges';

interface UseDatabaseRowMutationsParams {
  activeConnection: DatabaseConnectionConfig | null;
  editableTable: EditableTableState | null;
  /** Reexecuta a consulta atual para refletir as alterações aplicadas na grid. */
  reexecute: () => Promise<void>;
  /** Sessão do editor: as alterações entram na mesma transação (evita esperar linhas travadas pelo modo manual). */
  getSessionId?: () => string | undefined;
  txMode?: TxMode;
}

/**
 * Edição da grid em lote (só com SELECT * FROM <tabela única>): edições de célula, exclusões e novas linhas ficam
 * PENDENTES até "Aplicar"; "Descartar" joga tudo fora. Aplicar roda na sessão do editor, então no modo manual
 * o resultado fica numa transação que pode receber commit ou rollback.
 */
export function useDatabaseRowMutations({
  activeConnection,
  editableTable,
  reexecute,
  getSessionId,
  txMode = 'auto'
}: UseDatabaseRowMutationsParams) {
  const [pending, setPendingState] = useState<PendingChanges>(EMPTY_PENDING);
  // Espelho síncrono: o handleExecuteSql precisa saber, no mesmo instante, se há pendências a descartar
  const pendingRef = useRef<PendingChanges>(EMPTY_PENDING);
  const [isMutatingRow, setIsMutatingRow] = useState<boolean>(false);

  const setPending = useCallback((next: PendingChanges) => {
    pendingRef.current = next;
    setPendingState(next);
  }, []);

  const keyColumns = useMemo(() => (editableTable ? getRowKeyColumns(editableTable.columns, editableTable.identity === 'rowid') : []), [editableTable]);

  const stageInsertRow = (values: Record<string, any>) => setPending(stageInsert(pendingRef.current, values));
  const unstageInsertRow = (index: number) => setPending(removeInsert(pendingRef.current, index));

  const stageUpdateCell = (row: Record<string, any>, column: string, newValue: any) => {
    if (!editableTable) return;
    setPending(stageCellChange(pendingRef.current, row, keyColumns, column, newValue));
  };

  const stageDeleteRow = (row: Record<string, any>) => {
    if (!editableTable) return;
    setPending(stageDelete(pendingRef.current, row, keyColumns));
  };

  const discardPending = useCallback(() => setPending(EMPTY_PENDING), [setPending]);

  const applyPending = async () => {
    const snapshot = pendingRef.current;
    const count = pendingCount(snapshot);
    if (!activeConnection || !editableTable || count === 0) return;

    if (txMode === 'auto' && count > 1) {
      const ok = await requestConfirm({
        title: `Aplicar ${count} alterações?`,
        message:
          'Em auto-commit cada comando é confirmado assim que roda: se um falhar, os anteriores já estarão gravados. ' +
          'Para aplicar tudo como uma única transação (com rollback), mude para o modo Manual.',
        confirmLabel: 'Aplicar',
        tone: 'warning'
      });
      if (!ok) return;
    }

    const api = window.electronAPI;
    if (!api?.insertDbRow || !api.updateDbRow || !api.deleteDbRow) return;
    const sessionId = getSessionId?.();
    const table = editableTable.name;

    setIsMutatingRow(true);
    try {
      const outcome = await applyPendingChanges(snapshot, {
        update: (where, changes) => api.updateDbRow(activeConnection, table, changes, where, sessionId),
        remove: (where) => api.deleteDbRow(activeConnection, table, where, sessionId),
        insert: (values) => api.insertDbRow(activeConnection, table, values, sessionId)
      });

      setPending(outcome.remaining);
      if (outcome.failure) {
        showToast(
          `${outcome.applied} de ${count} aplicada(s). Falha em ${outcome.failure.description}: ${outcome.failure.error}`,
          'error'
        );
      } else {
        showToast(
          txMode === 'manual'
            ? `${outcome.applied} alteração(ões) aplicada(s). Use Commit (F11) para confirmar ou Rollback (F12) para desfazer.`
            : `${outcome.applied} alteração(ões) aplicada(s) e confirmada(s).`,
          'success'
        );
      }
      if (outcome.applied > 0) await reexecute();
    } finally {
      setIsMutatingRow(false);
    }
  };

  return {
    isMutatingRow,
    pending,
    pendingRef,
    pendingCount: pendingCount(pending),
    keyColumns,
    stageInsertRow,
    unstageInsertRow,
    stageUpdateCell,
    stageDeleteRow,
    applyPending,
    discardPending
  };
}
