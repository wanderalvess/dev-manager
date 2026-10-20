import { useCallback, useEffect, useRef, useState } from 'react';
import type { UsageSummary } from '../../../../shared/types';
import { rangeToQuery, type UsageRange } from '../../utils/usageViewUtils';

interface UseUsageMetricsResult {
  summary: UsageSummary | null;
  loading: boolean;
  error: string | null;
  range: UsageRange;
  setRange: (range: UsageRange) => void;
  reload: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

/** Carrega o resumo local de uso e expõe o apagar do histórico (issue #12). O liga/desliga é uma configuração normal. */
export function useUsageMetrics(): UseUsageMetricsResult {
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<UsageRange>('30d');
  // Descarta a resposta de uma consulta antiga quando o período muda no meio do carregamento.
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const next = await window.electronAPI.getUsageSummary(rangeToQuery(range));
      if (id !== requestId.current) return;
      setSummary(next);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Não foi possível ler as métricas de uso.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const clearHistory = useCallback(async () => {
    await window.electronAPI.clearUsageMetrics();
    await reload();
  }, [reload]);

  return { summary, loading, error, range, setRange, reload, clearHistory };
}
