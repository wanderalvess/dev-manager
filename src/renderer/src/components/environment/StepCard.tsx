import React from 'react';
import type { AutomationStep } from '../../../../shared/types';
import type { StepRuntimeTarget } from '../../utils/environmentPageUtils';
import { getLaunchModeLabel } from '../../utils/environmentStepDisplay';
import { getStepIcon } from './stepIcon';
import { StepDetails } from './StepDetails';
import { StepActions } from './StepActions';

interface StepCardProps {
  step: AutomationStep;
  index: number;
  runtime: StepRuntimeTarget;
  loadingAction?: 'run' | 'stop' | 'restart';
  isRunningProfile: boolean;
  onToggleEnabled: (stepId: string, enabled: boolean) => void;
  onRun: (step: AutomationStep) => void;
  onStop: (step: AutomationStep) => void;
  onRestart: (step: AutomationStep) => void;
  onToggleService: (step: AutomationStep, isRunning: boolean) => void;
}

const MODE_BADGE = 'text-2xs font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded border border-primary/20';

/** Cartão de uma etapa do perfil: título, tipo, detalhes contextuais e ações individuais. */
export const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  runtime,
  loadingAction,
  isRunningProfile,
  onToggleEnabled,
  onRun,
  onStop,
  onRestart,
  onToggleService
}) => {
  const StepIcon = getStepIcon(step.type);
  const { isPortActive, service: srvFound, effectiveKarafPort } = runtime;

  return (
    <div
      className={`p-3 bg-card border rounded-xl flex flex-col gap-2 transition-all shadow-sm ${
        step.enabled === false
          ? 'opacity-50 border-border/40 bg-muted/20'
          : isPortActive || (srvFound && srvFound.state === 'RUNNING')
          ? 'border-emerald-500/40 hover:border-emerald-500/60'
          : 'border-border/80 hover:border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start space-x-2.5 min-w-0">
          <input
            type="checkbox"
            checked={step.enabled !== false}
            onChange={(e) => onToggleEnabled(step.id, e.target.checked)}
            className="mt-1 rounded border-border text-primary h-4 w-4 shrink-0 cursor-pointer"
            title="Habilitar ou desabilitar este passo na execução em lote"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-5 h-5 flex items-center justify-center rounded-md bg-muted text-2xs font-bold text-muted-foreground shrink-0">
                {index + 1}
              </span>
              <span className="text-xs font-bold text-foreground truncate">{step.name}</span>
              <span className="text-2xs font-mono px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 flex items-center gap-1">
                <StepIcon className="w-3 h-3" />
                {step.type}
              </span>
              {step.type === 'karaf' && (
                <span className="text-2xs font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 font-semibold flex items-center gap-1">
                  Debug :{effectiveKarafPort}
                </span>
              )}
              {step.type === 'karaf' && step.launchMode && (
                <span className={MODE_BADGE}>{getLaunchModeLabel('karaf', step.launchMode)}</span>
              )}
              {step.type === 'command' && step.launchMode && (
                <span className={MODE_BADGE}>{getLaunchModeLabel('command', step.launchMode)}</span>
              )}
            </div>

            <StepDetails step={step} runtime={runtime} />
          </div>
        </div>

        <StepActions
          step={step}
          runtime={runtime}
          loadingAction={loadingAction}
          isRunningProfile={isRunningProfile}
          onRun={onRun}
          onStop={onStop}
          onRestart={onRestart}
          onToggleService={onToggleService}
        />
      </div>
    </div>
  );
};
