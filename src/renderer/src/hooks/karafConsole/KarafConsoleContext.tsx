import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DOCK_DEFAULT_HEIGHT, DOCK_MAX_HEIGHT, DOCK_MIN_HEIGHT } from '../../utils/karafConsoleBuffer';

interface KarafConsoleContextValue {
  logs: string[];
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  isOpen: boolean;
  height: number;
  toggle: () => void;
  setHeight: (h: number) => void;
  openWithTail: (filter?: string) => void;
  request: { tail?: boolean; filter?: string; nonce: number } | null;
}

const KarafConsoleContext = createContext<KarafConsoleContextValue | null>(null);

export const KarafConsoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<string[]>([
    '[INFO] Console Karaf OSGi conectado (porta SSH :8101 | debug :5005)',
    '[INFO] Digite "la" ou "bundle:list" para listar bundles ativos.'
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeightState] = useState(DOCK_DEFAULT_HEIGHT);
  const [request, setRequest] = useState<{ tail?: boolean; filter?: string; nonce: number } | null>(null);

  useEffect(() => {
    const unsub = window.electronAPI?.onKarafStdout?.((chunk: string) => {
      const lines = chunk.split('\n').filter((l) => l.length > 0);
      if (lines.length > 0) {
        setLogs((prev) => [...prev.slice(-800), ...lines]);
      }
    });
    return () => unsub?.();
  }, []);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const setHeight = useCallback((h: number) => {
    setHeightState(Math.max(DOCK_MIN_HEIGHT, Math.min(DOCK_MAX_HEIGHT, h)));
  }, []);
  const openWithTail = useCallback((filter?: string) => {
    setIsOpen(true);
    setRequest({ tail: true, filter, nonce: Date.now() });
  }, []);

  return (
    <KarafConsoleContext.Provider value={{ logs, setLogs, isOpen, height, toggle, setHeight, openWithTail, request }}>
      {children}
    </KarafConsoleContext.Provider>
  );
};

export function useKarafConsole(): KarafConsoleContextValue {
  const ctx = useContext(KarafConsoleContext);
  if (!ctx) throw new Error('useKarafConsole must be inside KarafConsoleProvider');
  return ctx;
}
