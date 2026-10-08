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
}

const BADGE_BASE = 'px-1 py-0.2 rounded text-2xs font-mono font-bold border';

const DataTypeBadge: React.FC<{ dataType: ResultsGridDataType }> = ({ dataType }) => {
  // Indicador de Tipo de Dado
  if (dataType === 'number') {
    return <span className={`${BADGE_BASE} bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30`}>123</span>;
  }
  if (dataType === 'date') {
    return <span className={`${BADGE_BASE} bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30`}>📅</span>;
  }
  if (dataType === 'boolean') {
    return <span className={`${BADGE_BASE} bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30`}>0/1</span>;
  }
  if (dataType === 'object') {
    return <span className={`${BADGE_BASE} bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30`}>{'{ }'}</span>;
  }
  return <span className={`${BADGE_BASE} bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30`}>ABC</span>;
};

export const ResultsGridHeader: React.FC<ResultsGridHeaderProps> = ({
  columns,
  columnDataTypes,
  columnFilters,
  setColumnFilters,
  sortConfig,
  onToggleSort,
  activeColumnMenu,
  setActiveColumnMenu
}) => (
  <thead className="bg-slate-100 dark:bg-[#181F2E] sticky top-0 z-10 border-b border-border shadow-2xs">
    <tr>
      <th className="px-2.5 py-2 text-center text-2xs font-bold text-muted-foreground uppercase border-b border-r border-border/50 w-12 bg-slate-100 dark:bg-[#181F2E] select-none">
        #
      </th>
      {columns.map((col) => {
        const dType = columnDataTypes[col] || 'string';
        const isSorted = sortConfig?.column === col;
        const hasColFilter = Boolean(columnFilters[col]?.trim());
        const isMenuOpen = activeColumnMenu === col;

        return (
          <th
            key={col}
            className="px-2.5 py-1.5 text-left border-b border-r border-border/50 whitespace-nowrap bg-slate-100 dark:bg-[#181F2E] relative select-none group"
          >
            <div className="flex items-center justify-between gap-1.5">
              <div
                onClick={() => onToggleSort(col)}
                className="flex items-center space-x-1.5 cursor-pointer hover:text-primary transition flex-1 py-0.5"
                title={`Clique para ordenar por ${col} (ASC / DESC)`}
              >
                <DataTypeBadge dataType={dType} />

                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{col}</span>

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
                title={`Filtrar ou ordenar coluna ${col}`}
              >
                <Filter className="w-2.5 h-2.5" />
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
          </th>
        );
      })}
    </tr>
  </thead>
);
