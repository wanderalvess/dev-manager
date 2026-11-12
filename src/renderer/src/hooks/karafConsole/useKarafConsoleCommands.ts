import { useCallback, useEffect, useState } from 'react';
import { useKarafConsole } from './KarafConsoleContext';

export function useKarafConsoleCommands(isOpen: boolean) {
  const [isEmbeddedRunning, setIsEmbeddedRunning] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const { setLogs } = useKarafConsole();

  useEffect(() => {
    if (!isOpen) return;
    window.electronAPI?.isEmbeddedKarafRunning?.().then(setIsEmbeddedRunning).catch(() => {});
  }, [isOpen]);

  const sendCommand = useCallback(async (cmd: string) => {
    if (!cmd.trim()) return;
    setIsBusy(true);
    try {
      const res = await window.electronAPI?.execKarafDiagnostic?.(cmd);
      if (res?.stdout) {
        const lines = res.stdout.split('\n').filter(Boolean);
        setLogs((prev) => [...prev.slice(-800), `karaf@root()> ${cmd}`, ...lines]);
      }
    } finally {
      setIsBusy(false);
    }
  }, [setLogs]);

  return { isEmbeddedRunning, isBusy, sendCommand };
}
