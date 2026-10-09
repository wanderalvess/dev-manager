import React from 'react';
import { Play, Square, RotateCw, FolderPlus, X, CheckSquare } from 'lucide-react';

export interface ContainerBatchBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  isAllSelected: boolean;
  onToggleSelectAll: () => void;
  onClearSelection: () => void;
  onBatchStart: () => void;
  onBatchStop: () => void;
  onBatchRestart: () => void;
  onCreateGroupFromSelection: () => void;
  isExecutingBatch: boolean;
  batchActionType?: 'start' | 'stop' | 'restart' | null;
}

export const ContainerBatchBar: React.FC<ContainerBatchBarProps> = ({
  selectedCount,
  totalFilteredCount,
  isAllSelected,
  onToggleSelectAll,
  onClearSelection,
  onBatchStart,
  onBatchStop,
  onBatchRestart,
  onCreateGroupFromSelection,
  isExecutingBatch,
  batchActionType
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="mx-4 my-1 p-2.5 bg-card/95 border border-primary/50 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-fade-in backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSelectAll}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-semibold hover:bg-muted text-foreground transition cursor-pointer"
          title={isAllSelected ? 'Desmarcar todos' : 'Selecionar todos os containers listados'}
        >
          <CheckSquare className="w-4 h-4 text-primary" />
          <span>{isAllSelected ? 'Desmarcar todos' : `Selecionar todos (${totalFilteredCount})`}</span>
        </button>

        <span className="h-4 w-px bg-border" />

        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-2xs font-mono">
            {selectedCount}
          </span>
          <span>{selectedCount === 1 ? 'container selecionado' : 'containers selecionados'}</span>
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Subir Selecionados */}
        <button
          type="button"
          onClick={onBatchStart}
          disabled={isExecutingBatch}
          title="Iniciar todos os containers selecionados"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {isExecutingBatch && batchActionType === 'start' ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Subir Selecionados</span>
        </button>

        {/* Parar Selecionados */}
        <button
          type="button"
          onClick={onBatchStop}
          disabled={isExecutingBatch}
          title="Parar todos os containers selecionados"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted hover:bg-muted/70 text-foreground rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer disabled:opacity-50 active:scale-98"
        >
          {isExecutingBatch && batchActionType === 'stop' ? (
            <RotateCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Square className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Parar</span>
        </button>

        {/* Reiniciar Selecionados */}
        <button
          type="button"
          onClick={onBatchRestart}
          disabled={isExecutingBatch}
          title="Reiniciar todos os containers selecionados"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 active:scale-98"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isExecutingBatch && batchActionType === 'restart' ? 'animate-spin text-primary' : ''}`} />
          <span>Reiniciar</span>
        </button>

        {/* Criar Grupo com os Selecionados */}
        <button
          type="button"
          onClick={onCreateGroupFromSelection}
          disabled={isExecutingBatch}
          title="Salvar esses containers selecionados em um grupo permanente"
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Criar Grupo</span>
        </button>

        {/* Cancelar Seleção */}
        <button
          type="button"
          onClick={onClearSelection}
          disabled={isExecutingBatch}
          title="Limpar seleção" aria-label="Limpar seleção"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
