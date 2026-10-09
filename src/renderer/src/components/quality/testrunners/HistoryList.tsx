import React from 'react';
import { History, Sparkles } from 'lucide-react';
import type { TestExecutionResult } from '../../../../../shared/types';
import { formatDurationSeconds } from '../../../utils/testRunnersUtils';
import { StatusIcon } from './testRunnersVisuals';

interface HistoryListProps {
  history: TestExecutionResult[];
  canSync: boolean;
  onViewLog: (item: TestExecutionResult) => void;
  onSync: (runnerId: string, result: TestExecutionResult) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, canSync, onViewLog, onSync }) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-3">
    {history.length === 0 ? (
      <div className="text-center p-8 text-muted-foreground">
        <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <span>Nenhum teste foi executado ainda.</span>
      </div>
    ) : (
      history.map((item) => (
        <div
          key={item.id}
          className="p-3 rounded-lg border border-border bg-card hover:border-border transition"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <StatusIcon status={item.status} />
              <span className="font-bold text-foreground">{item.runnerName}</span>
              <span className="text-2xs text-muted-foreground font-mono">
                {new Date(item.executedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-2xs">
              <span className="text-emerald-400">+{item.passedCount}</span>
              <span className="text-rose-400">-{item.failedCount}</span>
              <span className="text-muted-foreground">~{item.skippedCount}</span>
              <span className="text-muted-foreground">{formatDurationSeconds(item.durationMs)}</span>
            </div>
          </div>

          {item.summaryMessage && (
            <p className="mt-1.5 text-2xs font-mono text-muted-foreground line-clamp-1">{item.summaryMessage}</p>
          )}

          <div className="mt-2 pt-2 border-t border-border flex items-center justify-between text-2xs">
            <button
              type="button"
              onClick={() => onViewLog(item)}
              className="text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Ver log completo
            </button>

            {item.linkedValidationItemIds && item.linkedValidationItemIds.length > 0 && canSync && (
              <button
                type="button"
                onClick={() => onSync(item.runnerId, item)}
                className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Sincronizar com Matriz</span>
              </button>
            )}
          </div>
        </div>
      ))
    )}
  </div>
);
