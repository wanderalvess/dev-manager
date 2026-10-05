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
      <div className="text-center p-8 text-zinc-500">
        <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <span>Nenhum teste foi executado ainda.</span>
      </div>
    ) : (
      history.map((item) => (
        <div
          key={item.id}
          className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 transition"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <StatusIcon status={item.status} />
              <span className="font-bold text-zinc-200">{item.runnerName}</span>
              <span className="text-2xs text-zinc-500 font-mono">
                {new Date(item.executedAt).toLocaleTimeString()}
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-emerald-400">+{item.passedCount}</span>
              <span className="text-rose-400">-{item.failedCount}</span>
              <span className="text-zinc-500">~{item.skippedCount}</span>
              <span className="text-zinc-400">{formatDurationSeconds(item.durationMs)}</span>
            </div>
          </div>

          {item.summaryMessage && (
            <p className="mt-1.5 text-[11px] font-mono text-zinc-400 line-clamp-1">{item.summaryMessage}</p>
          )}

          <div className="mt-2 pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => onViewLog(item)}
              className="text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
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
