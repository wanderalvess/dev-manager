import { useCallback, useState } from 'react';
import type { IntegrationReadinessResult } from '../../../../shared/integrationTypes';

/** Pré-voo das camadas: roda sob demanda e guarda o último resultado enquanto a página estiver montada. */
export function useIntegrationReadiness() {
  const [result, setResult] = useState<IntegrationReadinessResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    const check = window.electronAPI?.integrationCheckReadiness;
    if (!check) {
      setError('O pré-voo não está disponível neste ambiente.');
      return;
    }
    setRunning(true);
    setError(null);
    try {
      setResult(await check());
    } catch (err) {
      setError((err as Error)?.message || 'Não foi possível executar o pré-voo.');
    } finally {
      setRunning(false);
    }
  }, []);

  return { result, running, error, run };
}
