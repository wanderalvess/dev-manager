import React from 'react';
import { ShieldAlert, X } from 'lucide-react';

interface KarafUninstallModalHeaderProps {
  onClose: () => void;
}

export const KarafUninstallModalHeader: React.FC<KarafUninstallModalHeaderProps> = ({ onClose }) => (
  <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
    <div className="flex items-center space-x-2.5">
      <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400">
        <ShieldAlert className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-foreground">Confirmar Desinstalação do Bundle</h4>
        <p className="text-[11px] text-muted-foreground">
          Verificação prévia de impacto e fiação de dependências OSGi
        </p>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
