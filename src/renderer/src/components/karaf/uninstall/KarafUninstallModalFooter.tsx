import React from 'react';
import { RotateCw, Trash2 } from 'lucide-react';

interface KarafUninstallModalFooterProps {
  isUninstalling: boolean;
  confirmDisabled: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const KarafUninstallModalFooter: React.FC<KarafUninstallModalFooterProps> = ({
  isUninstalling,
  confirmDisabled,
  onClose,
  onConfirm
}) => (
  <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
    <button
      type="button"
      onClick={onClose}
      disabled={isUninstalling}
      className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
    >
      Cancelar
    </button>
    <button
      type="button"
      onClick={onConfirm}
      disabled={confirmDisabled}
      className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-75 disabled:cursor-wait rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
    >
      {isUninstalling ? (
        <>
          <RotateCw className="w-3.5 h-3.5 animate-spin text-white" />
          <span>Desinstalando...</span>
        </>
      ) : (
        <>
          <Trash2 className="w-3.5 h-3.5" />
          <span>Confirmar Desinstalação</span>
        </>
      )}
    </button>
  </div>
);
