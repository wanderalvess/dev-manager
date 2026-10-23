import { useEffect, useMemo, useState } from 'react';
import { appendLogChunk, filterLogLines } from '../../utils/routine801ModalUtils';

export const useRoutine801Console = () => {
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERRORS'>('ALL');

  // Streaming de logs do console Karaf
  useEffect(() => {
    if (!window.electronAPI?.onKarafLogChunk) return;
    const unsub = window.electronAPI.onKarafLogChunk((chunk: string) => {
      setConsoleLogs((prev) => appendLogChunk(prev, chunk));
    });
    return () => unsub();
  }, []);

  const displayedLogs = useMemo(() => filterLogLines(consoleLogs, logFilter), [consoleLogs, logFilter]);

  return {
    consoleLogs,
    setConsoleLogs,
    isConsoleExpanded,
    setIsConsoleExpanded,
    logFilter,
    setLogFilter,
    displayedLogs
  };
};
