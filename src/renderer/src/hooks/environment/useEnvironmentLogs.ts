import { useState, useEffect } from 'react';
import type { EnvironmentLog } from '../../../../shared/types';
import { appendCapped } from '../../utils/environmentStepDisplay';

export type EnvironmentLogEntry = string | EnvironmentLog;

interface UseEnvironmentLogsOptions {
  refreshAllStatus: () => void;
  checkKarafRunning: () => void;
}

/** Console de operações: acumula logs do ambiente e do Karaf com buffer limitado (1000 linhas). */
export function useEnvironmentLogs({ refreshAllStatus, checkKarafRunning }: UseEnvironmentLogsOptions) {
  const [logs, setLogs] = useState<EnvironmentLogEntry[]>([]);

  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubEnv = window.electronAPI.onEnvLog((newLog) => {
      setLogs((prev) => appendCapped(prev, newLog));
      if (newLog.message.includes('sucesso') || newLog.message.includes('🎉')) {
        refreshAllStatus();
      }
    });

    const unsubKaraf = window.electronAPI.onKarafStdout((chunk) => {
      setLogs((prev) => appendCapped(prev, chunk));
      checkKarafRunning();
    });

    return () => {
      unsubEnv();
      unsubKaraf();
    };
  }, [refreshAllStatus, checkKarafRunning]);

  return { logs, setLogs };
}
