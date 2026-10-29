import { useEffect, useState } from 'react';
import { findFlowByRoute } from '../../../../shared/wshFlowCatalog';
import type { WshDependency } from '../../../../shared/wshMonitorTypes';

export type WshDependenciesState =
  | { loading: true }
  | { loading: false; error?: string; dependencies: WshDependency[]; periodDays: number };

/**
 * Situação dos fluxos de que o fluxo da rota depende (Monitor do WSH). Uma consulta por rota: o cartão de dependências
 * e o "Como resolver" usam o mesmo resultado. Rota fora do catálogo ou sem dependências não consulta nada.
 */
export function useWshDependencies(route: string): WshDependenciesState | null {
  const enabled = Boolean(findFlowByRoute(route)?.dependsOn?.length);
  const [state, setState] = useState<WshDependenciesState | null>(null);
  useEffect(() => {
    const load = window.electronAPI?.integrationWshDependencies;
    if (!enabled || !load) {
      setState(null);
      return;
    }
    let cancelled = false;
    setState({ loading: true });
    load(route)
      .then((response) => {
        if (cancelled) return;
        setState(
          response.success
            ? { loading: false, dependencies: response.dependencies, periodDays: response.periodDays }
            : { loading: false, error: response.error, dependencies: [], periodDays: 0 }
        );
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, error: (err as Error)?.message || 'Falha ao consultar as dependências.', dependencies: [], periodDays: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [route, enabled]);
  return state;
}
