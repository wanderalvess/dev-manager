import { useState, useEffect, useCallback } from 'react';
import type { Dispatch, RefObject, MutableRefObject, SetStateAction } from 'react';
import { RealtimeLogSource, LogWatchStatus, LogChunkEvent } from '../../../../shared/types';

const MAX_BUFFERED_LINES = 5000;

interface UseLogStreamParams {
  activeSource: RealtimeLogSource;
  initialLinesCount: number;
  isActive?: boolean;
  isPaused: boolean;
  isAutoScroll: boolean;
  scrollContainerRef: RefObject<HTMLDivElement>;
  isAutoScrollingRef: MutableRefObject<boolean>;
  setHasNewLinesBelow: Dispatch<SetStateAction<boolean>>;
  setActiveErrorIndex: Dispatch<SetStateAction<number>>;
}

/** Watch do arquivo ativo, polling de status e recebimento de chunks em tempo real. */
export function useLogStream({
  activeSource,
  initialLinesCount,
  isActive,
  isPaused,
  isAutoScroll,
  scrollContainerRef,
  isAutoScrollingRef,
  setHasNewLinesBelow,
  setActiveErrorIndex
}: UseLogStreamParams) {
  const [lines, setLines] = useState<string[]>([]);
  const [status, setStatus] = useState<LogWatchStatus | null>(null);

  const startWatchingActiveSource = useCallback(async () => {
    if (!activeSource.filePath || !window.electronAPI?.startLogWatch) return;

    setLines([]);
    setHasNewLinesBelow(false);
    setActiveErrorIndex(-1);

    try {
      const result = await window.electronAPI.startLogWatch(
        activeSource.id,
        activeSource.filePath,
        initialLinesCount,
        activeSource.encoding || 'utf-8'
      );

      setStatus(result.status);
      setLines(result.initialLines || []);

      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 80);
    } catch (err: any) {
      console.error('[LogsPage] Falha ao iniciar watch do arquivo:', err);
      setStatus({
        sourceId: activeSource.id,
        filePath: activeSource.filePath,
        exists: false,
        fileSizeBytes: 0,
        watching: false,
        error: err.message
      });
    }
  }, [activeSource, initialLinesCount, scrollContainerRef, setHasNewLinesBelow, setActiveErrorIndex]);

  useEffect(() => {
    startWatchingActiveSource();

    return () => {
      if (window.electronAPI?.stopLogWatch && activeSource.filePath) {
        window.electronAPI.stopLogWatch(activeSource.id);
      }
    };
  }, [startWatchingActiveSource, activeSource.filePath, activeSource.id]);

  // Checagem periódica do status do arquivo
  useEffect(() => {
    if (!window.electronAPI?.checkLogFile || !activeSource.filePath || isActive === false) return;

    const interval = setInterval(async () => {
      try {
        const currentStatus = await window.electronAPI.checkLogFile(activeSource.filePath, activeSource.id);
        setStatus((prev) => {
          if (!prev) return currentStatus;
          if (
            prev.exists !== currentStatus.exists ||
            prev.fileSizeBytes !== currentStatus.fileSizeBytes ||
            prev.lastModified !== currentStatus.lastModified
          ) {
            return currentStatus;
          }
          return prev;
        });
      } catch {
        // Silencioso
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeSource, isActive]);

  // Ouvir novos chunks de log emitidos pelo backend
  useEffect(() => {
    if (!window.electronAPI?.onLogChunk) return;

    const unsubscribe = window.electronAPI.onLogChunk((chunkEvent: LogChunkEvent) => {
      if (chunkEvent.sourceId !== activeSource.id) return;

      if (chunkEvent.truncatedOrRotated) {
        setLines(['--- [ARQUIVO ROTACIONADO OU TRUNCADO] ---']);
        return;
      }

      setLines((prev) => {
        const next = [...prev, ...chunkEvent.lines];
        return next.length > MAX_BUFFERED_LINES ? next.slice(next.length - MAX_BUFFERED_LINES) : next;
      });

      if (!isPaused && isAutoScroll) {
        isAutoScrollingRef.current = true;
        requestAnimationFrame(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        });
      } else {
        setHasNewLinesBelow(true);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeSource.id, isPaused, isAutoScroll, scrollContainerRef, isAutoScrollingRef, setHasNewLinesBelow]);

  return { lines, setLines, status, setStatus };
}
