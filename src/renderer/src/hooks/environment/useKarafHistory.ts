import { useCallback, useMemo, useState } from 'react';

export function useKarafHistory() {
  const [isOpen, setIsOpen] = useState(false);
  const [output, setOutput] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const open = useCallback(async () => {
    setIsOpen(true);
    setIsLoading(true);
    try {
      const res = await window.electronAPI?.getKarafPersistedLogs?.();
      setOutput(res?.output || '');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(async () => {
    await window.electronAPI?.clearKarafPersistedLogs?.();
    setOutput('');
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return output;
    const q = search.toLowerCase();
    return output.split('\n').filter((l) => l.toLowerCase().includes(q)).join('\n');
  }, [output, search]);

  return { isOpen, output, filtered, search, isLoading, setSearch, open, clear, close: () => setIsOpen(false) };
}
