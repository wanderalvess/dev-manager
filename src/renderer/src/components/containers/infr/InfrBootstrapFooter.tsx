import React from 'react';

export const InfrBootstrapFooter: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
    <span className="text-2xs text-muted-foreground flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
      Scripts INFR-Docker integrados
    </span>

    <button
      onClick={onClose}
      className="px-3.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
    >
      Fechar
    </button>
  </div>
);
