import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Play, RotateCw, XCircle } from 'lucide-react';
import type { DeployStep } from '../../../../shared/types';
import type { DeployStepStatus } from '../../hooks/deploy/useDeployProgress';

interface DeployStepItemProps {
  step: DeployStep;
  index: number;
  isRunning: boolean;
  isBusy: boolean;
  status?: DeployStepStatus;
  executionTimeMs?: number;
  onRun: (step: DeployStep) => void;
}

export const DeployStepItem: React.FC<DeployStepItemProps> = ({
  step,
  index,
  isRunning,
  isBusy,
  status,
  executionTimeMs,
  onRun
}) => (
  <div
    className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs group transition-all ${
      step.enabled === false
        ? 'border-border/40 bg-muted/20 opacity-50'
        : isRunning
        ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
        : status?.status === 'completed'
        ? 'border-emerald-500/40 bg-emerald-500/5'
        : status?.status === 'failed'
        ? 'border-rose-500/40 bg-rose-500/5'
        : 'border-border/70 bg-card hover:border-border'
    }`}
  >
    {/* Ícone ou Número com Status */}
    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-2xs font-bold text-muted-foreground shrink-0">
      {isRunning ? (
        <RotateCw className="w-3 h-3 text-primary animate-spin" />
      ) : status?.status === 'completed' ? (
        status.ignoredError ? (
          <AlertTriangle className="w-3 h-3 text-amber-500" />
        ) : (
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        )
      ) : status?.status === 'failed' ? (
        <XCircle className="w-3 h-3 text-rose-500" />
      ) : (
        index + 1
      )}
    </span>

    <div className="truncate flex-1">
      <p className="font-semibold text-foreground truncate">{step.name}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <span className="text-2xs text-muted-foreground font-mono truncate">{step.type}</span>
        {step.continueOnError && (
          <span className="text-2xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 rounded font-mono" title="Tolerante a falhas">
            tolerante
          </span>
        )}
        {executionTimeMs !== undefined && (
          <span className="text-2xs font-mono font-medium text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded-full flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {(executionTimeMs / 1000).toFixed(1)}s
          </span>
        )}
      </div>
    </div>

    <button
      type="button"
      data-tour="run-single-step"
      onClick={() => onRun(step)}
      disabled={isBusy}
      className={`p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer ${
        isRunning
          ? 'bg-primary text-primary-foreground border-primary animate-pulse'
          : 'bg-card hover:bg-primary/15 text-primary border-border hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed'
      }`}
      title={isRunning ? 'Executando esta etapa...' : `Executar somente esta etapa (${step.name})`}
    >
      {isRunning ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
      <span className="text-2xs font-semibold hidden group-hover:inline sm:inline">
        {isRunning ? 'Rodando...' : 'Executar'}
      </span>
    </button>
  </div>
);
