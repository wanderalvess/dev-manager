import React from 'react';
import { FolderPlus, Search, RefreshCw } from 'lucide-react';

interface ContainersActionsBarProps {
  containersCount: number;
  onOpenSaveEnvModal: () => void;
  filter: string;
  onFilterChange: (value: string) => void;
  isLoading: boolean;
  onRefreshData: () => void;
}

/** Grupo 2: ações de execução e utilitários. */
export const ContainersActionsBar: React.FC<ContainersActionsBarProps> = ({
  containersCount,
  onOpenSaveEnvModal,
  filter,
  onFilterChange,
  isLoading,
  onRefreshData
}) => (
  <div className="flex items-center gap-2">
    {/* Criar / Salvar Grupo */}
    <button
      onClick={onOpenSaveEnvModal}
      disabled={containersCount === 0}
      title="Criar novo grupo de containers ou salvar seleção"
      className="h-10 flex items-center gap-1.5 px-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-[10px] text-sm font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <FolderPlus className="w-4 h-4" />
      <span className="hidden lg:inline">Novo grupo</span>
    </button>

    {/* Campo de Busca */}
    <div className="relative">
      <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
      <input
        type="text"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder="Filtrar containers"
        className="h-10 bg-card border border-input rounded-[10px] pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-44 transition"
      />
    </div>

    {/* Botão Atualizar */}
    <button
      onClick={onRefreshData}
      disabled={isLoading}
      title="Atualizar lista de containers" aria-label="Atualizar lista de containers"
      className="h-10 w-10 flex items-center justify-center bg-card hover:bg-muted border border-border text-muted-foreground hover:text-foreground rounded-[10px] transition disabled:opacity-50 cursor-pointer"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
    </button>
  </div>
);
