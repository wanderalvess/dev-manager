import React from 'react';

interface KarafDeployHistoryFooterProps {
  onClose: () => void;
}

export const KarafDeployHistoryFooter: React.FC<KarafDeployHistoryFooterProps> = ({ onClose }) => (
  <div className="p-3 px-4 border-t border-border/80 bg-background/60 flex items-center justify-between shrink-0">
    <span className="text-2xs text-muted-foreground font-mono">
      Registros persistidos em <code className="text-muted-foreground">settings.karafDeployHistory</code> (máx: 200)
    </span>
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-1.5 text-xs font-semibold text-foreground bg-muted hover:bg-muted border border-border rounded-xl transition cursor-pointer"
    >
      Fechar
    </button>
  </div>
);
