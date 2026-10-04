import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import type { AutomationProfile, PortStatus, ProcessStatus, ServiceStatus } from '../../../../shared/types';
import { isStepDone } from '../../utils/environmentStepDisplay';

interface ProfileStepperProps {
  profile: AutomationProfile;
  services: ServiceStatus[];
  processes: ProcessStatus[];
  ports: PortStatus[];
  isRunningProfile: boolean;
  activeStepIndex: number;
  currentRunningStepId: string | null;
}

/** Stepper visual sequencial do perfil ativo (trilha compacta; o detalhe fica nos cartões de etapa). */
export const ProfileStepper: React.FC<ProfileStepperProps> = ({
  profile,
  services,
  processes,
  ports,
  isRunningProfile,
  activeStepIndex,
  currentRunningStepId
}) => (
  <div className="pt-2 border-t border-border/50" data-tour="profile-stepper">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-primary" /> Esteira Sequencial de Inicialização ({profile.steps.filter((s) => s.enabled !== false).length} etapas)
      </span>
      <span className="text-[10px] font-mono text-muted-foreground">
        Ordem de subida: 1º ao último com intervalo e monitoramento de porta
      </span>
    </div>

    <div className="flex items-center gap-1">
      {profile.steps.map((step, index) => {
        const stepNum = index + 1;
        const isCurrent = isRunningProfile && currentRunningStepId === step.id;
        const portStatus = step.port ? ports.find((p) => p.port === step.port) : undefined;
        const isPortUp = portStatus?.inUse ?? false;
        const srvName = step.targetName || step.name;
        const srvStatus = services.find((s) => s.name.toLowerCase() === srvName.toLowerCase());
        const procStatus = processes.find((p) => p.name.toLowerCase() === (step.targetName || step.name).toLowerCase());
        const isDone = isStepDone({
          step,
          stepNumber: stepNum,
          isRunningProfile,
          activeStepIndex,
          isPortUp,
          serviceState: srvStatus?.state,
          processIsRunning: procStatus?.isRunning
        });

        let dotStyle = 'bg-muted text-muted-foreground border-border';
        if (isCurrent) {
          dotStyle = 'bg-primary text-primary-foreground border-primary animate-pulse glow-primary';
        } else if (isDone) {
          dotStyle = 'bg-emerald-500 text-white border-emerald-500';
        }

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div
                className={`h-[2px] flex-1 rounded-full ${
                  isDone || isCurrent ? 'bg-emerald-500/50' : 'bg-border'
                }`}
              />
            )}
            <div
              className={`flex items-center gap-1.5 shrink-0 ${
                step.enabled === false ? 'opacity-40 grayscale' : ''
              }`}
              title={`${stepNum}. ${step.name}${step.port ? ` — porta ${step.port} ${isPortUp ? 'ativa' : 'inativa'}` : ` — ${step.type}`}`}
            >
              <div
                className={`w-6 h-6 rounded-lg border flex items-center justify-center font-bold text-[11px] transition-all ${dotStyle}`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" /> : stepNum}
              </div>
              <span
                className={`text-[11px] font-semibold truncate max-w-[140px] ${
                  isCurrent ? 'text-primary font-bold' : isDone ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'
                }`}
              >
                {step.name}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  </div>
);
