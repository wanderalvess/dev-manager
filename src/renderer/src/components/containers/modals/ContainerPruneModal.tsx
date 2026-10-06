import React from 'react';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

export interface ContainerPruneModalProps {
  isOpen: boolean;
  stoppedCount: number;
  isPruning: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ContainerPruneModal: React.FC<ContainerPruneModalProps> = ({ isOpen, stoppedCount, isPruning, onClose, onConfirm }) => (
  <ConfirmDialog
    open={isOpen}
    tone="danger"
    title="Limpar Containers Parados"
    message={`Tem certeza que deseja remover todos os ${stoppedCount} containers parados? Containers em execução não serão afetados.`}
    confirmLabel={isPruning ? 'Limpando...' : 'Confirmar Limpeza'}
    confirmDisabled={isPruning}
    onCancel={onClose}
    onConfirm={onConfirm}
  />
);
