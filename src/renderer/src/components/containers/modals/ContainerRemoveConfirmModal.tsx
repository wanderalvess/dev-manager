import React from 'react';
import { Trash2 } from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';

export interface ContainerRemoveConfirmModalProps {
  container: DockerContainerInfo | null;
  onClose: () => void;
  onConfirm: (container: DockerContainerInfo) => void;
}

export const ContainerRemoveConfirmModal: React.FC<ContainerRemoveConfirmModalProps> = ({
  container,
  onClose,
  onConfirm
}) => {
  if (!container) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-5 animate-fade-in space-y-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">Remover Container</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tem certeza que deseja remover o container{' '}
              <span className="font-semibold text-foreground font-mono">
                {container.names.replace(/^\//, '')}
              </span>
              ? Esta ação não pode ser desfeita.
            </p>
            <div className="mt-2 text-[11px] text-muted-foreground font-mono bg-muted p-2 rounded border border-border/50">
              ID: {container.id.slice(0, 12)} | Imagem: {container.image}
            </div>
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
            onClick={() => onConfirm(container)}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-2xs cursor-pointer flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remover Container</span>
          </button>
        </div>
      </div>
    </div>
  );
};
