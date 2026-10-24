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
  <div className="pt-3 border-t border-border" data-tour="profile-stepper">
    <div className="flex flex-wrap items-center justify-between gap-x-4 mb-2.5">
      <span className="text-[13px] font-medium text-foreground flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Esteira de inicialização ({profile.steps.filter((s) => s.enabled !== false).length} etapas)
      </span>
      <span className="text-xs text-muted-foreground">
        Sobe na ordem, com intervalo e monitoramento de porta
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
          dotStyle = 'bg-card text-primary border-primary animate-pulse';
        } else if (isDone) {
          dotStyle = 'bg-success text-card border-success';
        }

        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div
                className={`h-[2px] flex-1 rounded-full ${
                  isDone || isCurrent ? 'bg-success/50' : 'bg-border'
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
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center font-semibold text-2xs transition-all ${dotStyle}`}
              >
                {isDone ? <CheckCircle2 className="w-3.5 h-3.5 stroke-3" /> : stepNum}
              </div>
              <span
                className={`text-xs truncate max-w-[140px] ${
                  isCurrent ? 'text-primary font-semibold' : isDone ? 'text-foreground' : 'text-muted-foreground'
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
