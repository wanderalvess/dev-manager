import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

type Listener = (toast: ToastItem) => void;

const listeners = new Set<Listener>();

/**
 * Dispara um toast global, visível em qualquer aba do app (não precisa estar na
 * página que originou o evento). Usado para notificar resultados de tarefas em
 * segundo plano, como backups agendados.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function showToast(message: string, variant: ToastVariant = 'success'): void {
  const toast: ToastItem = { id: `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`, message, variant };
  listeners.forEach((listener) => listener(toast));
}

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 5000,
  error: 10000,
  info: 7000
};

export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener: Listener = (toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, AUTO_DISMISS_MS[toast.variant]);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-2 p-3 rounded-xl border shadow-2xl text-xs animate-fade-in ${
            toast.variant === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
              : toast.variant === 'info'
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
          }`}
        >
          {toast.variant === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : toast.variant === 'info' ? (
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 break-words">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
