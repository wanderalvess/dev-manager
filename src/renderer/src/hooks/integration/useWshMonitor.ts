import { useCallback, useEffect, useState } from 'react';
import { WSH_DEFAULT_LOOKBACK_HOURS, type WshItem, type WshRoute, type WshStatusFilter } from '../../../../shared/wshMonitorTypes';
import { showToast } from '../../components/ToastHost';
import { wshItemMarkdown } from '../../utils/wshItemView';

/** Monitor do WSH: rotas para o filtro, busca na PCINTEGRACAOCORE e o item aberto no detalhe. */
export function useWshMonitor(settingsVersion?: number) {
  const [routes, setRoutes] = useState<WshRoute[]>([]);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [items, setItems] = useState<WshItem[] | null>(null);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [routeId, setRouteId] = useState<number | undefined>(undefined);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<WshStatusFilter>('error');
  const [lookbackHours, setLookbackHours] = useState(WSH_DEFAULT_LOOKBACK_HOURS);

  useEffect(() => {
    let cancelled = false;
    const load = window.electronAPI?.integrationWshRoutes;
    if (!load) return;
    load()
      .then((response) => {
        if (cancelled) return;
        if (response.success) {
          setRoutes(response.routes);
          setRoutesError(null);
        } else {
          setRoutes([]);
          setRoutesError(response.error);
        }
      })
      .catch((err) => !cancelled && setRoutesError((err as Error)?.message || 'Não foi possível listar as rotas do WSH.'));
    return () => {
      cancelled = true;
    };
  }, [settingsVersion]);

  const search = useCallback(async () => {
    const run = window.electronAPI?.integrationWshSearch;
    if (!run) {
      setError('O monitor do WSH não está disponível neste ambiente.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await run({ routeId, text, status, lookbackHours });
      if (response.success) {
        setItems(response.items);
        setLimit(response.limit);
        // Mantém o item aberto se ele ainda está na lista; senão abre o primeiro
        setSelectedId((previous) => (response.items.some((item) => item.id === previous) ? previous : (response.items[0]?.id ?? null)));
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError((err as Error)?.message || 'Não foi possível consultar o WSH.');
    } finally {
      setLoading(false);
    }
  }, [routeId, text, status, lookbackHours]);

  const selected = items?.find((item) => item.id === selectedId) ?? null;

  const copySelected = useCallback(async () => {
    if (!selected) return;
    try {
      await navigator.clipboard.writeText(wshItemMarkdown(selected));
      showToast('Resumo copiado para colar no Jira.', 'success');
    } catch {
      showToast('Não foi possível copiar o resumo.', 'error');
    }
  }, [selected]);

  return {
    routes, routesError, items, limit, loading, error, selected,
    filters: { routeId, text, status, lookbackHours, setRouteId, setText, setStatus, setLookbackHours },
    search, select: setSelectedId, copySelected
  };
}
