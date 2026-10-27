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

/** O fluxo do item e a situação dos fluxos de que ele depende, ao lado dos erros. */
export const WshDependenciesCard: React.FC<{ item: WshItem }> = ({ item }) => {
  const flow = findFlowByRoute(item.route);
  const deps = useDependencies(item.route, Boolean(flow?.dependsOn?.length));
  if (!flow) {
    return (
      <section className="border border-border rounded-xl p-3 space-y-1" aria-label="Fluxo do item">
        <h3 className="text-xs font-semibold text-foreground">{item.route}</h3>
        <p className="text-2xs text-muted-foreground">Rota fora do catálogo de fluxos: sem dependências conhecidas.</p>
      </section>
    );
  }
  const fields = [...item.ownErrors, ...item.otherErrors].map((error) => error.field);
  const hinted = hintedDependencies(flow, fields);

  return (
    <section className="border border-border rounded-xl p-3 space-y-2" aria-label="Fluxo do item">
      <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-primary" /> {flowLabel(flow)}
        <span className="text-2xs font-normal text-muted-foreground">{flow.category}</span>
      </h3>
      {!flow.dependsOn?.length ? (
        <p className="text-2xs text-muted-foreground">Este fluxo não depende de outros.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-foreground">Depende destes fluxos</p>
          <p className="text-2xs text-muted-foreground">Se algum não chegou ao PDVSync, os registros deste fluxo saem incompletos ou são recusados.</p>
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

/** Ficha do fluxo (sentido, API, tabelas, agendamento), recolhida no fim do detalhe. */
export const WshFlowFacts: React.FC<{ item: WshItem }> = ({ item }) => {
  const flow = findFlowByRoute(item.route);
  if (!flow) return null;
  return (
    <details className="border border-border rounded-xl p-3">
      <summary className="text-xs font-semibold text-foreground cursor-pointer">Ficha do fluxo: API, tabelas e agendamento</summary>
      <dl className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {flowFacts(flow).map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-2xs text-muted-foreground">{fact.label}</dt>
            <dd className="text-xs text-foreground break-words font-mono">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
};
