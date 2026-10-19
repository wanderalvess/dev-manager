import React from 'react';
import { Sparkles } from 'lucide-react';
import type { TestExecutionResult } from '../../../../../shared/types';
import { formatDurationSeconds } from '../../../utils/testRunnersUtils';
import { StatusIcon } from './testRunnersVisuals';

interface ExecutionResultBannerProps {
  result: TestExecutionResult;
  canSync: boolean;
  onSync: (runnerId: string, result: TestExecutionResult) => void;
}

export const ExecutionResultBanner: React.FC<ExecutionResultBannerProps> = ({ result, canSync, onSync }) => (
  <div
    className={`px-4 py-2.5 border-b flex items-center justify-between gap-4 shrink-0 font-mono text-xs ${
      result.status === 'passed'
        ? 'bg-success/40 border-success/60 text-success'
        : result.status === 'aborted'
        ? 'bg-warning/40 border-warning/60 text-warning'
        : 'bg-danger/40 border-danger/60 text-danger'
    }`}
  >
    <div className="flex items-center gap-3">
      <StatusIcon status={result.status} className="w-4 h-4 shrink-0" />
      <div>
        <div className="font-bold flex items-center gap-2">
          <span>{result.runnerName}</span>
          <span className="text-2xs px-1.5 py-0.2 rounded border border-current font-semibold">
            {result.status.toUpperCase()}
          </span>
          <span className="text-2xs opacity-75">({formatDurationSeconds(result.durationMs)})</span>
        </div>
        <div className="text-2xs opacity-90 mt-0.5">
          Total: {result.totalTests} | Aprovados: {result.passedCount} | Falhas: {result.failedCount} | Pulados:{' '}
          {result.skippedCount}
        </div>
      </div>
    </div>

    {/* Sincronização com a Matriz de Validação */}
    {result.linkedValidationItemIds && result.linkedValidationItemIds.length > 0 && canSync && (
      <button
        type="button"
        onClick={() => onSync(result.runnerId, result)}
        className="px-3 py-1.5 rounded-lg bg-card hover:bg-muted border border-border text-xs font-semibold text-foreground flex items-center gap-1.5 transition cursor-pointer shadow-2xs active:scale-95"
      >
        <Sparkles className="w-3.5 h-3.5 text-warning" />
        <span>Sincronizar Matriz</span>
      </button>
    )}
  </div>
);
