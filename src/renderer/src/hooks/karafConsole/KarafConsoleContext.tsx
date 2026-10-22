import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { EnvironmentLog } from '../../../../shared/types';
import { splitStreamChunk } from '../../utils/deployProfileUtils';
import { appendConsoleEntries, capConsoleEntries, clampDockHeight, DOCK_DEFAULT_HEIGHT } from '../../utils/karafConsoleBuffer';

export type ConsoleEntry = string | EnvironmentLog;

/** Eventos que as páginas observam sem precisar assinar o IPC de novo. */
export type ConsoleEvent = { kind: 'env-log'; log: EnvironmentLog } | { kind: 'karaf-stdout' };

/** Pedido de outras telas ao dock: abrir, filtrar o texto e/ou iniciar o log:tail. O nonce distingue pedidos iguais. */
export interface ConsoleRequest {
  nonce: number;
  filter?: string;
  tail?: boolean;
}

interface KarafConsoleValue {
  request: ConsoleRequest | null;
  requestConsole: (req: Omit<ConsoleRequest, 'nonce'>) => void;
  logs: ConsoleEntry[];
  setLogs: Dispatch<SetStateAction<ConsoleEntry[]>>;
  streamRemainderRef: React.MutableRefObject<string>;
  flushRemainder: () => void;
  subscribe: (listener: (event: ConsoleEvent) => void) => () => void;
  isOpen: boolean;
  height: number;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  setHeight: (height: number) => void;
}

const KarafConsoleContext = createContext<KarafConsoleValue | null>(null);
const STORAGE_KEY = 'devManager.consoleDock';

function readStored(): { open: boolean; height: number } {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return { open: parsed.open === true, height: Number(parsed.height) || DOCK_DEFAULT_HEIGHT };
  } catch {
    return { open: false, height: DOCK_DEFAULT_HEIGHT };
  }
}

/** Dono único do buffer do console: assina os quatro canais de log uma vez e serve Ambiente, Deploy e o dock. */
export const KarafConsoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogsState] = useState<ConsoleEntry[]>([]);
  const [dock, setDock] = useState(readStored);
  const [request, setRequest] = useState<ConsoleRequest | null>(null);
  const streamRemainderRef = useRef('');
  const listenersRef = useRef(new Set<(event: ConsoleEvent) => void>());

  const setLogs = useCallback<Dispatch<SetStateAction<ConsoleEntry[]>>>((action) => {
    setLogsState((prev) => capConsoleEntries(typeof action === 'function' ? action(prev) : action));
  }, []);

  const flushRemainder = useCallback(() => {
    if (!streamRemainderRef.current) return;
    const leftover = streamRemainderRef.current;
    streamRemainderRef.current = '';
    setLogsState((prev) => appendConsoleEntries(prev, [leftover]));
  }, []);

  const subscribe = useCallback((listener: (event: ConsoleEvent) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;
    const emit = (event: ConsoleEvent) => listenersRef.current.forEach((fn) => fn(event));

    const appendChunk = (chunk: string) => {
      const { lines, remainder } = splitStreamChunk(streamRemainderRef.current, chunk);
      streamRemainderRef.current = remainder;
      if (lines.length > 0) setLogsState((prev) => appendConsoleEntries(prev, lines));
    };

    const unsubs = [
      api.onEnvLog((log) => {
        setLogsState((prev) => appendConsoleEntries(prev, [log]));
        emit({ kind: 'env-log', log });
      }),
      api.onKarafStdout((chunk) => {
        setLogsState((prev) => appendConsoleEntries(prev, [chunk]));
        emit({ kind: 'karaf-stdout' });
      }),
      api.onDeployLogChunk(appendChunk),
      api.onKarafLogChunk(appendChunk)
    ];
    return () => unsubs.forEach((unsub) => unsub());
  }, []);

  const requestConsole = useCallback((req: Omit<ConsoleRequest, 'nonce'>) => {
    setDock((prev) => {
      const next = { ...prev, open: true };
      persist(next);
      return next;
    });
    setRequest((prev) => ({ ...req, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  const persist = (next: { open: boolean; height: number }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* sem storage (janela privada/preview): o dock só não lembra o estado */
    }
  };

  const setOpen = useCallback((open: boolean) => {
    setDock((prev) => {
      const next = { ...prev, open };
      persist(next);
      return next;
    });
  }, []);

  const toggle = useCallback(() => {
    setDock((prev) => {
      const next = { ...prev, open: !prev.open };
      persist(next);
      return next;
    });
  }, []);

  const setHeight = useCallback((height: number) => {
    setDock((prev) => {
      const next = { ...prev, height: clampDockHeight(height, window.innerHeight) };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo<KarafConsoleValue>(
    () => ({
      request,
      requestConsole,
      logs,
      setLogs,
      streamRemainderRef,
      flushRemainder,
      subscribe,
      isOpen: dock.open,
      height: dock.height,
      setOpen,
      toggle,
      setHeight
    }),
    [request, requestConsole, logs, setLogs, flushRemainder, subscribe, dock, setOpen, toggle, setHeight]
  );

  return <KarafConsoleContext.Provider value={value}>{children}</KarafConsoleContext.Provider>;
};

export function useKarafConsole(): KarafConsoleValue {
  const ctx = useContext(KarafConsoleContext);
  if (!ctx) throw new Error('useKarafConsole precisa estar dentro de KarafConsoleProvider');
  return ctx;
}
