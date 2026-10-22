import { useEffect, useState } from 'react';
import type { DeployProgressEvent, OsgiResolutionDiagnosticSummary } from '../../../../shared/types';
import { useKarafConsole } from '../karafConsole/KarafConsoleContext';

export type DeployStepStatus = {
  status: 'running' | 'completed' | 'failed' | 'skipped';
  durationMs?: number;
  ignoredError?: boolean;
  error?: string;
};

export type DeployCurrentProgress = { current: number; total: number; stepId: string };

/** Estado de console e progresso alimentado pelos eventos IPC de deploy/Karaf. */
export function useDeployProgress() {
  const [runningStepId, setRunningStepId] = useState<string | null>(null);
  const [stepExecutionTimes, setStepExecutionTimes] = useState<Record<string, number>>({});
  const [stepStatuses, setStepStatuses] = useState<Record<string, DeployStepStatus>>({});
  const [currentProgress, setCurrentProgress] = useState<DeployCurrentProgress | null>(null);
  const [activeResolutionDiag, setActiveResolutionDiag] = useState<OsgiResolutionDiagnosticSummary | null>(null);
  // O buffer de texto é do console global (dock); aqui ficam só progresso e status das etapas.
  const { logs: terminalLogs, setLogs: setTerminalLogs, streamRemainderRef, flushRemainder } = useKarafConsole();

  // Listener de progresso em tempo real
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubProgress = window.electronAPI.onDeployStepProgress
      ? window.electronAPI.onDeployStepProgress((progress: DeployProgressEvent) => {
          setStepStatuses((prev) => ({
            ...prev,
            [progress.stepId]: {
              status: progress.status,
              durationMs: progress.durationMs,
              ignoredError: progress.ignoredError,
              error: progress.error
            }
          }));

          if (progress.status === 'running') {
            setRunningStepId(progress.stepId);
            setCurrentProgress({
              current: progress.stepIndex + 1,
              total: progress.totalSteps,
              stepId: progress.stepId
            });
          }

          if (progress.status === 'failed' && progress.resolutionDiagnostic) {
            setActiveResolutionDiag(progress.resolutionDiagnostic);
          }

          if (progress.durationMs !== undefined) {
            setStepExecutionTimes((prev) => ({
              ...prev,
              [progress.stepId]: progress.durationMs!
            }));
          }
        })
      : () => {};

    return () => {
      unsubProgress();
    };
  }, []);

  return {
    runningStepId,
    setRunningStepId,
    stepExecutionTimes,
    setStepExecutionTimes,
    stepStatuses,
    setStepStatuses,
    currentProgress,
    setCurrentProgress,
    terminalLogs,
    setTerminalLogs,
    activeResolutionDiag,
    setActiveResolutionDiag,
    streamRemainderRef,
    flushRemainder
  };
}
