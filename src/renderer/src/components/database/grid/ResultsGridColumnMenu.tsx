import React from 'react';
import { EscapeToClose } from '../../ui/EscapeToClose';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { omitColumnFilter } from '../../../utils/resultsGridUtils';

interface ResultsGridColumnMenuProps {
  column: string;
  columnFilters: Record<string, string>;
  setColumnFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onToggleSort: (column: string) => void;
  onClose: () => void;
  hasColFilter: boolean;
  isSorted: boolean;
}

/** Menu Popover da Coluna */
export const ResultsGridColumnMenu: React.FC<ResultsGridColumnMenuProps> = ({
  column: col,
  columnFilters,
  setColumnFilters,
  onToggleSort,
  onClose,
  hasColFilter,
  isSorted
}) => (
  <>
    <div className="fixed inset-0 z-20 cursor-default" onClick={onClose} />
    <EscapeToClose onEscape={onClose} />
    <div className="absolute left-0 top-full mt-1 w-64 bg-popover text-popover-foreground rounded-lg shadow-xl border border-border p-2.5 z-30 font-sans text-xs space-y-2">
      <div className="font-bold text-2xs text-muted-foreground pb-1 border-b border-border flex items-center justify-between">
        <span>Opções: {col}</span>
        <button onClick={onClose} className="hover:text-foreground text-muted-foreground cursor-pointer">
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => {
            onToggleSort(col);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-accent transition text-left cursor-pointer"
        >
          <ArrowUp className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Order by {col} ASC</span>
        </button>
        <button
          type="button"
          onClick={() => {
            onToggleSort(col);
            onClose();
          }}
          className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-accent transition text-left cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>Order by {col} DESC</span>
        </button>
      </div>

      <div className="pt-1.5 border-t border-border space-y-1.5">
        <label className="text-2xs font-semibold text-muted-foreground block">
          Filtrar por valor nesta coluna:
        </label>
        <div className="relative">
          <input
            type="text"
            value={columnFilters[col] || ''}
            onChange={(e) => {
              const val = e.target.value;
              setColumnFilters((prev) => ({ ...prev, [col]: val }));
            }}
            placeholder="Ex: texto, [null], !null..."
            className="w-full px-2 py-1 text-xs bg-background border border-border rounded font-mono"
            autoFocus
          />
          {columnFilters[col] && (
            <button
              type="button"
              onClick={() => setColumnFilters((prev) => omitColumnFilter(prev, col))}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="pt-1.5 border-t border-border flex items-center justify-between text-2xs">
        <button
          type="button"
          onClick={() => {
            setColumnFilters((prev) => ({ ...prev, [col]: '[null]' }));
            onClose();
          }}
          className="text-muted-foreground hover:text-foreground underline text-2xs cursor-pointer"
        >
          Apenas [NULL]
        </button>

        {(hasColFilter || isSorted) && (
          <button
            type="button"
            onClick={() => {
              setColumnFilters((prev) => omitColumnFilter(prev, col));
              onClose();
            }}
            className="text-rose-500 hover:text-rose-600 font-semibold text-2xs cursor-pointer"
          >
            Limpar coluna
          </button>
        )}
      </div>
    </div>
  </>
);
