import React from 'react';
import { FilterX } from 'lucide-react';

export interface ResultsGridEmptyStateProps {
  columnCount: number;
  totalRows: number;
  onClearAllFilters: () => void;
}

export const ResultsGridEmptyState: React.FC<ResultsGridEmptyStateProps> = ({
  columnCount,
  totalRows,
  onClearAllFilters
}) => {
  return (
    <tr className="bg-background">
      <td colSpan={columnCount} className="py-12 text-center text-muted-foreground text-xs font-sans">
        {totalRows === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <FilterX className="w-8 h-8 opacity-30 text-info" />
            <p className="font-semibold text-foreground">A consulta foi executada, mas não retornou nenhuma linha.</p>
            <span className="text-2xs opacity-70 max-w-md">
              A tabela pode estar vazia, o WHERE pode não ter correspondência, ou o usuário da conexão pode não ter
              permissão de leitura nas linhas (por exemplo, políticas de segurança por linha).
            </span>
          </div>
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
