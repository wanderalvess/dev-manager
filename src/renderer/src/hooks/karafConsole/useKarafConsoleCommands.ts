import { useCallback, useEffect, useRef, useState } from 'react';
import { buildDiagnosticResultLines } from '../../utils/deployProfileUtils';
import { useKarafConsole } from './KarafConsoleContext';

const STATUS_POLL_MS = 8000;

/** Status do Karaf embedded e envio de comandos do dock (console embutido ou client do Karaf). */
export function useKarafConsoleCommands(pollStatus: boolean) {
  const { setLogs, subscribe, flushRemainder, streamRemainderRef } = useKarafConsole();
  const [isEmbeddedRunning, setIsEmbeddedRunning] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const checkingRef = useRef(false);

  const checkStatus = useCallback(async () => {
    if (checkingRef.current || !window.electronAPI?.isEmbeddedKarafRunning) return;
    checkingRef.current = true;
    try {
      const running = await window.electronAPI.isEmbeddedKarafRunning();
      setIsEmbeddedRunning((prev) => (prev === running ? prev : running));
    } catch {
      /* mantém o último estado conhecido; o próximo ciclo tenta de novo */
    } finally {
      checkingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!pollStatus) return;
    void checkStatus();
    const timer = setInterval(() => void checkStatus(), STATUS_POLL_MS);
    const unsub = subscribe((event) => {
      if (event.kind === 'karaf-stdout') void checkStatus();
    });
    return () => {
      clearInterval(timer);
      unsub();
    };
  }, [pollStatus, checkStatus, subscribe]);

  const sendCommand = useCallback(
    async (cmd: string) => {
      const api = window.electronAPI;
      if (!api) return;
      if (isEmbeddedRunning && api.sendKarafInput) {
        setLogs((prev) => [...prev, `karaf@root()> ${cmd}\r\n`]);
        api.sendKarafInput(cmd);
        return;
      }
      if (isBusy) return;
      setIsBusy(true);
      streamRemainderRef.current = '';
      setLogs((prev) => [...prev, `karaf@root()> ${cmd}\r\n`]);
      try {
        const res = await api.execKarafDiagnostic(cmd);
        const extra = buildDiagnosticResultLines(cmd, res);
        if (extra.length > 0) setLogs((prev) => [...prev, ...extra]);
      } catch (err: any) {
        setLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
      } finally {
        flushRemainder();
        setIsBusy(false);
      }
    },
    [isEmbeddedRunning, isBusy, setLogs, flushRemainder, streamRemainderRef]
  );

  return { isEmbeddedRunning, isBusy, sendCommand };
}
