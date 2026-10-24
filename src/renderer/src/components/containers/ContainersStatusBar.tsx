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
  <div className="mx-7 mt-3 flex items-center justify-between text-[13px] text-muted-foreground shrink-0">
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-1.5 font-medium">
        <span className="w-2 h-2 rounded-full bg-success" />
        <strong className="text-foreground font-semibold">{runningCount}</strong> rodando
      </span>
      <span className="flex items-center gap-1.5 font-medium">
        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
        <strong className="text-foreground font-semibold">{stoppedCount}</strong> parados
      </span>
      <span className="text-2xs text-muted-foreground">
        Total: <strong className="text-foreground font-semibold">{totalCount}</strong>
      </span>
    </div>

    {stoppedCount > 0 && (
      <button
        type="button"
        onClick={onPruneClick}
        disabled={isPruning}
        title="Remover todos os containers parados (docker container prune)"
        className="flex items-center gap-1.5 h-8 px-3 bg-card hover:bg-danger/10 text-muted-foreground hover:text-danger border border-border hover:border-danger/30 rounded-lg text-[13px] font-medium transition cursor-pointer"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Limpar parados ({stoppedCount})</span>
      </button>
    )}
  </div>
);
