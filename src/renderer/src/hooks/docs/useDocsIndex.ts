import { useCallback, useEffect, useState } from 'react';
import type { DocsIndexProgress, DocsIndexStatus } from '../../../../shared/types';

/** Estado do índice RAG: status, indexação e progresso emitido pelo main. */
export function useDocsIndex() {
  const [status, setStatus] = useState<DocsIndexStatus | null>(null);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [progress, setProgress] = useState<DocsIndexProgress | null>(null);
  const [indexError, setIndexError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (window.electronAPI) {
      setStatus(await window.electronAPI.getDocsIndexStatus());
    }
  }, []);

  useEffect(() => {
    const unsubIndex = window.electronAPI?.onDocsIndexProgress?.(setProgress);
    return () => {
      unsubIndex?.();
    };
  }, []);

  const handleReindex = async () => {
    if (!window.electronAPI) return;
    setIsIndexing(true);
    setProgress(null);
    setIndexError(null);
    try {
      const updated = await window.electronAPI.reindexDocs();
      setStatus(updated);
    } catch (err: any) {
      console.error('Erro ao indexar documentação:', err);
      setIndexError(err?.message || 'Falha ao indexar documentação.');
    } finally {
      setIsIndexing(false);
      setProgress(null);
    }
  };

  return { status, isIndexing, progress, indexError, loadStatus, handleReindex };
}
