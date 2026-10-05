import React from 'react';

export const WtaUtilsFooter: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
    <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
      Interoperabilidade WTA INFR-Docker
    </span>

    <button
      onClick={onClose}
      className="px-3 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
    >
      Fechar
    </button>
  </div>
);
