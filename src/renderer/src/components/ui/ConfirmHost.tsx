import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (accepted: boolean) => void;
}

const listeners = new Set<(req: ConfirmRequest) => void>();

export function requestConfirm(options: { title: string; message: string; confirmLabel?: string; cancelLabel?: string }): Promise<boolean> {
  return new Promise((resolve) => {
    listeners.forEach((cb) => cb({ ...options, resolve }));
  });
}

export const ConfirmHost: React.FC = () => {
  const [req, setReq] = useState<ConfirmRequest | null>(null);

  useEffect(() => {
    const listener = (next: ConfirmRequest) => setReq(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  if (!req) return null;

  const close = (result: boolean) => {
    req.resolve(result);
    setReq(null);
  };

  return (
    <Modal open onClose={() => close(false)} ariaLabel={req.title} panelClassName="max-w-md w-full p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground">{req.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{req.message}</p>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => close(false)}
          className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
        >
          {req.cancelLabel || 'Cancelar'}
        </button>
        <button
          type="button"
          onClick={() => close(true)}
          className="px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 cursor-pointer"
        >
          {req.confirmLabel || 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
};
