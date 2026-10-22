import { useCallback, useEffect, useRef, useState } from 'react';
import { useKarafConsole } from './KarafConsoleContext';

/** log:tail ao vivo: um stream por vez no dock; a saída chega pelo buffer global do console. */
export function useKarafTail() {
  const { setLogs } = useKarafConsole();
  const [streamId, setStreamId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const streamIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsub = window.electronAPI?.onKarafStreamEnd?.((event) => {
      if (event.id !== streamIdRef.current) return;
      streamIdRef.current = null;
      setStreamId(null);
      setLogs((prev) => [...prev, `[INFO] Tail encerrado (código ${event.code}).\r\n`]);
    });
    return () => unsub?.();
  }, [setLogs]);

  const start = useCallback(async () => {
    if (streamIdRef.current || !window.electronAPI?.startKarafStream) return;
    setIsStarting(true);
    try {
      const res = await window.electronAPI.startKarafStream('log:tail');
      if (res.success) {
        streamIdRef.current = res.id;
        setStreamId(res.id);
      } else {
        setLogs((prev) => [...prev, `[ERRO] ${res.error}\r\n`]);
      }
    } catch (err: any) {
      setLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      setIsStarting(false);
    }
  }, [setLogs]);

  const stop = useCallback(async () => {
    const id = streamIdRef.current;
    if (id) await window.electronAPI?.stopKarafStream?.(id);
  }, []);

  return { isTailing: streamId !== null, isStarting, start, stop };
}
