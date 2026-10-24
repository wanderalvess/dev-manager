import React from 'react';
import { Filter, ArrowUp, ArrowDown } from 'lucide-react';
import type { ResultsGridDataType } from '../../../utils/resultsGridUtils';
import { ResultsGridColumnMenu } from './ResultsGridColumnMenu';

interface ResultsGridHeaderProps {
  columns: string[];
  columnDataTypes: Record<string, ResultsGridDataType>;
  columnFilters: Record<string, string>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  sortConfig: { column: string; direction: 'asc' | 'desc' } | null;
  onToggleSort: (column: string) => void;
  activeColumnMenu: string | null;
  setActiveColumnMenu: (col: string | null) => void;
  columnWidths?: Record<string, number>;
  onStartResize?: (column: string, e: React.MouseEvent, currentWidth?: number) => void;
  onExpandColumn?: (column: string) => void;
}

const BADGE_BASE = 'px-1 py-0.2 rounded text-2xs font-mono font-bold border';

const DataTypeBadge: React.FC<{ dataType: ResultsGridDataType }> = ({ dataType }) => {
  // Indicador de Tipo de Dado
  if (dataType === 'number') {
    return <span className={`${BADGE_BASE} bg-info/15 text-info border-info/30`}>123</span>;
  }
  if (dataType === 'date') {
    return <span className={`${BADGE_BASE} bg-primary/15 text-primary border-primary/30`}>📅</span>;
  }
  if (dataType === 'boolean') {
    return <span className={`${BADGE_BASE} bg-warning/15 text-warning border-warning/30`}>0/1</span>;
  }
  if (dataType === 'object') {
    return <span className={`${BADGE_BASE} bg-success/15 text-success border-success/30`}>{'{ }'}</span>;
  }
  return <span className={`${BADGE_BASE} bg-muted text-muted-foreground border-border`}>ABC</span>;
};

export const ResultsGridHeader: React.FC<ResultsGridHeaderProps> = ({
  columns,
  columnDataTypes,
  columnFilters,
  setColumnFilters,
  sortConfig,
  onToggleSort,
  activeColumnMenu,
  setActiveColumnMenu,
  columnWidths,
  onStartResize,
  onExpandColumn
}) => (
  <thead className="bg-muted sticky top-0 z-10 border-b border-border shadow-2xs">
    <tr>
      <th className="px-2.5 py-2 text-center text-xs font-semibold text-muted-foreground border-b border-r border-border/50 w-12 min-w-[48px] max-w-[48px] bg-muted select-none">
        #
      </th>
      {columns.map((col) => {
        const dType = columnDataTypes[col] || 'string';
        const isSorted = sortConfig?.column === col;
        const hasColFilter = Boolean(columnFilters[col]?.trim());
        const isMenuOpen = activeColumnMenu === col;
        const width = columnWidths?.[col];
        const style = width ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : undefined;

        return (
          <th
            key={col}
            style={style}
            className="px-2.5 py-1.5 text-left border-b border-r border-border/50 whitespace-nowrap bg-muted relative select-none group"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div
                onClick={() => onToggleSort(col)}
                className="flex items-center space-x-1.5 cursor-pointer hover:text-primary transition flex-1 py-0.5 min-w-0"
                title={`Clique para ordenar por ${col} (ASC / DESC)`}
              >
                <DataTypeBadge dataType={dType} />

                <span className="text-2xs font-bold text-foreground truncate">{col}</span>

                {isSorted && (
                  sortConfig?.direction === 'asc' ? (
                    <ArrowUp className="w-3 h-3 text-primary shrink-0" />
                  ) : (
                    <ArrowDown className="w-3 h-3 text-primary shrink-0" />
                  )
                )}
              </div>

              {/* Botão de Menu e Filtro da Coluna */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveColumnMenu(isMenuOpen ? null : col);
                }}
                className={`p-1 rounded transition cursor-pointer ${
                  hasColFilter
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground/50 hover:text-foreground hover:bg-muted/80 opacity-60 group-hover:opacity-100'
                }`}
                title={`Filtrar ou ordenar coluna ${col}`} aria-label={`Filtrar ou ordenar coluna ${col}`}
              >
                <Filter className="w-3 h-3" />
              </button>
            </div>

            {isMenuOpen && (
              <ResultsGridColumnMenu
                column={col}
                columnFilters={columnFilters}
                setColumnFilters={setColumnFilters}
                onToggleSort={onToggleSort}
                onClose={() => setActiveColumnMenu(null)}
                hasColFilter={hasColFilter}
                isSorted={isSorted}
              />
            )}

            {onStartResize && (
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  const thEl = e.currentTarget.parentElement;
                  onStartResize(col, e, thEl?.offsetWidth);
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onExpandColumn?.(col);
                }}
                className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-primary/70 active:bg-primary z-20 transition-colors select-none group-hover:bg-primary/20"
                title="Arraste para redimensionar (duplo-clique para expandir ou resetar)"
              />
            )}
          </th>
        );
      })}
    </tr>
  </thead>
);
