import React from 'react';
import { Globe, X } from 'lucide-react';

interface WtaUtilsHeaderProps {
  containerName: string;
  onClose: () => void;
}

export const WtaUtilsHeader: React.FC<WtaUtilsHeaderProps> = ({ containerName, onClose }) => (
  <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
        <Globe className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <span>Utilitários WTA — {containerName}</span>
          <span className="text-2xs font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
            Apache Karaf
          </span>
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Portal Web, Instalador, Console Karaf (/opt/pcsist) e Modo Desenvolvedor
        </p>
      </div>
    </div>

    <button
      onClick={onClose}
      className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
    >
      <X className="w-4 h-4" />
    </button>
  </div>
);
