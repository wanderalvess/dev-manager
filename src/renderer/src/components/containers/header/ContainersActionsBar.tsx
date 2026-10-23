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
      className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98"
    >
      <FolderPlus className="w-3.5 h-3.5 text-primary" />
      <span className="hidden lg:inline">Novo Grupo</span>
    </button>

    {/* Campo de Busca */}
    <div className="relative">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
      <input
        type="text"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder="Buscar..."
        className="bg-card border border-border/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary w-36 transition"
      />
    </div>

    {/* Botão Atualizar */}
    <button
      onClick={onRefreshData}
      disabled={isLoading}
      title="Atualizar lista de containers" aria-label="Atualizar lista de containers"
      className="p-1.5 bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground rounded-lg text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
    </button>
  </div>
);
