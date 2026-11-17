import React, { useEffect, useState } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { registerConfirmHandler, type ConfirmRequest } from './confirmService';

/**
 * Monta uma vez, na raiz do app, o diálogo que atende `requestConfirm`. Pedidos simultâneos entram numa fila:
 * o próximo só aparece depois de o atual ser respondido.
 */
export const ConfirmHost: React.FC = () => {
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);

  useEffect(() => registerConfirmHandler((request) => setQueue((prev) => [...prev, request])), []);

  const current = queue[0];
  if (!current) return null;

  const answer = (confirmed: boolean) => {
    current.resolve(confirmed);
    setQueue((prev) => prev.slice(1));
  };

  return <ConfirmDialog open {...current.options} onConfirm={() => answer(true)} onCancel={() => answer(false)} />;
};
