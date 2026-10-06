import { useMemo, useState } from 'react';
import type { QueryResult } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { detectColumnDataTypes, processQueryRows, hasActiveQueryFilters } from '../../utils/databaseResultsUtils';
import { formatCellForCopy } from '../../utils/databaseCsvUtils';
import {
  EXPORT_FORMATS,
  buildCsvContent,
  buildJsonContent,
  buildXlsx,
  downloadBlob,
  exportFileName,
  type ExportFormat
} from '../../utils/databaseExportUtils';
import type { CellContextMenuState, SortConfig } from '../../utils/dbPageTypes';

/** Filtros, ordenação, seleção, menus, exportação CSV e cópia sobre o resultado atual. */
export function useDatabaseResultView(queryResult: QueryResult | null) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [activeColumnMenu, setActiveColumnMenu] = useState<string | null>(null);
  const [cellContextMenu, setCellContextMenu] = useState<CellContextMenuState | null>(null);
  const { copy: copyCellToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  // Detecção de tipo de dado por coluna (lógica pura em utils/databaseResultsUtils.ts)
  const columnDataTypes = useMemo<Record<string, 'number' | 'date' | 'boolean' | 'object' | 'string'>>(() => {
    if (!queryResult || !queryResult.columns || !queryResult.rows) return {};
    return detectColumnDataTypes(queryResult.columns, queryResult.rows);
  }, [queryResult]);

  // Linhas processadas com busca global, filtros por coluna e ordenação
  const processedRows = useMemo(
    () => processQueryRows(queryResult, { searchTerm, columnFilters, sortConfig, columnDataTypes }),
    [queryResult, searchTerm, columnFilters, sortConfig, columnDataTypes]
  );

  const hasActiveFilters = useMemo(
    () => hasActiveQueryFilters(searchTerm, sortConfig, columnFilters),
    [searchTerm, sortConfig, columnFilters]
  );

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
    setSelectedRowIndex(null);
    setActiveColumnMenu(null);
    setCellContextMenu(null);
  };

  const handleToggleSort = (column: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      return null;
    });
  };

  const handleFilterByCellValue = (col: string, val: any) => {
    const filterText = val === null || val === undefined ? '[null]' : String(val);
    setColumnFilters((prev) => ({
      ...prev,
      [col]: filterText
    }));
    setCellContextMenu(null);
  };

  /** Exporta as linhas exibidas (já com busca, filtros e ordenação aplicados) no formato escolhido. */
  const handleExport = (format: ExportFormat) => {
    if (!queryResult || !queryResult.columns || processedRows.length === 0) return;
    const columns = queryResult.columns;
    const numeric = new Set(columns.filter((c) => columnDataTypes[c] === 'number'));
    const meta = EXPORT_FORMATS.find((f) => f.id === format);
    if (!meta) return;

    let content: BlobPart;
    if (format === 'xlsx') content = buildXlsx(columns, processedRows, { numericColumns: numeric }) as BlobPart;
    else if (format === 'json') content = buildJsonContent(columns, processedRows);
    else if (format === 'csv-br') content = buildCsvContent(columns, processedRows, { delimiter: ';', bom: true, decimalCommaColumns: numeric });
    else content = buildCsvContent(columns, processedRows);

    downloadBlob(content, exportFileName(meta.extension), meta.mime);
  };

  const handleCopyCell = (text: any, cellKey?: string) => {
    copyCellToClipboard(formatCellForCopy(text), cellKey || 'Copiado!');
  };

  return {
    searchTerm,
    setSearchTerm,
    columnFilters,
    setColumnFilters,
    sortConfig,
    selectedRowIndex,
    setSelectedRowIndex,
    activeColumnMenu,
    setActiveColumnMenu,
    cellContextMenu,
    setCellContextMenu,
    copyCellToClipboard,
    copyFeedback,
    columnDataTypes,
    processedRows,
    hasActiveFilters,
    handleClearAllFilters,
    handleToggleSort,
    handleFilterByCellValue,
    handleExport,
    handleCopyCell
  };
}
