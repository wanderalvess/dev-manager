import React, { useEffect, useState } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import { findFlowByRoute, flowLabel, hintedDependencies } from '../../../../../shared/wshFlowCatalog';
import type { WshDependency, WshItem } from '../../../../../shared/wshMonitorTypes';
import { formatTraceTime } from '../../../utils/integrationTraceView';
import { flowFacts } from '../../../utils/wshFlowView';

type DepsState = { loading: true } | { loading: false; error?: string; dependencies: WshDependency[]; periodDays: number };

/** Busca a situação das dependências do fluxo do item; recarrega só quando muda a rota. */
function useDependencies(route: string, enabled: boolean): DepsState | null {
  const [state, setState] = useState<DepsState | null>(null);
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
        setState(response.success ? { loading: false, dependencies: response.dependencies, periodDays: response.periodDays } : { loading: false, error: response.error, dependencies: [], periodDays: 0 });
      })
      .catch((err) => !cancelled && setState({ loading: false, error: (err as Error)?.message || 'Falha ao consultar as dependências.', dependencies: [], periodDays: 0 }));
    return () => {
      cancelled = true;
    };
  }, [route, enabled]);
  return state;
}

function dependencyLine(dep: WshDependency, periodDays: number): { text: string; tone: string } {
  if (!dep.found) return { text: 'Nunca integrou neste banco.', tone: 'text-danger' };
  const last = `Último: ${dep.lastLabel ?? 'sem status'}${dep.lastAt ? ` em ${formatTraceTime(dep.lastAt)}` : ''}`;
  const period = dep.periodTotal === 0 ? `nada nos últimos ${periodDays} dias` : `${dep.periodErrors} erro(s) em ${dep.periodTotal} nos últimos ${periodDays} dias`;
  return { text: `${last} · ${period}`, tone: dep.lastTone === 'error' || dep.periodErrors > 0 ? 'text-danger' : 'text-muted-foreground' };
}

/** Ficha do fluxo do item (sentido, API, tabelas) e a situação dos fluxos de que ele depende. */
export const WshFlowCard: React.FC<{ item: WshItem }> = ({ item }) => {
  const flow = findFlowByRoute(item.route);
  const deps = useDependencies(item.route, Boolean(flow?.dependsOn?.length));
  if (!flow) return null;
  const fields = [...item.ownErrors, ...item.otherErrors].map((error) => error.field);
  const hinted = hintedDependencies(flow, fields);

  return (
    <section className="bg-card border border-border rounded-xl p-4 space-y-3" aria-label="Fluxo do item">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary" /> {flowLabel(flow)}
        <span className="text-2xs font-normal text-muted-foreground">{flow.category}</span>
      </h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {flowFacts(flow).map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-2xs text-muted-foreground">{fact.label}</dt>
            <dd className="text-xs text-foreground break-words font-mono">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {flow.dependsOn && flow.dependsOn.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-3">
          <p className="text-xs font-semibold text-foreground">Depende destes fluxos</p>
          <p className="text-2xs text-muted-foreground">
            Se algum não chegou ao PDVSync, os registros deste fluxo saem incompletos ou são recusados.
          </p>
          {deps?.loading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Consultando...
            </p>
          )}
          {deps && !deps.loading && deps.error && <p className="text-xs text-danger">{deps.error}</p>}
          {deps && !deps.loading && !deps.error && (
            <ul className="space-y-1.5">
              {deps.dependencies.map((dep) => {
                const line = dependencyLine(dep, deps.periodDays);
                return (
                  <li key={dep.flowId} className="text-xs">
                    <span className="font-medium text-foreground">{flowLabel({ id: dep.flowId, name: dep.flowName })}</span>
                    {hinted.includes(dep.flowId) && (
                      <span className="ml-2 px-1.5 py-0.5 rounded-full text-2xs font-medium bg-warning/10 text-warning">provável causa do erro</span>
                    )}
                    <span className={`block text-2xs ${line.tone}`}>{line.text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
};
