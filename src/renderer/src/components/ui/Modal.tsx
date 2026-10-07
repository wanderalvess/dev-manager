import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { FOCUSABLE_SELECTOR, nextFocusIndex } from '../../utils/focusTrapUtils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';
export type ModalTone = 'default' | 'danger' | 'warning';

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw]'
};

const TONE_BORDER: Record<ModalTone, string> = {
  default: 'border-border',
  danger: 'border-rose-500/40',
  warning: 'border-amber-500/40'
};

/** Pilha de modais abertos: o Esc fecha só o de cima (um modal pode abrir outro por cima). */
const openModals: symbol[] = [];

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  size?: ModalSize;
  tone?: ModalTone;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Ícone ao lado do título. */
  icon?: React.ReactNode;
  /** Rodapé fixo (normalmente os botões de ação). */
  footer?: React.ReactNode;
  /** Falso para ações que não podem ser descartadas por Esc, clique fora ou no X (ex.: operação em andamento). */
  dismissible?: boolean;
  /** `alertdialog` para confirmações: o leitor de tela lê a mensagem junto com o título. */
  role?: 'dialog' | 'alertdialog';
  /** Quando o modal precisa ficar acima de outras camadas. */
  zIndexClass?: string;
  /** Esc fecha? Padrão: o mesmo de `dismissible`. Falso em editores, para não descartar o que foi digitado. */
  closeOnEscape?: boolean;
  /** Clique no fundo fecha? Padrão: o mesmo de `dismissible`. */
  closeOnBackdrop?: boolean;
  /**
   * Modo "casca": o modal só dá o comportamento (portal, fundo, Esc, foco, ARIA) e entrega `children` direto dentro
   * de um painel estilizado por `panelClassName`. Serve para os modais com layout próprio (cabeçalho, abas, rodapé).
   */
  bare?: boolean;
  panelClassName?: string;
  /** Nome acessível do diálogo quando não há `title` (modo `bare`). */
  ariaLabel?: string;
}

/**
 * Casca única dos diálogos do app: portal no `body`, fundo escurecido, Esc, clique fora, foco preso dentro do
 * diálogo (e devolvido a quem o abriu ao fechar) e os atributos ARIA. Modais novos devem usar este componente em
 * vez de repetir `fixed inset-0` à mão.
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  size = 'md',
  tone = 'default',
  title,
  description,
  icon,
  footer,
  dismissible = true,
  role = 'dialog',
  zIndexClass = 'z-50',
  closeOnEscape = dismissible,
  closeOnBackdrop = dismissible,
  bare = false,
  panelClassName = '',
  ariaLabel
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const token = Symbol('modal');
    openModals.push(token);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    // Modo `bare` sem nome explícito: usa o primeiro título do conteúdo como nome acessível do diálogo
    if (panel && bare && !ariaLabel && !panel.hasAttribute('aria-labelledby')) {
      const heading = panel.querySelector<HTMLElement>('h1, h2, h3, h4');
      if (heading) {
        if (!heading.id) heading.id = titleId;
        panel.setAttribute('aria-labelledby', heading.id);
      }
    }
    // Um campo com autoFocus (aplicado na montagem, antes deste efeito) já tem o foco: não o tira dele
    const alreadyFocused = !!panel && panel.contains(document.activeElement) && document.activeElement !== panel;

    const focusables = () => (panel ? Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : []);
    // Foco inicial: o campo marcado com data-autofocus ou o primeiro item; sem itens, o próprio painel
    const initial = panel?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? panel;
    if (!alreadyFocused) initial?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (openModals[openModals.length - 1] !== token) return;
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const index = items.indexOf(document.activeElement as HTMLElement);
      const next = nextFocusIndex(index, items.length, e.shiftKey);
      // Só intervém nas pontas; no meio o Tab nativo já anda certo
      const atEdge = e.shiftKey ? index <= 0 : index === items.length - 1;
      if (atEdge || index < 0) {
        e.preventDefault();
        items[next]?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const at = openModals.indexOf(token);
      if (at >= 0) openModals.splice(at, 1);
      if (previouslyFocused && document.contains(previouslyFocused)) previouslyFocused.focus();
    };
  }, [open, closeOnEscape, bare, ariaLabel, titleId]);

  if (!open) return null;

  const hasHeader = Boolean(title || description || icon);

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs`}
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={
          bare
            ? `${panelClassName} outline-none`
            : `bg-card border ${TONE_BORDER[tone]} rounded-xl shadow-2xl w-full ${SIZE_CLASS[size]} max-h-[90vh] flex flex-col outline-none animate-fade-in`
        }
      >
        {bare && children}
        {!bare && hasHeader && (
          <div className="flex items-start gap-3 px-5 pt-5 pb-3 shrink-0">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="flex-1 min-w-0">
              {title && (
                <h3 id={titleId} className="text-sm font-bold text-foreground">
                  {title}
                </h3>
              )}
              {description && (
                <p id={descriptionId} className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                  {description}
                </p>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
        {!bare && children !== undefined && children !== null && <div className="px-5 py-2 overflow-auto min-h-0">{children}</div>}
        {!bare && footer && <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-border shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
