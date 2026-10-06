import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';
import type { ConfirmOptions, ConfirmTone } from './confirmService';

const TONE_STYLE: Record<ConfirmTone, { modal: 'danger' | 'warning' | 'default'; iconBox: string; button: string }> = {
  danger: {
    modal: 'danger',
    iconBox: 'bg-rose-500/10 border-rose-500/30 text-rose-500',
    button: 'bg-rose-600 hover:bg-rose-500 text-white'
  },
  warning: {
    modal: 'warning',
    iconBox: 'bg-amber-500/10 border-amber-500/30 text-amber-500',
    button: 'bg-amber-600 hover:bg-amber-500 text-white'
  },
  primary: {
    modal: 'default',
    iconBox: 'bg-primary/10 border-primary/30 text-primary',
    button: 'bg-primary hover:bg-primary/90 text-primary-foreground'
  }
};

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmação padrão: título, mensagem, detalhes opcionais e os botões Cancelar / Confirmar. */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  details,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  hideCancel = false,
  confirmDisabled = false,
  tone = 'primary',
  onConfirm,
  onCancel
}) => {
  const style = TONE_STYLE[tone];
  const Icon = tone === 'primary' ? HelpCircle : AlertTriangle;

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="md"
      tone={style.modal}
      role="alertdialog"
      title={title}
      description={message}
      icon={
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center ${style.iconBox}`}>
          <Icon className="w-5 h-5" />
        </div>
      }
      footer={
        <>
          {!hideCancel && (
            <button
              type="button"
              onClick={onCancel}
              data-autofocus
              className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            data-autofocus={hideCancel ? true : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${style.button} disabled:opacity-50`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {details ? <div className="pb-2 text-[11px] text-muted-foreground font-mono bg-muted p-2 rounded border border-border/50 break-all">{details}</div> : null}
    </Modal>
  );
};
