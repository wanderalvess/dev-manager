import { useCallback, useState } from 'react';
import {
  ONLINE_ORDER_DEFAULT_LOOKBACK_HOURS,
  type OnlineOrderLogEntry,
  type OnlineOrderStatusFilter
} from '../../../../shared/onlineOrderLog';

/** Online do PDV: busca na PCLOGPEDIDOAPI por pedido, status e período. Só consulta quando o usuário pede. */
export function useOnlineOrderLog() {
  const [orderNumber, setOrderNumber] = useState('');
  const [status, setStatus] = useState<OnlineOrderStatusFilter>('all');
  const [lookbackHours, setLookbackHours] = useState(ONLINE_ORDER_DEFAULT_LOOKBACK_HOURS);
  const [entries, setEntries] = useState<OnlineOrderLogEntry[] | null>(null);
  const [limit, setLimit] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    const run = window.electronAPI?.integrationOnlineOrders;
    if (!run) {
      setError('A consulta dos pedidos online não está disponível neste ambiente.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await run({ orderNumber, status, lookbackHours });
      if (response.success) {
        setEntries(response.entries);
        setLimit(response.limit);
      } else {
        setError(response.error);
      }
    } catch (err) {
      setError((err as Error)?.message || 'Não foi possível consultar a PCLOGPEDIDOAPI.');
    } finally {
      setLoading(false);
    }
  }, [orderNumber, status, lookbackHours]);

  return {
    entries, limit, loading, error, search,
    filters: { orderNumber, status, lookbackHours, setOrderNumber, setStatus, setLookbackHours }
  };
}
