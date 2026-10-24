import React from 'react';
import { Edit3 } from 'lucide-react';
import type {
  AutomationProfile,
  AutomationStep,
  PortStatus,
  ProcessStatus,
  ServiceStatus
} from '../../../../shared/types';
import { resolveStepRuntimeTarget } from '../../utils/environmentPageUtils';
import { StepCard } from './StepCard';

interface StepCardsPanelProps {
  activeProfile: AutomationProfile | null;
  services: ServiceStatus[];
  processes: ProcessStatus[];
  ports: PortStatus[];
  karafDebugPort?: number;
  stepActionLoading: Record<string, 'run' | 'stop' | 'restart'>;
  isRunningProfile: boolean;
  onConfigureSteps: () => void;
  onToggleEnabled: (stepId: string, enabled: boolean) => void;
  onRun: (step: AutomationStep) => void;
  onStop: (step: AutomationStep) => void;
  onRestart: (step: AutomationStep) => void;
  onToggleService: (step: AutomationStep, isRunning: boolean) => void;
}

/** Painel com os cartões de cada projeto/serviço (etapa) do perfil ativo. */
export const StepCardsPanel: React.FC<StepCardsPanelProps> = ({
  activeProfile,
  services,
  processes,
  ports,
  karafDebugPort,
  stepActionLoading,
  isRunningProfile,
  onConfigureSteps,
  onToggleEnabled,
  onRun,
  onStop,
  onRestart,
  onToggleService
}) => (
  <div className="bg-card border border-border rounded-[14px] shadow-xs p-5 flex flex-col gap-3" data-tour="step-cards-panel">
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold text-foreground">
        Projetos e serviços da stack <span className="text-muted-foreground font-normal">({activeProfile?.steps?.length || 0})</span>
      </h2>

      <button
        type="button"
        onClick={onConfigureSteps}
        className="h-8 px-2.5 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <Edit3 className="w-3.5 h-3.5" /> Configurar etapas
      </button>
    </div>

    <div className="space-y-2.5">
      {activeProfile?.steps && activeProfile.steps.length > 0 ? (
        activeProfile.steps.map((step, idx) => (
          <StepCard
            key={step.id}
            step={step}
            index={idx}
            runtime={resolveStepRuntimeTarget(step, { services, processes, ports, karafDebugPort })}
            loadingAction={stepActionLoading[step.id]}
            isRunningProfile={isRunningProfile}
            onToggleEnabled={onToggleEnabled}
            onRun={onRun}
            onStop={onStop}
            onRestart={onRestart}
            onToggleService={onToggleService}
          />
        ))
      ) : (
        <div className="text-center py-8 text-xs text-muted-foreground">
          Nenhum passo cadastrado neste perfil. Clique em "Configurar etapas" acima para adicionar.
        </div>
      )}
    </div>
  </div>
);
