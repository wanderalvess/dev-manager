import React from 'react';
import { Trash2, RotateCw } from 'lucide-react';

export interface ContainerPruneModalProps {
  isOpen: boolean;
  stoppedCount: number;
  isPruning: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ContainerPruneModal: React.FC<ContainerPruneModalProps> = ({
  isOpen,
  stoppedCount,
  isPruning,
  onClose,
  onConfirm
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 animate-fade-in space-y-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">Limpar Containers Parados</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tem certeza que deseja remover todos os <strong className="text-foreground">{stoppedCount}</strong> containers parados? Containers em execução não serão afetados.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPruning}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isPruning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{isPruning ? 'Limpando...' : 'Confirmar Limpeza'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
