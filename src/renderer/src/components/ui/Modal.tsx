import React, { useEffect } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  bare?: boolean;
  placement?: 'center' | 'top';
  closeOnBackdrop?: boolean;
  ariaLabel?: string;
  panelClassName?: string;
  backdropClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  children,
  bare = false,
  placement = 'center',
  closeOnBackdrop = true,
  ariaLabel = 'Diálogo',
  panelClassName = 'bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg p-5',
  backdropClassName = 'bg-black/60 backdrop-blur-xs'
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 flex justify-center p-4 ${backdropClassName} ${
        placement === 'top' ? 'items-start pt-16' : 'items-center'
      }`}
    >
      <div className={bare ? panelClassName : `bg-card text-foreground border border-border rounded-2xl shadow-xl ${panelClassName}`}>
        {children}
      </div>
    </div>
  );
};
