import React from 'react';
import { ConfirmDialog } from '../../ui/ConfirmDialog';

interface ClearLogFileModalProps {
  filePath: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ClearLogFileModal: React.FC<ClearLogFileModalProps> = ({ filePath, onCancel, onConfirm }) => (
  <ConfirmDialog
    open
    tone="danger"
    title="Limpar Arquivo no Disco?"
    message={
      'Ação destrutiva no sistema de arquivos. Deseja realmente zerar o conteúdo do arquivo físico abaixo? ' +
      'O log será esvaziado para permitir testar uma nova execução do serviço do zero:'
    }
    details={filePath}
    confirmLabel="Sim, Zerar Arquivo"
    onCancel={onCancel}
    onConfirm={onConfirm}
  />
);
