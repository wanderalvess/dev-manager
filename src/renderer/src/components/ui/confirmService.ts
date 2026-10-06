import type React from 'react';

export type ConfirmTone = 'danger' | 'warning' | 'primary';

export interface ConfirmOptions {
  title: string;
  /** Texto da pergunta; quebras de linha (`\n`) são respeitadas. */
  message: React.ReactNode;
  /** Bloco extra abaixo da mensagem (ex.: caminho do arquivo, lista de comandos). */
  details?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Só o botão de confirmação: para avisos que o usuário precisa ler, sem decisão a tomar (ver `showNotice`). */
  hideCancel?: boolean;
  /** Trava o botão de confirmar (ex.: operação em andamento). */
  confirmDisabled?: boolean;
  /** `danger` para o que apaga ou não tem volta; `warning` para o que pede atenção; `primary` para o resto. */
  tone?: ConfirmTone;
}

export interface ConfirmRequest {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
}

type ConfirmHandler = (request: ConfirmRequest) => void;

let handler: ConfirmHandler | null = null;

/** O `ConfirmHost` se registra aqui ao montar; só há um por app. */
export function registerConfirmHandler(next: ConfirmHandler): () => void {
  handler = next;
  return () => {
    if (handler === next) handler = null;
  };
}

/**
 * Pergunta ao usuário antes de uma ação e resolve `true` se ele confirmar. No lugar de `window.confirm`: o diálogo
 * segue o tema do app, tem foco e Esc tratados e não trava a janela. Sem host montado (testes), cai no `confirm` nativo.
 */
export function requestConfirm(options: ConfirmOptions): Promise<boolean> {
  if (!handler) {
    const text = typeof options.message === 'string' ? `${options.title}\n\n${options.message}` : options.title;
    if (options.hideCancel) {
      if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(text);
      return Promise.resolve(true);
    }
    return Promise.resolve(typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(text) : false);
  }
  const activeHandler = handler;
  return new Promise<boolean>((resolve) => activeHandler({ options, resolve }));
}

/** Aviso que o usuário precisa ler e reconhecer (um toast sumiria sozinho). Resolve quando ele clica em "Entendi". */
export async function showNotice(options: Omit<ConfirmOptions, 'hideCancel'>): Promise<void> {
  await requestConfirm({ confirmLabel: 'Entendi', tone: 'warning', ...options, hideCancel: true });
}
