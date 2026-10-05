import { useState, useEffect, useCallback } from 'react';
import type { BatchRoutineItemProgress, BatchRoutineDownloadResult } from '../../../../shared/types';
import { parseBatchCodes, upsertBatchProgress } from '../../utils/ccwModalUtils';

/** Estado, listener de progresso e ação da aba "Atualização em Lote". */
export function useCcwBatch(onSuccess: () => void) {
  const [batchTargetType, setBatchTargetType] = useState<'favorites' | 'module' | 'custom'>('favorites');
  const [batchModuleFolder, setBatchModuleFolder] = useState<string>('MOD-001');
  const [batchCustomCodes, setBatchCustomCodes] = useState<string>('');
  const [batchWinthorVersion, setBatchWinthorVersion] = useState<string>('30');
  const [batchBackupExisting, setBatchBackupExisting] = useState<boolean>(true);
  const [isBatchRunning, setIsBatchRunning] = useState<boolean>(false);
  const [batchProgressList, setBatchProgressList] = useState<BatchRoutineItemProgress[]>([]);
  const [batchSummary, setBatchSummary] = useState<BatchRoutineDownloadResult | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const handleStartBatchDownload = async () => {
    if (!window.electronAPI?.downloadRoutinesBatch) return;

    setIsBatchRunning(true);
    setBatchSummary(null);
    setBatchError(null);
    setBatchProgressList([]);

    const codes = batchTargetType === 'custom' ? parseBatchCodes(batchCustomCodes) : undefined;

    try {
      const res = await window.electronAPI.downloadRoutinesBatch({
        targetType: batchTargetType,
        winthorVersion: batchWinthorVersion.trim() || '30',
        moduleFolder: batchTargetType === 'module' ? batchModuleFolder : undefined,
        routineCodes: codes,
        backupExisting: batchBackupExisting
      });

      setBatchSummary(res);
      if (res.success) {
        onSuccess();
      } else {
        setBatchError(res.message || 'Falha no download em lote.');
      }
    } catch (err: any) {
      setBatchError(err?.message || 'Erro inesperado no download em lote.');
    } finally {
      setIsBatchRunning(false);
    }
  };

  // Listener de eventos de progresso do batch
  useEffect(() => {
    if (!window.electronAPI?.onRoutineBatchProgress) return;
    const unsubscribe = window.electronAPI.onRoutineBatchProgress((progress) => {
      setBatchProgressList((prev) => upsertBatchProgress(prev, progress));
    });
    return () => unsubscribe();
  }, []);

  const resetBatchFeedback = useCallback(() => {
    setBatchSummary(null);
    setBatchError(null);
    setBatchProgressList([]);
  }, []);

  return {
    batchTargetType,
    setBatchTargetType,
    batchModuleFolder,
    setBatchModuleFolder,
    batchCustomCodes,
    setBatchCustomCodes,
    batchWinthorVersion,
    setBatchWinthorVersion,
    batchBackupExisting,
    setBatchBackupExisting,
    isBatchRunning,
    batchProgressList,
    batchSummary,
    batchError,
    handleStartBatchDownload,
    resetBatchFeedback
  };
}
