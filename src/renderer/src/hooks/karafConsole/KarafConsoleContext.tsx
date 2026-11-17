import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  CONSOLE_MODE_STORAGE_KEY,
  CONSOLE_WIDTH_STORAGE_KEY,
  type ConsoleDisplayMode,
  clampConsoleWidth,
  readStoredConsoleMode,
  readStoredConsoleWidth
} from '../../utils/karafConsoleBuffer';

interface KarafConsoleContextValue {
  logs: string[];
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  isOpen: boolean;
  width: number;
  displayMode: ConsoleDisplayMode;
  toggle: () => void;
  close: () => void;
  setWidth: (w: number) => void;
  toggleDisplayMode: () => void;
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
  const [width, setWidthState] = useState<number>(readStoredConsoleWidth);
  const [displayMode, setDisplayMode] = useState<ConsoleDisplayMode>(readStoredConsoleMode);
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
  const close = useCallback(() => setIsOpen(false), []);

  const setWidth = useCallback((w: number) => {
    const clamped = clampConsoleWidth(w);
    setWidthState(clamped);
    try {
      localStorage.setItem(CONSOLE_WIDTH_STORAGE_KEY, String(clamped));
    } catch {
      // ignora em ambiente sem storage
    }
  }, []);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prev) => {
      const next: ConsoleDisplayMode = prev === 'side' ? 'modal' : 'side';
      try {
        localStorage.setItem(CONSOLE_MODE_STORAGE_KEY, next);
      } catch {
        // ignora em ambiente sem storage
      }
      return next;
    });
  }, []);

  const openWithTail = useCallback((filter?: string) => {
    setIsOpen(true);
    setRequest({ tail: true, filter, nonce: Date.now() });
  }, []);

  return (
    <KarafConsoleContext.Provider
      value={{
        logs,
        setLogs,
        isOpen,
        width,
        displayMode,
        toggle,
        close,
        setWidth,
        toggleDisplayMode,
        openWithTail,
        request
      }}
    >
      {children}
    </KarafConsoleContext.Provider>
  );
};

export function useKarafConsole(): KarafConsoleContextValue {
  const ctx = useContext(KarafConsoleContext);
  if (!ctx) throw new Error('useKarafConsole must be inside KarafConsoleProvider');
  return ctx;
}
