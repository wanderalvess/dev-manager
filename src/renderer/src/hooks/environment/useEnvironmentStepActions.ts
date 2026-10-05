import { useState } from 'react';
import type { AutomationProfile, AutomationStep } from '../../../../shared/types';

type StepAction = 'run' | 'stop' | 'restart';

interface UseEnvironmentStepActionsOptions {
  activeProfile: AutomationProfile | null;
  refreshAllStatus: () => void;
}

/** Ações individuais (subir / parar / reiniciar) de uma etapa do perfil, com estado de carregamento por etapa. */
export function useEnvironmentStepActions({ activeProfile, refreshAllStatus }: UseEnvironmentStepActionsOptions) {
  const [stepActionLoading, setStepActionLoading] = useState<Record<string, StepAction>>({});

  const withStepLoading = async (stepId: string, action: StepAction, task: () => Promise<void>) => {
    setStepActionLoading((prev) => ({ ...prev, [stepId]: action }));
    try {
      await task();
    } finally {
      setStepActionLoading((prev) => {
        const copy = { ...prev };
        delete copy[stepId];
        return copy;
      });
    }
  };

  const handleRunStep = async (step: AutomationStep) => {
    if (!window.electronAPI || !window.electronAPI.runProfileStep) return;
    await withStepLoading(step.id, 'run', async () => {
      await window.electronAPI.runProfileStep(step, activeProfile?.name);
      setTimeout(() => refreshAllStatus(), 2000);
    });
  };

  const handleStopStep = async (step: AutomationStep) => {
    if (!window.electronAPI || !window.electronAPI.stopProfileStep) return;
    await withStepLoading(step.id, 'stop', async () => {
      await window.electronAPI.stopProfileStep(step);
      refreshAllStatus();
    });
  };

  // Botão único de serviço (service-start/service-stop): a ação segue o estado real
  // do serviço, não o step.type configurado — esse é reservado pra quando o perfil
  // inteiro roda em sequência (executeProfile).
  const handleToggleServiceStep = async (step: AutomationStep, isRunning: boolean) => {
    if (!window.electronAPI) return;
    const target = step.targetName || step.name;
    await withStepLoading(step.id, isRunning ? 'stop' : 'run', async () => {
      if (isRunning) {
        await window.electronAPI.stopService(target);
      } else {
        await window.electronAPI.startService(target);
      }
      setTimeout(() => refreshAllStatus(), 1500);
    });
  };

  const handleRestartStep = async (step: AutomationStep) => {
    if (!window.electronAPI || !window.electronAPI.restartProfileStep) return;
    await withStepLoading(step.id, 'restart', async () => {
      await window.electronAPI.restartProfileStep(step, activeProfile?.name);
      setTimeout(() => refreshAllStatus(), 2000);
    });
  };

  return { stepActionLoading, handleRunStep, handleStopStep, handleToggleServiceStep, handleRestartStep };
}
