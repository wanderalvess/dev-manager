import React from 'react';
import { Pencil, RotateCw } from 'lucide-react';
import type { DeployProfile, DeployStep } from '../../../../shared/types';
import type { DeployCurrentProgress, DeployStepStatus } from '../../hooks/deploy/useDeployProgress';
import { countEnabledSteps } from '../../utils/deployProfileUtils';
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
  onCancelStep?: (step: DeployStep) => void;
  onToggleStep?: (stepId: string) => void;
  onToggleAllSteps?: (enableAll: boolean) => void;
  onRunFromStep?: (index: number) => void;
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
  onRunStep,
  onCancelStep,
  onToggleStep,
  onToggleAllSteps,
  onRunFromStep
}) => {
  const { enabledCount, totalCount, allEnabled, isIndeterminate } = countEnabledSteps(activeProfile);
  const percent =
    currentProgress && currentProgress.total > 0
      ? Math.round((currentProgress.current / currentProgress.total) * 100)
      : 0;
  const isBusy = isDeploying || runningStepId !== null || isDiagRunning !== null;

  return (
    <div className="cockpit-panel rounded-xl p-3 space-y-2.5 border border-border/80 shadow-2xs" data-tour="steps-list-panel">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {totalCount > 0 && onToggleAllSteps && (
            <input
              type="checkbox"
              checked={allEnabled}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={(e) => onToggleAllSteps(e.target.checked)}
              disabled={!activeProfile || isBusy}
              className="w-4 h-4 rounded border-border text-primary focus:ring-0 cursor-pointer shrink-0 accent-primary disabled:opacity-50"
              title={
                allEnabled
                  ? 'Desmarcar todas as etapas'
                  : 'Marcar todas as etapas para o fluxo automático'
              }
              aria-label="Marcar ou desmarcar todas as etapas"
            />
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            Etapas ({enabledCount}/{totalCount})
            {totalCount > 0 && enabledCount < totalCount && (
              <span className="text-2xs font-normal lowercase bg-warning/15 text-warning border border-warning/30 px-1.5 py-0.2 rounded font-mono font-bold">
                {totalCount - enabledCount} pulada{totalCount - enabledCount > 1 ? 's' : ''}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {totalCount > 0 && onToggleAllSteps && (
            <button
              type="button"
              onClick={() => onToggleAllSteps(!allEnabled)}
              disabled={isBusy}
              className="text-2xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {allEnabled ? 'Desmarcar todas' : 'Marcar todas'}
            </button>
          )}
          <button
            onClick={onEditSteps}
            disabled={!activeProfile || isDeploying}
            className="text-2xs text-primary hover:underline flex items-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <Pencil className="w-3 h-3" /> Editar Etapas
          </button>
        </div>
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
              totalSteps={totalCount}
              isRunning={runningStepId === step.id}
              isBusy={isBusy}
              status={stepStatuses[step.id]}
              executionTimeMs={stepExecutionTimes[step.id]}
              onRun={onRunStep}
              onCancel={onCancelStep}
              onToggle={onToggleStep}
              onRunFromStep={onRunFromStep}
            />
          ))}
        </div>
      )}
    </div>
  );
};
