import { useState } from 'react';
import type { DatabaseConnectionConfig } from '../../../../shared/types';
import { getRowKeyColumns } from '../../utils/databaseMutationUtils';
import type { EditableTableState } from '../../utils/dbPageTypes';

interface UseDatabaseRowMutationsParams {
  activeConnection: DatabaseConnectionConfig | null;
  editableTable: EditableTableState | null;
  /** Reexecuta a consulta atual para refletir a mutação na grid. */
  reexecute: () => Promise<void>;
}

/** Inserção, edição de célula e exclusão de linha na grid (só com SELECT * FROM <tabela única>). */
export function useDatabaseRowMutations({ activeConnection, editableTable, reexecute }: UseDatabaseRowMutationsParams) {
  const [isMutatingRow, setIsMutatingRow] = useState<boolean>(false);

  const handleInsertRow = async (values: Record<string, any>) => {
    if (!activeConnection || !editableTable || !window.electronAPI?.insertDbRow) return;
    setIsMutatingRow(true);
    try {
      const res = await window.electronAPI.insertDbRow(activeConnection, editableTable.name, values);
      if (!res.success) {
        alert(`Falha ao inserir linha:\n${res.error}`);
        return;
      }
      await reexecute();
    } finally {
      setIsMutatingRow(false);
    }
  };

  const handleUpdateCell = async (row: Record<string, any>, column: string, newValue: any) => {
    if (!activeConnection || !editableTable || !window.electronAPI?.updateDbRow) return;
    const keyColumns = getRowKeyColumns(editableTable.columns);
    const where: Record<string, any> = {};
    for (const k of keyColumns) where[k] = row[k];

    setIsMutatingRow(true);
    try {
      const res = await window.electronAPI.updateDbRow(activeConnection, editableTable.name, { [column]: newValue }, where);
      if (!res.success) {
        alert(`Falha ao atualizar célula:\n${res.error}`);
        return;
      }
      await reexecute();
    } finally {
      setIsMutatingRow(false);
    }
  };

  const handleDeleteRow = async (row: Record<string, any>) => {
    if (!activeConnection || !editableTable || !window.electronAPI?.deleteDbRow) return;
    if (!confirm('Deseja realmente excluir esta linha? Essa ação não pode ser desfeita.')) return;

    const keyColumns = getRowKeyColumns(editableTable.columns);
    const where: Record<string, any> = {};
    for (const k of keyColumns) where[k] = row[k];

    setIsMutatingRow(true);
    try {
      const res = await window.electronAPI.deleteDbRow(activeConnection, editableTable.name, where);
      if (!res.success) {
        alert(`Falha ao excluir linha:\n${res.error}`);
        return;
      }
      await reexecute();
    } finally {
      setIsMutatingRow(false);
    }
  };

  return { isMutatingRow, handleInsertRow, handleUpdateCell, handleDeleteRow };
}
