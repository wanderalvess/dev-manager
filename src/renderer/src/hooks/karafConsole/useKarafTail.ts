import { useCallback, useState } from 'react';

export function useKarafTail() {
  const [isTailing, setIsTailing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const start = useCallback(async () => {
    setIsStarting(true);
    setIsTailing(true);
    await window.electronAPI?.execKarafDiagnostic?.('log:display');
    setIsStarting(false);
  }, []);

  const stop = useCallback(async () => {
    setIsTailing(false);
  }, []);

  return { isTailing, isStarting, start, stop };
}
