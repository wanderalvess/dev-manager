import React from 'react';
import { Network, RotateCw, Play, FolderPlus, Archive, Sliders, Search, RefreshCw } from 'lucide-react';

interface ContainersActionsBarProps {
  sequenceRunning: boolean;
  containersCount: number;
  onStartWinThorSequence: () => void;
  onOpenSaveEnvModal: () => void;
  onOpenSnapshotsModal: () => void;
  onOpenInfrModal: () => void;
  showTopologyBus: boolean;
  onToggleTopologyBus: () => void;
  filter: string;
  onFilterChange: (value: string) => void;
  isLoading: boolean;
  onRefreshData: () => void;
}

/** Grupo 2: ações de execução e utilitários. */
export const ContainersActionsBar: React.FC<ContainersActionsBarProps> = ({
  sequenceRunning,
  containersCount,
  onStartWinThorSequence,
  onOpenSaveEnvModal,
  onOpenSnapshotsModal,
  onOpenInfrModal,
  showTopologyBus,
  onToggleTopologyBus,
  filter,
  onFilterChange,
  isLoading,
  onRefreshData
}) => (
  <div className="flex items-center gap-2">
    {/* Botão de Orquestração WinThor */}
    <button
      onClick={onStartWinThorSequence}
      disabled={sequenceRunning || containersCount === 0}
      title="Inicia sequencialmente Oracle XE -> WTA -> WSH"
      className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-98"
    >
      {sequenceRunning ? (
        <RotateCw className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Play className="w-3.5 h-3.5 fill-current" />
      )}
      <span>Subir WinThor</span>
    </button>

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

    {/* Snapshots WSL */}
    <button
      onClick={onOpenSnapshotsModal}
      title="Gerenciamento de Snapshots .tar do WSL (Importar / Exportar / Remover)"
      className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-2xs cursor-pointer active:scale-98"
    >
      <Archive className="w-3.5 h-3.5 text-primary" />
      <span className="hidden lg:inline">Snapshots WSL</span>
    </button>

    {/* Assistente de Bootstrap INFR-Docker */}
    <button
      onClick={onOpenInfrModal}
      title="Assistente de Bootstrap INFR-Docker (Setup Oracle XE, WTA, WSH)"
      className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95"
    >
      <Sliders className="w-3.5 h-3.5 text-orange-500" />
      <span className="hidden lg:inline">Assistente INFR</span>
    </button>

    {/* Alternar Barramento de Topologia */}
    <button
      type="button"
      onClick={onToggleTopologyBus}
      title={showTopologyBus ? 'Ocultar barramento de topologia WinThor' : 'Exibir barramento de topologia WinThor'}
      className={`flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition shadow-xs cursor-pointer active:scale-95 ${
        showTopologyBus
          ? 'bg-primary/10 text-primary border-primary/30'
          : 'bg-card hover:bg-muted text-muted-foreground border-border/80'
      }`}
    >
      <Network className="w-3.5 h-3.5" />
      <span className="hidden xl:inline">{showTopologyBus ? 'Topologia ON' : 'Topologia OFF'}</span>
    </button>

    {/* Campo de Busca */}
    <div className="relative">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
      <input
        type="text"
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        placeholder="Buscar..."
        className="bg-card border border-border/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-36 transition"
      />
    </div>

    {/* Botão Atualizar */}
    <button
      onClick={onRefreshData}
      disabled={isLoading}
      title="Atualizar lista de containers"
      className="p-1.5 bg-card hover:bg-muted border border-border/80 text-muted-foreground hover:text-foreground rounded-lg text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
    </button>
  </div>
);
