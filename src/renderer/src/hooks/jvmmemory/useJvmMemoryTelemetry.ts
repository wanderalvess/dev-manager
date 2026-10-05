import { useState, useEffect } from 'react';
import type { KarafJvmMemoryInfo } from '../../../../shared/types';
import { apiBridge } from '../../services/apiBridge';
import { appendHistoryPoint, type TelemetryPoint } from '../../utils/jvmMemoryModalUtils';

export const useJvmMemoryTelemetry = (isOpen: boolean) => {
  const [metrics, setMetrics] = useState<KarafJvmMemoryInfo | null>(null);
  const [history, setHistory] = useState<TelemetryPoint[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGcRunning, setIsGcRunning] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(3);
  const [gcFeedback, setGcFeedback] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const data = await apiBridge.getKarafJvmMemory();
      setMetrics(data);
      const now = new Date();
      setHistory((prev) => appendHistoryPoint(prev, data, now));
    } catch (err: any) {
      setFetchError(err?.message || 'Falha ao conectar na JVM ou shell Karaf.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchMetrics();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !autoRefresh) return;
    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [isOpen, autoRefresh, refreshIntervalSec]);

  const handleTriggerGc = async () => {
    if (isGcRunning) return;
    try {
      setIsGcRunning(true);
      setGcFeedback(null);
      const res = await apiBridge.triggerKarafGc();
      if (res.success) {
        setGcFeedback('Garbage Collection disparado com sucesso na JVM!');
        // Dá tempo à JVM de concluir o GC antes de reamostrar
        setTimeout(() => {
          fetchMetrics();
        }, 800);
      } else {
        setGcFeedback(`Aviso: ${res.output || (res as any).message || 'Falha ao disparar GC'}`);
      }
    } catch (err: any) {
      setGcFeedback(`Falha ao disparar GC: ${err?.message || err}`);
    } finally {
      setIsGcRunning(false);
      setTimeout(() => setGcFeedback(null), 4000);
    }
  };

  return {
    metrics,
    history,
    isLoading,
    isGcRunning,
    autoRefresh,
    setAutoRefresh,
    refreshIntervalSec,
    setRefreshIntervalSec,
    gcFeedback,
    fetchError,
    fetchMetrics,
    handleTriggerGc
  };
};
