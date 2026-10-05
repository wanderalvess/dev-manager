import { useEffect, useRef, useState } from 'react';
import type { DeployProgressEvent, OsgiResolutionDiagnosticSummary } from '../../../../shared/types';
import { appendCappedLogLines, splitStreamChunk } from '../../utils/deployProfileUtils';

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
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [activeResolutionDiag, setActiveResolutionDiag] = useState<OsgiResolutionDiagnosticSummary | null>(null);
  const streamRemainderRef = useRef<string>('');

  // Descarrega qualquer resto de linha pendente no buffer do stream
  const flushRemainder = () => {
    if (streamRemainderRef.current) {
      const leftover = streamRemainderRef.current;
      streamRemainderRef.current = '';
      setTerminalLogs((prev) => appendCappedLogLines(prev, [leftover]));
    }
  };

  // Listeners de log e progresso em tempo real
  useEffect(() => {
    if (!window.electronAPI) return;

    const appendChunks = (chunk: string) => {
      const { lines, remainder } = splitStreamChunk(streamRemainderRef.current, chunk);
      streamRemainderRef.current = remainder;

      if (lines.length > 0) {
        setTerminalLogs((prev) => appendCappedLogLines(prev, lines));
      }
    };

    const unsubDeploy = window.electronAPI.onDeployLogChunk(appendChunks);
    const unsubKaraf = window.electronAPI.onKarafLogChunk(appendChunks);

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
      unsubDeploy();
      unsubKaraf();
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
