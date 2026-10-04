import { useEffect, useMemo, useRef, useState } from 'react';
import { appendLogChunk, filterLogLines } from '../../utils/routine801ModalUtils';

export const useRoutine801Console = () => {
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'ERRORS'>('ALL');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Streaming de logs do console Karaf
  useEffect(() => {
    if (!window.electronAPI?.onKarafLogChunk) return;
    const unsub = window.electronAPI.onKarafLogChunk((chunk: string) => {
      setConsoleLogs((prev) => appendLogChunk(prev, chunk));
    });
    return () => unsub();
  }, []);

  // Scroll automático do console
  useEffect(() => {
    if (isConsoleExpanded && consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, isConsoleExpanded]);

  const displayedLogs = useMemo(() => filterLogLines(consoleLogs, logFilter), [consoleLogs, logFilter]);

  return {
    consoleLogs,
    setConsoleLogs,
    isConsoleExpanded,
    setIsConsoleExpanded,
    logFilter,
    setLogFilter,
    consoleEndRef,
    displayedLogs
  };
};
