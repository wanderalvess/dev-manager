import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Commits sem push de todos os repositórios (alimenta o filtro "Sem push" e o passo de publicação do PR).
 * Lê só refs locais, então é barato; mesmo assim roda uma por vez e só quando a aba abre ou sincroniza.
 */
export function useGitUnpushedCounts(settingsVersion?: number) {
  const [unpushedCounts, setUnpushedCounts] = useState<Record<string, number>>({});
  const isCountingRef = useRef(false);
  const rerunRef = useRef(false);

  const refreshUnpushedCounts = useCallback(async () => {
    if (!window.electronAPI?.getGitUnpushedCounts) return;
    // Pedido durante uma contagem em andamento (ex.: logo após um push): repete ao terminar, senão ficaria o número de antes.
    if (isCountingRef.current) {
      rerunRef.current = true;
      return;
    }
    isCountingRef.current = true;
    try {
      do {
        rerunRef.current = false;
        setUnpushedCounts((await window.electronAPI.getGitUnpushedCounts()) || {});
      } while (rerunRef.current);
    } catch (err) {
      console.warn('[Git] Erro ao contar commits sem push dos repositórios:', err);
    } finally {
      isCountingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshUnpushedCounts();
  }, [settingsVersion, refreshUnpushedCounts]);

  return { unpushedCounts, refreshUnpushedCounts };
}
