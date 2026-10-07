import React from 'react';
import { Search, X, Filter, FilterX, Plus, Pencil } from 'lucide-react';

interface ResultsGridToolbarProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  isEditable: boolean;
  editableTableName: string | null;
  isAddingRow: boolean;
  isMutatingRow: boolean;
  onStartAddingRow: () => void;
  isVirtual: boolean;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  visibleRowCount: number;
  totalRowCount: number;
  pendingCount?: number;
  onApplyPending?: () => void;
  onDiscardPending?: () => void;
}

/** Barra de Filtro Rápido Superior (estilo DBeaver) */
export const ResultsGridToolbar: React.FC<ResultsGridToolbarProps> = ({
  searchTerm,
  setSearchTerm,
  isEditable,
  editableTableName,
  isAddingRow,
  isMutatingRow,
  onStartAddingRow,
  isVirtual,
  hasActiveFilters,
  onClearAllFilters,
  visibleRowCount,
  totalRowCount,
  pendingCount = 0,
  onApplyPending,
  onDiscardPending
}) => (
  <div className="px-3 py-2 bg-muted/40 border-b border-border/70 flex items-center justify-between gap-3 shrink-0 flex-wrap">
    <div className="relative flex-1 min-w-[240px] max-w-xl">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Filtrar resultados... (digite qualquer termo para buscar em todas as colunas)"
        className="w-full pl-8 pr-7 py-1 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary font-sans"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => setSearchTerm('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
          title="Limpar busca"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>

    <div className="flex items-center space-x-2 text-xs">
      {pendingCount > 0 && (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40" role="status">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">
            {pendingCount} {pendingCount === 1 ? 'alteração pendente' : 'alterações pendentes'}
          </span>
          <button
            type="button"
            onClick={onApplyPending}
            disabled={isMutatingRow}
            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
            title="Gravar as alterações no banco (na transação do editor)"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={onDiscardPending}
            disabled={isMutatingRow}
            className="px-2 py-0.5 rounded bg-card hover:bg-muted border border-border text-foreground text-[11px] font-semibold cursor-pointer disabled:opacity-50"
            title="Descartar as alterações pendentes"
          >
            Descartar
          </button>
        </span>
      )}
      {isEditable ? (
        <>
          <span
            className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
            title={`Editável: duplo-clique numa célula para editar, botão direito para marcar a linha para exclusão. As alterações só vão ao banco em Aplicar. Tabela: ${editableTableName}`}
          >
            <Pencil className="w-3 h-3" />
            <span>Editável</span>
          </span>
          <button
            type="button"
            onClick={onStartAddingRow}
            disabled={isAddingRow || isMutatingRow}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Inserir uma nova linha nesta tabela"
          >
            <Plus className="w-3 h-3" />
            <span>Nova linha</span>
          </button>
        </>
      ) : (
        <span
          className="hidden sm:inline text-2xs text-muted-foreground/70"
          title="Edição inline só fica disponível para um SELECT * simples de uma única tabela (ex: clique numa tabela na barra lateral)."
        >
          Somente leitura
        </span>
      )}
      {isVirtual && (
        <span className="px-2 py-0.5 rounded text-2xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Virtual scrolling ativo para rolagem a 60 FPS">
          Virtual 60 FPS
        </span>
      )}
      {hasActiveFilters ? (
        <>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Filter className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>
              {visibleRowCount} de {totalRowCount} linha(s)
            </span>
          </span>
          <button
            type="button"
            onClick={onClearAllFilters}
            className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
            title="Remover todos os filtros e ordenações da tabela"
          >
            <FilterX className="w-3 h-3" />
            <span>Limpar filtros</span>
          </button>
        </>
      ) : (
        <span className="text-muted-foreground text-[11px] font-mono">
          {visibleRowCount} linha(s)
        </span>
      )}
    </div>
  </div>
);
