import React, { useRef } from 'react';
import { FilterX } from 'lucide-react';
import { QueryResult, TableColumnInfo } from '../../../../shared/types';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import { useResultsGridEditing } from '../../hooks/database/useResultsGridEditing';
import { RESULTS_GRID_ROW_HEIGHT, computeBottomSpacerHeight } from '../../utils/resultsGridUtils';
import { ResultsGridStates } from './grid/ResultsGridStates';
import { ResultsGridToolbar } from './grid/ResultsGridToolbar';
import { ResultsGridHeader } from './grid/ResultsGridHeader';
import { ResultsGridNewRow } from './grid/ResultsGridNewRow';
import { ResultsGridRow } from './grid/ResultsGridRow';
import { ResultsGridContextMenu } from './grid/ResultsGridContextMenu';

export interface ResultsDataGridProps {
  queryResult: QueryResult | null;
  isExecuting?: boolean;
  processedRows: any[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  columnFilters: Record<string, string>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  sortConfig: { column: string; direction: 'asc' | 'desc' } | null;
  onToggleSort: (column: string) => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  columnDataTypes: Record<string, 'number' | 'date' | 'boolean' | 'object' | 'string'>;
  selectedRowIndex: number | null;
  setSelectedRowIndex: (idx: number | null) => void;
  activeColumnMenu: string | null;
  setActiveColumnMenu: (col: string | null) => void;
  cellContextMenu: {
    x: number;
    y: number;
    column: string;
    value: any;
    rowIndex: number;
  } | null;
  setCellContextMenu: React.Dispatch<React.SetStateAction<{
    x: number;
    y: number;
    column: string;
    value: any;
    rowIndex: number;
  } | null>>;
  onCopyCell: (text: any, cellKey?: string) => void;
  onFilterByCellValue: (col: string, val: any) => void;
  /** Nome da tabela de origem quando o resultado atual é um `SELECT * FROM <tabela>` simples — habilita inserir/editar/excluir linhas. */
  editableTableName?: string | null;
  editableColumns?: TableColumnInfo[];
  isMutatingRow?: boolean;
  onInsertRow?: (values: Record<string, any>) => void;
  onUpdateCell?: (row: Record<string, any>, column: string, newValue: any) => void;
  onDeleteRow?: (row: Record<string, any>) => void;
}

export const ResultsDataGrid: React.FC<ResultsDataGridProps> = ({
  queryResult,
  isExecuting = false,
  processedRows,
  searchTerm,
  setSearchTerm,
  columnFilters,
  setColumnFilters,
  sortConfig,
  onToggleSort,
  hasActiveFilters,
  onClearAllFilters,
  columnDataTypes,
  selectedRowIndex,
  setSelectedRowIndex,
  activeColumnMenu,
  setActiveColumnMenu,
  cellContextMenu,
  setCellContextMenu,
  onCopyCell,
  onFilterByCellValue,
  editableTableName = null,
  editableColumns = [],
  isMutatingRow = false,
  onInsertRow,
  onUpdateCell,
  onDeleteRow
}) => {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const isEditable = Boolean(editableTableName && onUpdateCell && onInsertRow && onDeleteRow);

  const editing = useResultsGridEditing({
    isEditable,
    isMutatingRow,
    editableColumns,
    onInsertRow,
    onUpdateCell
  });

  // Hook de Virtualização de Alta Performance (Windowing a 60 FPS)
  const { virtualItems, totalHeight, offsetY, isVirtual } = useVirtualScroll(
    tableContainerRef,
    {
      itemCount: processedRows.length,
      itemHeight: RESULTS_GRID_ROW_HEIGHT,
      overscan: 10
    }
  );

  const stateView = ResultsGridStates({ queryResult, isExecuting });
  if (stateView || !queryResult) return stateView;

  const rowsToRender = isVirtual
    ? virtualItems.map((v) => ({ row: processedRows[v.index], idx: v.index }))
    : processedRows.map((row, idx) => ({ row, idx }));

  const bottomSpacerHeight = computeBottomSpacerHeight(totalHeight, offsetY, virtualItems.length);
  const columnCount = queryResult.columns.length + 1;

  return (
    <div className="flex flex-col h-full">
      <ResultsGridToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isEditable={isEditable}
        editableTableName={editableTableName}
        isAddingRow={editing.isAddingRow}
        isMutatingRow={isMutatingRow}
        onStartAddingRow={editing.startAddingRow}
        isVirtual={isVirtual}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={onClearAllFilters}
        visibleRowCount={processedRows.length}
        totalRowCount={queryResult.rowCount}
      />

      {/* Tabela de Resultados Virtualizada */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto min-w-full relative">
        <table className="min-w-full divide-y divide-border/60 text-xs font-mono border-separate border-spacing-0">
          <ResultsGridHeader
            columns={queryResult.columns}
            columnDataTypes={columnDataTypes}
            columnFilters={columnFilters}
            setColumnFilters={setColumnFilters}
            sortConfig={sortConfig}
            onToggleSort={onToggleSort}
            activeColumnMenu={activeColumnMenu}
            setActiveColumnMenu={setActiveColumnMenu}
          />

          <tbody className="divide-y divide-border/40">
            {editing.isAddingRow && (
              <ResultsGridNewRow
                columns={queryResult.columns}
                draft={editing.newRowDraft}
                isMutatingRow={isMutatingRow}
                onChangeField={editing.updateDraftField}
                onConfirm={editing.confirmAddingRow}
                onCancel={editing.cancelAddingRow}
              />
            )}
            {processedRows.length === 0 ? (
              <tr className="bg-background">
                <td colSpan={columnCount} className="py-12 text-center text-muted-foreground text-xs font-sans">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <FilterX className="w-8 h-8 opacity-30 text-amber-500" />
                    <p className="font-semibold text-foreground">Nenhum resultado corresponde aos filtros aplicados.</p>
                    <span className="text-[11px] opacity-70">Tente ajustar o termo de busca ou filtros de coluna.</span>
                    <button
                      type="button"
                      onClick={onClearAllFilters}
                      className="mt-2 px-3 py-1 bg-primary/15 text-primary hover:bg-primary/25 rounded text-xs font-semibold transition cursor-pointer"
                    >
                      Remover todos os filtros
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <>
                {/* Spacer Top para Virtualização */}
                {isVirtual && offsetY > 0 && (
                  <tr>
                    <td colSpan={columnCount} style={{ height: `${offsetY}px`, padding: 0, border: 'none' }} />
                  </tr>
                )}

                {rowsToRender.map(({ row, idx }) => (
                  <ResultsGridRow
                    key={idx}
                    row={row}
                    index={idx}
                    columns={queryResult.columns}
                    columnDataTypes={columnDataTypes}
                    isSelected={selectedRowIndex === idx}
                    isEditable={isEditable}
                    editingCell={editing.editingCell}
                    onSelectRow={setSelectedRowIndex}
                    onCopyCell={onCopyCell}
                    onStartEditing={editing.startEditingCell}
                    onChangeEditingValue={editing.changeEditingValue}
                    onCommitEditing={editing.commitEditingCell}
                    onCancelEditing={editing.cancelEditingCell}
                    onOpenContextMenu={setCellContextMenu}
                  />
                ))}

                {/* Spacer Bottom para Virtualização */}
                {isVirtual && bottomSpacerHeight > 0 && (
                  <tr>
                    <td colSpan={columnCount} style={{ height: `${bottomSpacerHeight}px`, padding: 0, border: 'none' }} />
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      {cellContextMenu && (
        <ResultsGridContextMenu
          menu={cellContextMenu}
          isEditable={isEditable}
          isMutatingRow={isMutatingRow}
          processedRows={processedRows}
          onClose={() => setCellContextMenu(null)}
          onCopyCell={onCopyCell}
          onFilterByCellValue={onFilterByCellValue}
          onStartEditing={editing.startEditingCell}
          onDeleteRow={onDeleteRow}
        />
      )}
    </div>
  );
};
