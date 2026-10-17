import React from 'react';
import { X } from 'lucide-react';
import { RESULTS_GRID_ROW_HEIGHT } from '../../../utils/resultsGridUtils';

interface ResultsGridPendingInsertsProps {
  inserts: Record<string, any>[];
  columns: string[];
  columnWidths?: Record<string, number>;
  onUnstageInsert?: (index: number) => void;
}

export const ResultsGridPendingInserts: React.FC<ResultsGridPendingInsertsProps> = ({
  inserts,
  columns,
  columnWidths,
  onUnstageInsert
}) => {
  if (inserts.length === 0) return null;

  return (
    <>
      {inserts.map((values, i) => (
        <tr key={`new_${i}`} className="bg-success/10" style={{ height: `${RESULTS_GRID_ROW_HEIGHT}px` }}>
          <td className="px-2 py-1.5 text-center border-r border-border/30 w-12 min-w-[48px] max-w-[48px]">
            <button
              type="button"
              onClick={() => onUnstageInsert?.(i)}
              className="text-success hover:text-danger cursor-pointer"
              title="Remover esta nova linha pendente"
              aria-label="Remover nova linha pendente"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </td>
          {columns.map((col) => {
            const width = columnWidths?.[col];
            const style = width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : undefined;
            return (
              <td
                key={col}
                style={style}
                className={`px-3 py-1.5 border-r border-border/30 whitespace-nowrap truncate text-success ${!width ? 'min-w-[120px] max-w-md' : ''}`}
                title="Nova linha (ainda não gravada)"
              >
                {values[col] === null || values[col] === undefined ? <span className="opacity-50">NULL</span> : String(values[col])}
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
};
