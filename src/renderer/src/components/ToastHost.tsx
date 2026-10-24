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

// Fundo opaco (cor do card com um toque da cor do tipo): o toast flutua sobre a tela e, translúcido, o texto se perdia no conteúdo.
const TOAST_STYLE: Record<ToastVariant, string> = {
  success:
    'bg-[color-mix(in_srgb,var(--color-success)_14%,var(--color-card))] border-success/40 border-l-success',
  info: 'bg-[color-mix(in_srgb,var(--color-primary)_14%,var(--color-card))] border-primary/40 border-l-primary',
  error: 'bg-[color-mix(in_srgb,var(--color-danger)_14%,var(--color-card))] border-danger/40 border-l-danger'
};

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
    <div className="fixed bottom-4 right-4 z-100 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.variant === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 p-3 rounded-xl border border-l-4 shadow-lg text-xs text-foreground animate-fade-in ${TOAST_STYLE[toast.variant]}`}
        >
          {toast.variant === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-success" />
          ) : toast.variant === 'info' ? (
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-danger" />
          )}
          <span className="flex-1 wrap-break-word whitespace-pre-line">{toast.message}</span>
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
