import React from 'react';
import type { ContainerEnvironment } from '../../../../../shared/types';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

export interface EnvironmentDeleteConfirmModalProps {
  environment: ContainerEnvironment | null;
  onClose: () => void;
  onConfirm: (environment: ContainerEnvironment) => void;
}

export const EnvironmentDeleteConfirmModal: React.FC<EnvironmentDeleteConfirmModalProps> = ({ environment, onClose, onConfirm }) => {
  if (!environment) return null;

  return (
    <ConfirmDialog
      open
      tone="danger"
      title="Excluir Ambiente"
      message={`Tem certeza que deseja excluir o ambiente ${environment.name}? Esta ação não pode ser desfeita.`}
      confirmLabel="Excluir Ambiente"
      onCancel={onClose}
      onConfirm={() => onConfirm(environment)}
    />
  );
};
