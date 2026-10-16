import React from 'react';
import { NULL_SIGIL } from '../../../utils/databaseMutationUtils';
import {
  RESULTS_GRID_ROW_HEIGHT,
  getCellTitle,
  getRowClassName
} from '../../../utils/resultsGridUtils';
import type { ResultsGridDataType } from '../../../utils/resultsGridUtils';
import type { EditingCell } from '../../../hooks/database/useResultsGridEditing';
import type { ResultsGridContextMenuState } from './ResultsGridContextMenu';
import { ResultsGridCellContent } from './ResultsGridCellContent';

interface ResultsGridRowProps {
  row: Record<string, any>;
  index: number;
  columns: string[];
  columnDataTypes: Record<string, ResultsGridDataType>;
  isSelected: boolean;
  isEditable: boolean;
  editingCell: EditingCell | null;
  onSelectRow: (idx: number) => void;
  onCopyCell: (text: any, cellKey?: string, columnName?: string) => void;
  onStartEditing: (rowIndex: number, column: string, value: any) => void;
  onChangeEditingValue: (value: string) => void;
  onCommitEditing: (row: Record<string, any>, currentValue: any) => void;
  onCancelEditing: () => void;
  onOpenContextMenu: (menu: ResultsGridContextMenuState) => void;
  /** Coluna → novo valor ainda não aplicado. */
  pendingValues?: Record<string, any>;
  /** Linha marcada para exclusão (ainda não aplicada). */
  isDeleted?: boolean;
  columnWidths?: Record<string, number>;
  onOpenViewer?: (column: string, value: any, rowIndex: number) => void;
}

export const ResultsGridRow: React.FC<ResultsGridRowProps> = ({
  row,
  index: idx,
  columns,
  columnDataTypes,
  isSelected,
  isEditable,
  editingCell,
  onSelectRow,
  onCopyCell,
  onStartEditing,
  onChangeEditingValue,
  onCommitEditing,
  onCancelEditing,
  onOpenContextMenu,
  pendingValues,
  isDeleted = false,
  columnWidths,
  onOpenViewer
}) => (
  <tr
    onClick={() => onSelectRow(idx)}
    style={{ height: `${RESULTS_GRID_ROW_HEIGHT}px` }}
    className={`transition-colors select-text cursor-pointer ${getRowClassName(isSelected, idx)} ${isDeleted ? 'bg-danger/10 line-through opacity-60' : ''}`}
  >
    <td className="px-2 py-1.5 text-center text-muted-foreground text-2xs border-r border-border/30 w-12 min-w-[48px] max-w-[48px] select-none">
      {idx + 1}
    </td>
    {columns.map((col) => {
      const hasPending = !!pendingValues && col in pendingValues;
      const val = hasPending ? pendingValues![col] : row[col];
      const dType = columnDataTypes[col] || 'string';
      const isEditingThisCell = isEditable && editingCell?.rowIndex === idx && editingCell?.column === col;
      const width = columnWidths?.[col];
      const style = width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : undefined;

      if (isEditingThisCell && editingCell) {
        return (
          <td key={col} style={style} className={`px-1.5 py-1 border-r border-border/30 bg-info/5 ${!width ? 'min-w-[120px] max-w-md' : ''}`}>
            <input
              autoFocus
              type="text"
              value={editingCell.value}
              onChange={(e) => onChangeEditingValue(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => onCommitEditing(row, val)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onCommitEditing(row, val);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEditing();
                }
              }}
              title={`Valor especial "${NULL_SIGIL}" grava NULL na coluna`}
              className="w-full px-1.5 py-0.5 text-xs bg-background border border-info rounded font-mono focus:outline-hidden"
            />
          </td>
        );
      }

      return (
        <td
          key={col}
          style={style}
          onClick={() => {
            const selection = window.getSelection()?.toString();
            if (selection && selection.length > 0) return;
            onCopyCell(val, `cell_${idx}_${col}`, col);
          }}
          onDoubleClick={() => {
            if (isEditable) {
              onStartEditing(idx, col, val);
            } else if (onOpenViewer) {
              onOpenViewer(col, val, idx);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            onSelectRow(idx);
            onOpenContextMenu({ x: e.clientX, y: e.clientY, column: col, value: val, rowIndex: idx });
          }}
          title={hasPending ? `Alteração pendente (valor original: ${row[col] ?? 'NULL'})` : getCellTitle(isEditable)}
          className={`px-3 py-1.5 border-r border-border/30 whitespace-nowrap truncate hover:bg-info/10 transition-colors cursor-pointer ${!width ? 'min-w-[120px] max-w-md' : ''} ${hasPending ? 'bg-warning/20 ring-1 ring-inset ring-warning/50 font-semibold' : ''}`}
        >
          <ResultsGridCellContent value={val} dataType={dType} />
        </td>
      );
    })}
  </tr>
);
