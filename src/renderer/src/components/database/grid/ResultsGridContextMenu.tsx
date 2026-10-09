import React from 'react';
import { EscapeToClose } from '../../ui/EscapeToClose';
import { Filter, Copy, Trash2, Pencil } from 'lucide-react';
import { clampContextMenuPosition, formatFilterValueLabel } from '../../../utils/resultsGridUtils';

export interface ResultsGridContextMenuState {
  x: number;
  y: number;
  column: string;
  value: any;
  rowIndex: number;
}

interface ResultsGridContextMenuProps {
  menu: ResultsGridContextMenuState;
  isEditable: boolean;
  isMutatingRow: boolean;
  processedRows: any[];
  onClose: () => void;
  onCopyCell: (text: any, cellKey?: string) => void;
  onFilterByCellValue: (col: string, val: any) => void;
  onStartEditing: (rowIndex: number, column: string, value: any) => void;
  onDeleteRow?: (row: Record<string, any>) => void;
}

/** Menu de Contexto ao Clicar com Botão Direito na Célula */
export const ResultsGridContextMenu: React.FC<ResultsGridContextMenuProps> = ({
  menu,
  isEditable,
  isMutatingRow,
  processedRows,
  onClose,
  onCopyCell,
  onFilterByCellValue,
  onStartEditing,
  onDeleteRow
}) => (
  <>
    <div className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
    <EscapeToClose onEscape={onClose} />
    <div
      style={clampContextMenuPosition(menu.x, menu.y, window.innerWidth, window.innerHeight)}
      className="fixed z-50 w-60 bg-popover text-popover-foreground rounded-lg shadow-2xl border border-border p-1.5 text-xs font-sans animate-fade-in space-y-1"
    >
      <div className="px-2 py-1 text-2xs font-bold text-muted-foreground border-b border-border/60">
        Célula: {menu.column}
      </div>

      <button
        type="button"
        onClick={() => onFilterByCellValue(menu.column, menu.value)}
        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-accent transition text-left text-foreground font-semibold cursor-pointer"
      >
        <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="truncate">Filtrar por "{formatFilterValueLabel(menu.value)}"</span>
      </button>

      <button
        type="button"
        onClick={() => {
          onCopyCell(menu.value);
          onClose();
        }}
        className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-accent transition text-left text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <Copy className="w-3.5 h-3.5 shrink-0" />
        <span>Copiar valor</span>
      </button>

      {isEditable && (
        <>
          <button
            type="button"
            onClick={() => {
              onStartEditing(menu.rowIndex, menu.column, menu.value);
              onClose();
            }}
            className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-accent transition text-left text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            <span>Editar valor</span>
          </button>
          <div className="pt-1 mt-1 border-t border-border/60">
            <button
              type="button"
              disabled={isMutatingRow}
              onClick={() => {
                const targetRow = processedRows[menu.rowIndex];
                onClose();
                if (targetRow && onDeleteRow) onDeleteRow(targetRow);
              }}
              className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-rose-500/10 transition text-left text-rose-600 dark:text-rose-400 font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              <span>Marcar linha para exclusão</span>
            </button>
          </div>
        </>
      )}
    </div>
  </>
);
