import React from 'react';
import { UploadCloud, RotateCw } from 'lucide-react';

interface KarafInstallModalFooterProps {
  isUpdate: boolean;
  isInstalling: boolean;
  canConfirm: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const KarafInstallModalFooter: React.FC<KarafInstallModalFooterProps> = ({
  isUpdate,
  isInstalling,
  canConfirm,
  onClose,
  onConfirm
}) => (
  <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-end space-x-2">
    <button
      type="button"
      onClick={onClose}
      disabled={isInstalling}
      className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-xl transition cursor-pointer"
    >
      Cancelar
    </button>
    <button
      type="button"
      onClick={onConfirm}
      disabled={isInstalling || !canConfirm}
      className="px-4 py-2 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
    >
      {isInstalling ? (
        <>
          <RotateCw className="w-3.5 h-3.5 animate-spin" />
          <span>{isUpdate ? 'Atualizando Versão...' : 'Instalando...'}</span>
        </>
      ) : (
        <>
          <UploadCloud className="w-3.5 h-3.5" />
          <span>{isUpdate ? 'Confirmar Atualização de Versão' : 'Confirmar Instalação'}</span>
        </>
      )}
    </button>
  </div>
);
