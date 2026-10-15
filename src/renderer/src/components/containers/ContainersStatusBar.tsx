import React from 'react';
import { Trash2 } from 'lucide-react';

interface ContainersStatusBarProps {
  runningCount: number;
  stoppedCount: number;
  totalCount: number;
  isPruning: boolean;
  onPruneClick: () => void;
}

export const ContainersStatusBar: React.FC<ContainersStatusBarProps> = ({
  runningCount,
  stoppedCount,
  totalCount,
  isPruning,
  onPruneClick
}) => (
  <div className="mx-4 mt-2 flex items-center justify-between text-xs text-muted-foreground shrink-0">
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 font-medium">
        <span className="w-2 h-2 rounded-full bg-success" />
        <strong className="text-foreground font-semibold">{runningCount}</strong> rodando
      </span>
      <span className="flex items-center gap-1.5 font-medium">
        <span className="w-2 h-2 rounded-full bg-zinc-500" />
        <strong className="text-foreground font-semibold">{stoppedCount}</strong> parados
      </span>
      <span className="text-[11px] text-muted-foreground">
        Total: <strong className="text-foreground font-semibold">{totalCount}</strong>
      </span>
    </div>

    {stoppedCount > 0 && (
      <button
        type="button"
        onClick={onPruneClick}
        disabled={isPruning}
        title="Remover todos os containers parados (docker container prune)"
        className="flex items-center gap-1.5 px-2.5 py-1 bg-card hover:bg-danger/10 text-muted-foreground hover:text-danger border border-border/80 hover:border-danger/30 rounded-lg text-xs font-semibold transition cursor-pointer shadow-2xs active:scale-98"
      >
        <Trash2 className="w-3 h-3" />
        <span>Limpar Parados ({stoppedCount})</span>
      </button>
    )}
  </div>
);
