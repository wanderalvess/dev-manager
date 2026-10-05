import React from 'react';
import { Sliders, X } from 'lucide-react';

export const InfrBootstrapHeader: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500">
        <Sliders className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
          <span>Assistente de Bootstrap INFR-Docker</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20">
            Scripts Oficiais
          </span>
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Automação guiada de criação e setup dos containers Oracle XE 11g, WTA e WSH
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
