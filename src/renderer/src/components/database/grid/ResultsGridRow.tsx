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
  onCopyCell: (text: any, cellKey?: string) => void;
  onStartEditing: (rowIndex: number, column: string, value: any) => void;
  onChangeEditingValue: (value: string) => void;
  onCommitEditing: (row: Record<string, any>) => void;
  onCancelEditing: () => void;
  onOpenContextMenu: (menu: ResultsGridContextMenuState) => void;
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
  onOpenContextMenu
}) => (
  <tr
    onClick={() => onSelectRow(idx)}
    style={{ height: `${RESULTS_GRID_ROW_HEIGHT}px` }}
    className={`transition-colors select-text cursor-pointer ${getRowClassName(isSelected, idx)}`}
  >
    <td className="px-2 py-1.5 text-center text-muted-foreground text-2xs border-r border-border/30 select-none">
      {idx + 1}
    </td>
    {columns.map((col) => {
      const val = row[col];
      const dType = columnDataTypes[col] || 'string';
      const isEditingThisCell = isEditable && editingCell?.rowIndex === idx && editingCell?.column === col;

      if (isEditingThisCell && editingCell) {
        return (
          <td key={col} className="px-1.5 py-1 border-r border-border/30 bg-sky-500/5">
            <input
              autoFocus
              type="text"
              value={editingCell.value}
              onChange={(e) => onChangeEditingValue(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => onCommitEditing(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onCommitEditing(row);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelEditing();
                }
              }}
              title={`Valor especial "${NULL_SIGIL}" grava NULL na coluna`}
              className="w-full px-1.5 py-0.5 text-xs bg-background border border-sky-500 rounded font-mono focus:outline-none"
            />
          </td>
        );
      }

      return (
        <td
          key={col}
          onClick={() => onCopyCell(val, `cell_${idx}_${col}`)}
          onDoubleClick={() => onStartEditing(idx, col, val)}
          onContextMenu={(e) => {
            e.preventDefault();
            onSelectRow(idx);
            onOpenContextMenu({ x: e.clientX, y: e.clientY, column: col, value: val, rowIndex: idx });
          }}
          title={getCellTitle(isEditable)}
          className="px-3 py-1.5 border-r border-border/30 whitespace-nowrap max-w-xs truncate hover:bg-sky-500/10 dark:hover:bg-sky-500/20 transition-colors cursor-pointer"
        >
          <ResultsGridCellContent value={val} dataType={dType} />
        </td>
      );
    })}
  </tr>
);
