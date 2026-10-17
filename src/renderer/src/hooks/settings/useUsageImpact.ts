import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UsageDays, UsageImpact } from '../../../../shared/types';
import { sanitizeBaselineOverrides, type UsageBaselineOverrides } from '../../../../shared/usageBaselines';
import { computeImpact } from '../../../../shared/usageImpact';

interface UseUsageImpactResult {
  impact: UsageImpact | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Carrega os contadores por dia e calcula a economia aqui, com as linhas de base do RASCUNHO das
 * configurações: quem edita um tempo vê o efeito na hora, antes de salvar (issue #13).
 */
export function useUsageImpact(overrides: UsageBaselineOverrides | undefined): UseUsageImpactResult {
  const [days, setDays] = useState<UsageDays | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setDays(await window.electronAPI.getUsageDays());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler o histórico de uso.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const impact = useMemo(
    () => (days ? computeImpact(days, sanitizeBaselineOverrides(overrides), new Date()) : null),
    [days, overrides]
  );

  return { impact, loading, error, reload };
}
