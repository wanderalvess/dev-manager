import React from 'react';
import { Pencil, RotateCw } from 'lucide-react';
import type { DeployProfile, DeployStep } from '../../../../shared/types';
import type { DeployCurrentProgress, DeployStepStatus } from '../../hooks/deploy/useDeployProgress';
import { DeployStepItem } from './DeployStepItem';

interface DeployStepsPanelProps {
  activeProfile: DeployProfile | null;
  isDeploying: boolean;
  runningStepId: string | null;
  isDiagRunning: string | null;
  currentProgress: DeployCurrentProgress | null;
  stepStatuses: Record<string, DeployStepStatus>;
  stepExecutionTimes: Record<string, number>;
  onEditSteps: () => void;
  onRunStep: (step: DeployStep) => void;
}

/** Lista de etapas do perfil ativo com barra de progresso da execução geral. */
export const DeployStepsPanel: React.FC<DeployStepsPanelProps> = ({
  activeProfile,
  isDeploying,
  runningStepId,
  isDiagRunning,
  currentProgress,
  stepStatuses,
  stepExecutionTimes,
  onEditSteps,
  onRunStep
}) => {
  const percent =
    currentProgress && currentProgress.total > 0
      ? Math.round((currentProgress.current / currentProgress.total) * 100)
      : 0;
  const isBusy = isDeploying || runningStepId !== null || isDiagRunning !== null;

  return (
    <div className="cockpit-panel rounded-xl p-3 space-y-2.5 border border-border/80 shadow-2xs" data-tour="steps-list-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Etapas ({activeProfile?.steps?.length || 0})
        </span>
        <button
          onClick={onEditSteps}
          disabled={!activeProfile || isDeploying}
          className="text-2xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
        >
          <Pencil className="w-3 h-3" /> Editar Etapas
        </button>
      </div>

      {/* Barra de Progresso Durante Execução Geral */}
      {currentProgress && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-2.5 space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 animate-spin text-primary" />
              Etapa {currentProgress.current} de {currentProgress.total}
            </span>
            <span className="font-mono font-bold text-primary">{percent}%</span>
          </div>
          <div className="w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {!activeProfile || activeProfile.steps.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">
          Nenhuma etapa configurada. Clique em "Editar Etapas" para montar a sequência de deploy.
        </p>
      ) : (
        <div className="space-y-1.5">
          {activeProfile.steps.map((step, idx) => (
            <DeployStepItem
              key={step.id}
              step={step}
              index={idx}
              isRunning={runningStepId === step.id}
              isBusy={isBusy}
              status={stepStatuses[step.id]}
              executionTimeMs={stepExecutionTimes[step.id]}
              onRun={onRunStep}
            />
          ))}
        </div>
      )}
    </div>
  );
};
