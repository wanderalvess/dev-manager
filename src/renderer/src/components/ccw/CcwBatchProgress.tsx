import React from 'react';
import { Activity } from 'lucide-react';
import type { BatchRoutineItemProgress } from '../../../../shared/types';
import { computeBatchStats } from '../../utils/ccwModalUtils';

interface CcwBatchProgressProps {
  progressList: BatchRoutineItemProgress[];
}

/** Monitoramento de progresso em tempo real com telemetria e LEDs. */
export const CcwBatchProgress: React.FC<CcwBatchProgressProps> = ({ progressList }) => {
  const { total, completed, failed, percent } = computeBatchStats(progressList);

  return (
    <div className="space-y-2 border border-border/80 rounded-xl p-3 bg-card/60 shadow-2xs">
      <div className="flex items-center justify-between text-xs font-bold text-foreground">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span>Telemetria do Download ({percent}%)</span>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground">
          {completed + failed} de {total} processadas
        </span>
      </div>

      {/* Barra de progresso de alta precisão */}
      <div className="w-full bg-muted/60 h-1.5 rounded-full overflow-hidden border border-border/40">
        <div
          className="bg-primary h-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1 mt-2">
        {progressList.map((prog, progIdx) => (
          <div
            key={prog.routineCodeOrName || prog.routine || prog.routineCode || progIdx}
            className="p-2 rounded-lg bg-background/80 border border-border/60 flex items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              {prog.status === 'downloading' && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
              )}
              {prog.status === 'completed' && (
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              )}
              {prog.status === 'failed' && (
                <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
              )}
              {prog.status === 'pending' && (
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
              )}
              <span className="font-mono font-bold text-foreground truncate">
                {prog.routineCodeOrName || prog.routine || prog.routineCode}
              </span>
            </div>

            <span
              className={`text-2xs font-mono truncate max-w-xs ${
                prog.status === 'completed'
                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                  : prog.status === 'failed'
                  ? 'text-destructive font-bold'
                  : prog.status === 'downloading'
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground'
              }`}
            >
              {prog.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
