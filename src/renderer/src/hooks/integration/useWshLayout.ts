import { useEffect, useState } from 'react';
import type { WshRouteLayout } from '../../../../shared/wshMonitorTypes';

export type WshLayoutState = { loading: true } | { loading: false; error?: string; layouts: WshRouteLayout[] };

/**
 * Nível 2 do "Como resolver": as regras do JOLT das rotas do item que montam os campos recusados.
 * Só consulta quando há campo a explicar; recarrega quando muda o item.
 */
export function useWshLayout(routes: string[], fields: string[], itemIds: string[]): WshLayoutState | null {
  const [state, setState] = useState<WshLayoutState | null>(null);
  // Chave estável para o efeito não rodar a cada render com listas novas de mesmo conteúdo
  const key = JSON.stringify([routes, fields, itemIds]);
  useEffect(() => {
    const [r, f, ids] = JSON.parse(key) as [string[], string[], string[]];
    const load = window.electronAPI?.integrationWshLayout;
    if (!load || r.length === 0 || f.length === 0) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ loading: true });
    load({ routes: r, fields: f, itemIds: ids })
      .then((response) => {
        if (cancelled) return;
        setState(response.success ? { loading: false, layouts: response.layouts } : { loading: false, error: response.error, layouts: [] });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: (err as Error)?.message || 'Falha ao ler o layout do WSH.', layouts: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state;
}
