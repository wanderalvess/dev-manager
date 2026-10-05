import React from 'react';
import { UploadCloud, X } from 'lucide-react';
import type { KarafBundleInfo } from '../../../../../shared/types';

interface KarafInstallModalHeaderProps {
  updatingTargetBundle: KarafBundleInfo | null;
  onClose: () => void;
}

export const KarafInstallModalHeader: React.FC<KarafInstallModalHeaderProps> = ({
  updatingTargetBundle,
  onClose
}) => (
  <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
    <div className="flex items-center space-x-2.5">
      <div className="p-2 rounded-xl bg-primary/10 border border-primary/30 text-primary">
        <UploadCloud className="w-5 h-5" />
      </div>
      <div>
        <h4 className="text-sm font-bold text-foreground">
          {updatingTargetBundle
            ? `Atualizar Versão: [${updatingTargetBundle.id}] ${updatingTargetBundle.name}`
            : 'Instalar Bundle / Outra Versão'}
        </h4>
        <p className="text-[11px] text-muted-foreground">
          {updatingTargetBundle
            ? 'Atualização in-place no Karaf (bundle:update) preservando ID e reconectando fiações'
            : 'Implantação de componentes OSGi com verificação prévia de colisão e dependências'}
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
