import React, { useRef } from 'react';
import { FilterX } from 'lucide-react';
import { DatabaseConnectionConfig, QueryResult, TableColumnInfo } from '../../../../shared/types';
import { useVirtualScroll } from '../../hooks/useVirtualScroll';
import { useResultsGridEditing } from '../../hooks/database/useResultsGridEditing';
import { RESULTS_GRID_ROW_HEIGHT, computeBottomSpacerHeight } from '../../utils/resultsGridUtils';
import { ResultsGridStates } from './grid/ResultsGridStates';
import { ResultsGridToolbar } from './grid/ResultsGridToolbar';
import { ResultsGridHeader } from './grid/ResultsGridHeader';
import { ResultsGridNewRow } from './grid/ResultsGridNewRow';
import { ResultsGridRow } from './grid/ResultsGridRow';
import { ResultsGridContextMenu } from './grid/ResultsGridContextMenu';
import { EmptyResultNotice } from './grid/EmptyResultNotice';
import { X } from 'lucide-react';
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
            {pending.inserts.map((values, i) => (
              <tr key={`new_${i}`} className="bg-emerald-500/10" style={{ height: `${RESULTS_GRID_ROW_HEIGHT}px` }}>
                <td className="px-2 py-1.5 text-center border-r border-border/30">
                  <button
                    type="button"
                    onClick={() => onUnstageInsert?.(i)}
                    className="text-emerald-600 hover:text-rose-500 cursor-pointer"
                    title="Remover esta nova linha pendente"
                    aria-label="Remover nova linha pendente"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </td>
                {queryResult.columns.map((col) => (
                  <td key={col} className="px-3 py-1.5 border-r border-border/30 whitespace-nowrap max-w-xs truncate text-emerald-700 dark:text-emerald-300" title="Nova linha (ainda não gravada)">
                    {values[col] === null || values[col] === undefined ? <span className="opacity-50">NULL</span> : String(values[col])}
                  </td>
                ))}
              </tr>
            ))}
            {processedRows.length === 0 ? (
              <tr className="bg-background">
                <td colSpan={columnCount} className="py-12 text-center text-muted-foreground text-xs font-sans">
                  {queryResult.rows.length === 0 ? (
                    // A consulta rodou, mas o banco não devolveu linhas (tabela vazia, WHERE sem correspondência ou sem permissão de leitura)
                    <EmptyResultNotice tableName={editableTableName} connection={connection} />
                  ) : (
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
                  )}
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
                    pendingValues={pendingValuesOf(pending, row, keyColumns)}
                    isDeleted={isRowDeleted(pending, row, keyColumns)}
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
