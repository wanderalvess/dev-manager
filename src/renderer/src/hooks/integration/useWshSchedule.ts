import { useEffect, useState } from 'react';
import type { WshScheduleInfo } from '../../../../shared/wshMonitorTypes';

export type WshScheduleState = { loading: true } | { loading: false; error?: string; info?: WshScheduleInfo };

/** Agendamento e situação do fluxo da rota no ambiente. Só consulta quando `enabled` (a ficha aberta). */
export function useWshSchedule(route: string, enabled: boolean): WshScheduleState | null {
  const [state, setState] = useState<WshScheduleState | null>(null);
  useEffect(() => {
    const load = window.electronAPI?.integrationWshSchedule;
    if (!load || !enabled || !route) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ loading: true });
    load(route)
      .then((response) => {
        if (cancelled) return;
        setState(response.success ? { loading: false, info: response.info } : { loading: false, error: response.error });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: (err as Error)?.message || 'Falha ao ler o agendamento do WSH.' });
      });
    return () => {
      cancelled = true;
    };
  }, [route, enabled]);
  return state;
}
