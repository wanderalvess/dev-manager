import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AutomationProfile } from '../../../../shared/types';
import type { EnvironmentLogEntry } from './useEnvironmentLogs';

interface UseEnvironmentProfileRunOptions {
  activeProfile: AutomationProfile | null;
  refreshAllStatus: () => void;
  setLogs: Dispatch<SetStateAction<EnvironmentLogEntry[]>>;
  setActionLoading: Dispatch<SetStateAction<string | null>>;
}

/** Execução da esteira completa do perfil ativo (subir, parar, reiniciar) e progresso por etapa. */
export function useEnvironmentProfileRun({
  activeProfile,
  refreshAllStatus,
  setLogs,
  setActionLoading
}: UseEnvironmentProfileRunOptions) {
  const [isRunningProfile, setIsRunningProfile] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [activeStepTotal, setActiveStepTotal] = useState<number>(0);
  const [currentRunningStepId, setCurrentRunningStepId] = useState<string | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubStep = window.electronAPI.onProfileStepProgress?.((data) => {
      setActiveStepIndex(data.stepIndex);
      setActiveStepTotal(data.totalSteps);
      setCurrentRunningStepId(data.step.id);
    });
    return () => {
      if (unsubStep) unsubStep();
    };
  }, []);

  const handleRunActiveProfile = async () => {
    if (isRunningProfile || !activeProfile) return;
    if (!window.electronAPI || !window.electronAPI.runProfile) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          message: 'Interface desktop não detectada.'
        }
      ]);
      return;
    }

    setIsRunningProfile(true);
    setActiveStepIndex(1);
    setActiveStepTotal(activeProfile.steps.filter((s) => s.enabled !== false).length);
    setLogs([]);

    try {
      await window.electronAPI.runProfile(activeProfile);
      refreshAllStatus();
    } catch (err: any) {
      setLogs((prev) => [
        ...prev,
        {
          timestamp: new Date().toLocaleTimeString(),
          type: 'error',
          message: `Falha na execução do perfil: ${err?.message || err}`
        }
      ]);
    } finally {
      setIsRunningProfile(false);
      setCurrentRunningStepId(null);
    }
  };

  const handleStopActiveProfile = async () => {
    if (!activeProfile || !window.electronAPI || !window.electronAPI.stopProfile) return;
    setActionLoading('stop-all');
    try {
      await window.electronAPI.stopProfile(activeProfile);
      refreshAllStatus();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestartActiveProfile = async () => {
    if (!activeProfile) return;
    await handleStopActiveProfile();
    await new Promise((r) => setTimeout(r, 1500));
    await handleRunActiveProfile();
  };

  return {
    isRunningProfile,
    activeStepIndex,
    activeStepTotal,
    currentRunningStepId,
    handleRunActiveProfile,
    handleStopActiveProfile,
    handleRestartActiveProfile
  };
}
