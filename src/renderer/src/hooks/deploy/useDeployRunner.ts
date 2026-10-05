import { useState } from 'react';
import type { DeployProfile, DeployStep } from '../../../../shared/types';
import { buildDiagnosticResultLines } from '../../utils/deployProfileUtils';
import { useDeployProgress } from './useDeployProgress';

interface UseDeployRunnerArgs {
  profiles: DeployProfile[];
  activeProfile: DeployProfile | null;
  setActiveProfileId: (id: string) => void;
}

/** Orquestra execução de perfis, etapas isoladas e diagnósticos Karaf. */
export function useDeployRunner({ profiles, activeProfile, setActiveProfileId }: UseDeployRunnerArgs) {
  const progress = useDeployProgress();
  const {
    runningStepId,
    setRunningStepId,
    setStepExecutionTimes,
    setStepStatuses,
    setCurrentProgress,
    setTerminalLogs,
    activeResolutionDiag,
    setActiveResolutionDiag,
    streamRemainderRef,
    flushRemainder
  } = progress;
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [isDiagRunning, setIsDiagRunning] = useState<string | null>(null);

  const resetProgress = () => {
    setStepStatuses({});
    setCurrentProgress(null);
  };

  const clearConsole = () => {
    streamRemainderRef.current = '';
    setTerminalLogs([]);
    setActiveResolutionDiag(null);
  };

  const handleAbortDeploy = async () => {
    if (!isDeploying && !runningStepId) return;
    try {
      if (window.electronAPI?.abortDeploy) {
        await window.electronAPI.abortDeploy();
        setTerminalLogs((prev) => [...prev, '\r\n[INFO] Solicitando cancelamento da execução do deploy...\r\n']);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] Falha ao abortar deploy: ${err?.message || err}\r\n`]);
    }
  };

  const runProfileDirect = async (profileToRun: DeployProfile) => {
    if (isDeploying || isDiagRunning || !profileToRun) return;
    setIsDeploying(true);
    setStepStatuses({});
    setActiveResolutionDiag(null);
    const enabledSteps = profileToRun.steps.filter((s) => s.enabled !== false);
    setCurrentProgress({ current: 0, total: enabledSteps.length, stepId: enabledSteps[0]?.id || '' });
    streamRemainderRef.current = '';
    setTerminalLogs([]);

    try {
      const res = await window.electronAPI.runDeployProfile(profileToRun);
      if (res && !res.success && res.resolutionDiagnostic) {
        setActiveResolutionDiag(res.resolutionDiagnostic);
      }
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      flushRemainder();
      setIsDeploying(false);
      setCurrentProgress(null);
      setRunningStepId(null);
    }
  };

  const handleRunActiveProfile = () => {
    if (activeProfile) runProfileDirect(activeProfile);
  };

  const handleExecuteMatchedProfile = (profileIdOrName: string) => {
    const target = profiles.find((p) => p.id === profileIdOrName || p.name === profileIdOrName);
    if (!target) return;
    setActiveProfileId(target.id);
    setActiveResolutionDiag(null);
    setTimeout(() => {
      runProfileDirect(target);
    }, 150);
  };

  const handleRunSingleStep = async (step: DeployStep) => {
    if (isDeploying || runningStepId || isDiagRunning || !window.electronAPI?.runDeployStep) return;
    setRunningStepId(step.id);
    setActiveResolutionDiag(null);
    setStepStatuses((prev) => ({
      ...prev,
      [step.id]: { status: 'running' }
    }));
    streamRemainderRef.current = '';
    setTerminalLogs([]);
    const startTime = Date.now();

    try {
      const res = await window.electronAPI.runDeployStep(step, activeProfile?.name);
      const dur = Date.now() - startTime;
      setStepExecutionTimes((prev) => ({ ...prev, [step.id]: dur }));
      setStepStatuses((prev) => ({
        ...prev,
        [step.id]: {
          status: res.success ? 'completed' : 'failed',
          durationMs: dur,
          error: res.error
        }
      }));
      if (res && !res.success && res.resolutionDiagnostic) {
        setActiveResolutionDiag(res.resolutionDiagnostic);
      }
    } catch (err: any) {
      const dur = Date.now() - startTime;
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
      setStepStatuses((prev) => ({
        ...prev,
        [step.id]: { status: 'failed', durationMs: dur, error: err?.message || err }
      }));
    } finally {
      flushRemainder();
      setRunningStepId(null);
    }
  };

  const handleRunDiagnostic = async (cmd: string, label: string) => {
    if (isDeploying || isDiagRunning) return;
    setIsDiagRunning(label);
    streamRemainderRef.current = '';
    setTerminalLogs([`--- Executando Diagnóstico: ${cmd} ---\r\n`]);

    try {
      const res = await window.electronAPI.execKarafDiagnostic(cmd);
      const extra = buildDiagnosticResultLines(cmd, res);
      if (extra.length > 0) setTerminalLogs((prev) => [...prev, ...extra]);
    } catch (err: any) {
      setTerminalLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      flushRemainder();
      setIsDiagRunning(null);
    }
  };

  const handleInstallReleaseFeature = async () => {
    if (!activeResolutionDiag?.suggestedKarafCommands?.installCommand) return;
    const { repoAddCommand, installCommand } = activeResolutionDiag.suggestedKarafCommands;
    setActiveResolutionDiag(null);
    if (repoAddCommand) {
      await handleRunDiagnostic(repoAddCommand, 'repo-add');
    }
    if (installCommand) {
      await handleRunDiagnostic(installCommand, 'install-feature');
    }
  };

  const handleRunSuggestedDiagnostic = () => {
    if (activeResolutionDiag?.suggestedKarafCommands?.diagnosticCommand) {
      handleRunDiagnostic(activeResolutionDiag.suggestedKarafCommands.diagnosticCommand, 'diag');
    }
  };

  return {
    ...progress,
    isDeploying,
    isDiagRunning,
    resetProgress,
    clearConsole,
    handleAbortDeploy,
    handleRunActiveProfile,
    handleExecuteMatchedProfile,
    handleRunSingleStep,
    handleRunDiagnostic,
    handleInstallReleaseFeature,
    handleRunSuggestedDiagnostic
  };
}
