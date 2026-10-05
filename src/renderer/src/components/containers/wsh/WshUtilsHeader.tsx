import React from 'react';
import { Key, X } from 'lucide-react';

interface WshUtilsHeaderProps {
  containerName: string;
  onClose: () => void;
}

export const WshUtilsHeader: React.FC<WshUtilsHeaderProps> = ({ containerName, onClose }) => (
  <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
        <Key className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <span>Utilitários WSH — {containerName}</span>
          <span className="text-2xs font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/20">
            Winthor Smart Hub
          </span>
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Criptografia MD5 de senha, checagem de pré-requisitos em /opt e suporte à Rotina 2650
        </p>
      </div>
    </div>

    <button
      onClick={onClose}
      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
