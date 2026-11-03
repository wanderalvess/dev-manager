import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiUsagePeriod, AiUsageReport } from '../../../../shared/types';

/** Carrega o uso local de tokens de IA do período (a tela só lê; quem grava é o `LlmService`). */
export function useAiUsage(period: AiUsagePeriod) {
  const [report, setReport] = useState<AiUsageReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const next = await window.electronAPI.getAiUsage(period);
      if (id !== requestId.current) return;
      setReport(next);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Não foi possível ler o uso de IA.');
    }
  }, [period]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { report, error, reload };
}
