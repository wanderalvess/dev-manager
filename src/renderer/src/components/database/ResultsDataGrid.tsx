import React, { useRef, useEffect, useState } from 'react';
import { DatabaseConnectionConfig, QueryResult, TableColumnInfo } from '../../../../shared/types';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import { useResultsGridEditing } from '../../hooks/database/useResultsGridEditing';
import { useResultsGridColumnResize } from '../../hooks/database/useResultsGridColumnResize';
import { RESULTS_GRID_ROW_HEIGHT, computeBottomSpacerHeight } from '../../utils/resultsGridUtils';
import { ResultsGridStates } from './grid/ResultsGridStates';
import { ResultsGridToolbar } from './grid/ResultsGridToolbar';
import { ResultsGridHeader } from './grid/ResultsGridHeader';
import { ResultsGridNewRow } from './grid/ResultsGridNewRow';
import { ResultsGridRow } from './grid/ResultsGridRow';
import { ResultsGridContextMenu, type ResultsGridContextMenuState } from './grid/ResultsGridContextMenu';
import { ResultsGridEmptyState } from './grid/ResultsGridEmptyState';
import { ResultsGridPendingInserts } from './grid/ResultsGridPendingInserts';
import { CellViewerModal } from './CellViewerModal';
import { EMPTY_PENDING, isRowDeleted, pendingCount as countPending, pendingValuesOf, type PendingChanges } from '../../utils/gridPendingChanges';

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
  cellContextMenu: ResultsGridContextMenuState | null;
  setCellContextMenu: React.Dispatch<React.SetStateAction<ResultsGridContextMenuState | null>>;
  onCopyCell: (text: any, cellKey?: string, columnName?: string) => void;
  onFilterByCellValue: (col: string, val: any) => void;
  /** Nome da tabela de origem quando o resultado atual é um `SELECT * FROM <tabela>` simples — habilita inserir/editar/excluir linhas. */
  editableTableName?: string | null;
  editableColumns?: TableColumnInfo[];
  isMutatingRow?: boolean;
  onInsertRow?: (values: Record<string, any>) => void;
  onUpdateCell?: (row: Record<string, any>, column: string, newValue: any) => void;
  onDeleteRow?: (row: Record<string, any>) => void;
  /** Alterações em lote ainda não gravadas (edições, exclusões e novas linhas). */
  pending?: PendingChanges;
  keyColumns?: string[];
  onApplyPending?: () => void;
  onDiscardPending?: () => void;
  onUnstageInsert?: (index: number) => void;
  /** Conexão da aba; usada para estimar as linhas da tabela quando o resultado vem vazio. */
  connection?: DatabaseConnectionConfig | null;
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
  onDeleteRow,
  pending = EMPTY_PENDING,
  keyColumns = [],
  onApplyPending,
  onDiscardPending,
  onUnstageInsert,
  connection = null
}) => {
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const isEditable = Boolean(editableTableName && onUpdateCell && onInsertRow && onDeleteRow);
  const { columnWidths, startResize, expandColumn } = useResultsGridColumnResize();
  const [viewerCell, setViewerCell] = useState<{
    column: string;
    value: any;
    rowIndex: number;
    dataType: 'number' | 'date' | 'boolean' | 'object' | 'string';
  } | null>(null);

  const handleOpenViewer = (column: string, value: any, rowIndex: number) => {
    setViewerCell({
      column,
      value,
      rowIndex,
      dataType: columnDataTypes[column] || 'string'
    });
  };

  const editing = useResultsGridEditing({
    isEditable,
    isMutatingRow,
    editableColumns,
    onInsertRow,
    onUpdateCell
  });

  // Hook de Virtualização de Alta Performance (Windowing a 60 FPS)
  const { virtualItems, totalHeight, offsetY, isVirtual, onScroll, setContainerRef, scrollToTop } = useVirtualScroll(
    tableContainerRef,
    {
      itemCount: processedRows.length,
      itemHeight: RESULTS_GRID_ROW_HEIGHT,
      overscan: 10
    }
  );

  // Reseta a rolagem para o topo quando uma nova consulta for carregada
  useEffect(() => {
    scrollToTop();
  }, [queryResult, scrollToTop]);

  const stateView = ResultsGridStates({ queryResult, isExecuting, tableName: editableTableName, connection });
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
        pendingCount={countPending(pending)}
        onApplyPending={onApplyPending}
        onDiscardPending={onDiscardPending}
      />

      {/* Tabela de Resultados Virtualizada */}
      <div
        ref={setContainerRef}
        onScroll={onScroll}
        className="flex-1 overflow-auto min-w-full relative"
      >
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
            columnWidths={columnWidths}
            onStartResize={startResize}
            onExpandColumn={expandColumn}
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
            <ResultsGridPendingInserts
              inserts={pending.inserts}
              columns={queryResult.columns}
              columnWidths={columnWidths}
              onUnstageInsert={onUnstageInsert}
            />
            {processedRows.length === 0 ? (
              <ResultsGridEmptyState
                columnCount={columnCount}
                totalRows={queryResult.rows.length}
                onClearAllFilters={onClearAllFilters}
              />
            ) : (
              <>
                {/* Spacer Top para Virtualização */}
                {isVirtual && offsetY > 0 && (
                  <tr style={{ height: `${offsetY}px` }}>
                    <td colSpan={columnCount} style={{ padding: 0, border: 'none' }}>
                      <div style={{ height: `${offsetY}px` }} />
                    </td>
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
                    pendingValues={pendingValuesOf(pending, row, keyColumns)}
                    isDeleted={isRowDeleted(pending, row, keyColumns)}
                    columnWidths={columnWidths}
                    onOpenViewer={handleOpenViewer}
                  />
                ))}

                {/* Spacer Bottom para Virtualização */}
                {isVirtual && bottomSpacerHeight > 0 && (
                  <tr style={{ height: `${bottomSpacerHeight}px` }}>
                    <td colSpan={columnCount} style={{ padding: 0, border: 'none' }}>
                      <div style={{ height: `${bottomSpacerHeight}px` }} />
                    </td>
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
          onOpenViewer={handleOpenViewer}
          onDeleteRow={onDeleteRow}
        />
      )}

      {viewerCell && (
        <CellViewerModal
          isOpen={Boolean(viewerCell)}
          onClose={() => setViewerCell(null)}
          columnName={viewerCell.column}
          value={viewerCell.value}
          rowIndex={viewerCell.rowIndex}
          dataType={viewerCell.dataType}
          onCopyCell={onCopyCell}
        />
      )}
    </div>
  );
};
