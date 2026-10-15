import React from 'react';
import { Zap, Edit3 } from 'lucide-react';
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
  <div className="cockpit-panel rounded-xl p-4 flex flex-col border border-border space-y-3" data-tour="step-cards-panel">
    <div className="flex items-center justify-between border-b border-border/60 pb-2">
      <div className="flex items-center space-x-2">
        <Zap className="w-4 h-4 text-primary" />
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground">
          Projetos e Serviços da Stack ({activeProfile?.steps?.length || 0})
        </h3>
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onConfigureSteps}
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
        >
          <Edit3 className="w-3 h-3" /> Configurar Etapas
        </button>
      </div>
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
          Nenhum passo cadastrado neste perfil. Clique em "Configurar Etapas" acima para adicionar!
        </div>
      )}
    </div>
  </div>
);
