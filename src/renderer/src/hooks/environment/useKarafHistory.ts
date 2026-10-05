import { useState, useMemo } from 'react';
import { filterLogLines } from '../../utils/environmentPageUtils';

/** Histórico persistido do console Karaf embedded (sobrevive a reinícios, diferente do console ao vivo). */
export function useKarafHistory() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const filtered = useMemo(() => filterLogLines(output, search), [output, search]);

  const open = async () => {
    setIsOpen(true);
    setSearch('');
    if (!window.electronAPI?.getKarafPersistedLogs) return;
    setIsLoading(true);
    try {
      const res = await window.electronAPI.getKarafPersistedLogs();
      setOutput(res?.output || '');
    } finally {
      setIsLoading(false);
    }
  };

  const clear = async () => {
    if (!window.electronAPI?.clearKarafPersistedLogs) return;
    await window.electronAPI.clearKarafPersistedLogs();
    setOutput('');
  };

  const close = () => setIsOpen(false);

  return { isOpen, output, filtered, isLoading, search, setSearch, open, clear, close };
}
