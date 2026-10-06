import { useState } from 'react';
import type { TableColumnInfo } from '../../../../shared/types';
import { castEditedValue, buildEmptyRowDraft, draftToInsertValues } from '../../utils/databaseMutationUtils';
import { hasCellChanged, toEditableDisplay } from '../../utils/resultsGridUtils';

export interface EditingCell {
  rowIndex: number;
  column: string;
  value: string;
}

interface UseResultsGridEditingArgs {
  isEditable: boolean;
  isMutatingRow: boolean;
  editableColumns: TableColumnInfo[];
  onInsertRow?: (values: Record<string, any>) => void;
  onUpdateCell?: (row: Record<string, any>, column: string, newValue: any) => void;
}

export function useResultsGridEditing({
  isEditable,
  isMutatingRow,
  editableColumns,
  onInsertRow,
  onUpdateCell
}: UseResultsGridEditingArgs) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowDraft, setNewRowDraft] = useState<Record<string, string>>({});

  const columnByName = new Map((editableColumns || []).map((c) => [c.name, c]));

  const startAddingRow = () => {
    setNewRowDraft(buildEmptyRowDraft(editableColumns));
    setIsAddingRow(true);
  };

  const cancelAddingRow = () => {
    setIsAddingRow(false);
    setNewRowDraft({});
  };

  const confirmAddingRow = () => {
    if (!onInsertRow) return;
    onInsertRow(draftToInsertValues(newRowDraft, editableColumns));
    setIsAddingRow(false);
    setNewRowDraft({});
  };

  const updateDraftField = (column: string, value: string) =>
    setNewRowDraft((prev) => ({ ...prev, [column]: value }));

  const startEditingCell = (rowIndex: number, column: string, currentValue: any) => {
    if (!isEditable || isMutatingRow) return;
    setEditingCell({ rowIndex, column, value: toEditableDisplay(currentValue) });
  };

  const cancelEditingCell = () => setEditingCell(null);

  const changeEditingValue = (value: string) =>
    setEditingCell((prev) => (prev ? { ...prev, value } : prev));

  /** `currentValue`: o que a célula mostra agora (valor pendente, se houver, senão o original). */
  const commitEditingCell = (row: Record<string, any>, currentValue: any = row[editingCell?.column ?? '']) => {
    if (!editingCell || !onUpdateCell) return;
    if (hasCellChanged(editingCell.value, currentValue)) {
      const casted = castEditedValue(editingCell.value, columnByName.get(editingCell.column));
      onUpdateCell(row, editingCell.column, casted);
    }
    setEditingCell(null);
  };

  return {
    editingCell,
    isAddingRow,
    newRowDraft,
    startAddingRow,
    cancelAddingRow,
    confirmAddingRow,
    updateDraftField,
    startEditingCell,
    cancelEditingCell,
    changeEditingValue,
    commitEditingCell
  };
}
