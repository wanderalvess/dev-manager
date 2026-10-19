import React from 'react';
import { FilterX } from 'lucide-react';
import type { DatabaseConnectionConfig } from '../../../../../shared/types';
import { EmptyResultNotice } from './EmptyResultNotice';

export interface ResultsGridEmptyStateProps {
  columnCount: number;
  totalRows: number;
  onClearAllFilters: () => void;
  /** Tabela do SELECT de tabela única e conexão da aba; habilitam a estimativa de linhas no resultado vazio. */
  tableName?: string | null;
  connection?: DatabaseConnectionConfig | null;
}

export const ResultsGridEmptyState: React.FC<ResultsGridEmptyStateProps> = ({
  columnCount,
  totalRows,
  onClearAllFilters,
  tableName = null,
  connection = null
}) => {
  return (
    <tr className="bg-background">
      <td colSpan={columnCount} className="py-12 text-center text-muted-foreground text-xs font-sans">
        {totalRows === 0 ? (
          <EmptyResultNotice tableName={tableName} connection={connection} />
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <FilterX className="w-8 h-8 opacity-30 text-warning" />
            <p className="font-semibold text-foreground">Nenhum resultado corresponde aos filtros aplicados.</p>
            <span className="text-2xs opacity-70">Tente ajustar o termo de busca ou filtros de coluna.</span>
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
  );
};
