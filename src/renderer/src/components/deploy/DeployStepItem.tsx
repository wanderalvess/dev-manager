import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FastForward,
  Play,
  RotateCw,
  SkipForward,
  Square,
  XCircle
} from 'lucide-react';
import type { DeployStep } from '../../../../shared/types';
import type { DeployStepStatus } from '../../hooks/deploy/useDeployProgress';

interface DeployStepItemProps {
  step: DeployStep;
  index: number;
  totalSteps: number;
  isRunning: boolean;
  isBusy: boolean;
  status?: DeployStepStatus;
  executionTimeMs?: number;
  onRun: (step: DeployStep) => void;
  onCancel?: (step: DeployStep) => void;
  onToggle?: (stepId: string) => void;
  onRunFromStep?: (index: number) => void;
}

export const DeployStepItem: React.FC<DeployStepItemProps> = ({
  step,
  index,
  totalSteps,
  isRunning,
  isBusy,
  status,
  executionTimeMs,
  onRun,
  onCancel,
  onToggle,
  onRunFromStep
}) => {
  const isEnabled = step.enabled !== false;

  return (
    <div
      className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs group transition-all ${
        !isEnabled
          ? 'border-border/40 bg-muted/20 opacity-60'
          : isRunning
          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
          : status?.status === 'completed'
          ? 'border-success/40 bg-success/5'
          : status?.status === 'failed'
          ? 'border-danger/40 bg-danger/5'
          : status?.status === 'skipped'
          ? 'border-border/50 bg-muted/30 opacity-60'
          : 'border-border/70 bg-card hover:border-border'
      }`}
    >
      {/* Checkbox de Inclusão no Fluxo Automático */}
      <input
        type="checkbox"
        checked={isEnabled}
        onChange={() => onToggle?.(step.id)}
        disabled={isBusy}
        className="w-4 h-4 rounded border-border text-primary focus:ring-0 cursor-pointer shrink-0 accent-primary disabled:opacity-50"
        title={
          isEnabled
            ? 'Etapa ativa: será executada no fluxo automático (clique para pular)'
            : 'Etapa pulada: não será executada no fluxo automático (clique para ativar)'
        }
        aria-label={`Incluir etapa ${step.name} no fluxo automático`}
      />

      {/* Ícone ou Número com Status */}
      <span className="w-5 h-5 flex items-center justify-center rounded-full bg-muted text-2xs font-bold text-muted-foreground shrink-0">
        {isRunning ? (
          <RotateCw className="w-3 h-3 text-primary animate-spin" />
        ) : status?.status === 'completed' ? (
          status.ignoredError ? (
            <AlertTriangle className="w-3 h-3 text-warning" />
          ) : (
            <CheckCircle2 className="w-3 h-3 text-success" />
          )
        ) : status?.status === 'failed' ? (
          <XCircle className="w-3 h-3 text-danger" />
        ) : status?.status === 'skipped' ? (
          <span title="Etapa pulada nesta execução" className="inline-flex">
            <SkipForward className="w-3 h-3 text-muted-foreground" />
          </span>
        ) : (
          index + 1
        )}
      </span>

      <div className="truncate flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className={`font-semibold truncate ${
              !isEnabled ? 'text-muted-foreground line-through decoration-border/80' : 'text-foreground'
            }`}
          >
            {step.name}
          </p>
          {!isEnabled && (
            <span className="text-2xs bg-muted text-muted-foreground border border-border/70 px-1.5 py-0.2 rounded-sm font-mono shrink-0">
              pulada
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-2xs text-muted-foreground font-mono truncate">{step.type}</span>
          {step.continueOnError && (
            <span className="text-2xs bg-warning/10 text-warning border border-warning/20 px-1 rounded font-mono" title="Tolerante a falhas">
              tolerante
            </span>
          )}
          {executionTimeMs !== undefined && (
            <span className="text-2xs font-mono font-medium text-success/90 bg-success/10 border border-success/20 px-1.5 py-0.2 rounded-full flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {(executionTimeMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Executar a partir desta etapa em diante */}
        {onRunFromStep && index < totalSteps - 1 && (
          <button
            type="button"
            onClick={() => onRunFromStep(index)}
            disabled={isBusy}
            className="p-1.5 rounded-lg border text-2xs transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-border/80 cursor-pointer disabled:opacity-0"
            title={`Executar o fluxo a partir desta etapa (${step.name}) até o final`}
          >
            <FastForward className="w-3 h-3 text-primary" />
            <span className="hidden xl:inline">Daqui em diante</span>
          </button>
        )}

        {/* Executar / Cancelar somente esta etapa */}
        {isRunning ? (
          <button
            type="button"
            onClick={() => onCancel?.(step)}
            className="p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer bg-destructive hover:bg-destructive/90 text-destructive-foreground border-destructive shadow-2xs"
            title={`Interromper execução desta etapa (${step.name}) imediatamente`}
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="text-2xs font-semibold hidden group-hover:inline sm:inline">
              Cancelar
            </span>
          </button>
        ) : (
          <button
            type="button"
            data-tour="run-single-step"
            onClick={() => onRun(step)}
            disabled={isBusy}
            className="p-1.5 rounded-lg border text-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer bg-card hover:bg-primary/15 text-primary border-border hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`Executar somente esta etapa (${step.name})`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="text-2xs font-semibold hidden group-hover:inline sm:inline">
              Executar
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
