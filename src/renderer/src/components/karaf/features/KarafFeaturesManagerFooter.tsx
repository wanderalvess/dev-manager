import React from 'react';

interface KarafFeaturesManagerFooterProps {
  total: number;
  installed: number;
  reposCount: number;
  onClose: () => void;
}

export const KarafFeaturesManagerFooter: React.FC<KarafFeaturesManagerFooterProps> = ({
  total,
  installed,
  reposCount,
  onClose
}) => (
  <div className="flex items-center justify-between px-5 py-2.5 border-t border-border bg-muted/20 text-xs font-mono text-muted-foreground">
    <div className="flex items-center space-x-4 tabular-nums">
      <span>
        TOTAL: <strong className="text-foreground">{total}</strong>
      </span>
      <span>
        INSTALADAS: <strong className="text-emerald-400">{installed}</strong>
      </span>
      <span>
        REPOSITÓRIOS: <strong className="text-foreground">{reposCount}</strong>
      </span>
    </div>

    <button
      onClick={onClose}
      className="px-3 py-1 rounded-md text-xs font-mono font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
    >
      Fechar
    </button>
  </div>
);
