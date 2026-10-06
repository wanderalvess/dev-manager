import React from 'react';
import type { DockerContainerInfo } from '../../../../../shared/types';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

export interface ContainerRemoveConfirmModalProps {
  container: DockerContainerInfo | null;
  onClose: () => void;
  onConfirm: (container: DockerContainerInfo) => void;
}

export const ContainerRemoveConfirmModal: React.FC<ContainerRemoveConfirmModalProps> = ({ container, onClose, onConfirm }) => {
  if (!container) return null;

  return (
    <ConfirmDialog
      open
      tone="danger"
      title="Remover Container"
      message={`Tem certeza que deseja remover o container ${container.names.replace(/^\//, '')}? Esta ação não pode ser desfeita.`}
      details={`ID: ${container.id.slice(0, 12)} | Imagem: ${container.image}`}
      confirmLabel="Remover Container"
      onCancel={onClose}
      onConfirm={() => onConfirm(container)}
    />
  );
};
