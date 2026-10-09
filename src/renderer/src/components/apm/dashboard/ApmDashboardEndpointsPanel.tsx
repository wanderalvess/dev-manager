import React from 'react';
import { ArrowRight, Server } from 'lucide-react';
import { EndpointMetricsSummary } from '../../../../../shared/types';
import { getMethodBadgeClass } from '../../../utils/apmUiUtils';
import type { EndpointSortMode } from '../../../utils/apmDashboardUtils';

interface ApmDashboardEndpointsPanelProps {
  endpoints: EndpointMetricsSummary[];
  sortMode: EndpointSortMode;
  onSortModeChange: (mode: EndpointSortMode) => void;
  onFilterByEndpoint?: (route: string) => void;
}

/** Top Endpoints Mais Acessados / Lentos. */
export const ApmDashboardEndpointsPanel: React.FC<ApmDashboardEndpointsPanelProps> = ({
  endpoints,
  sortMode,
  onSortModeChange,
  onFilterByEndpoint
}) => {
  return (
    <div className="p-4 rounded-xl bg-card border border-border shadow-2xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono text-foreground">
            Endpoints {sortMode === 'slow' ? 'Mais Lentos (p95)' : 'Mais Solicitados'}
          </h4>
        </div>

        {/* Alternador de Ordenação: Volume vs Lentidão */}
        <div className="flex items-center p-0.5 rounded bg-muted/60 border border-border text-2xs font-medium">
          <button
            type="button"
            onClick={() => onSortModeChange('volume')}
            className={`px-2 py-0.5 rounded transition cursor-pointer ${
              sortMode === 'volume'
                ? 'bg-card text-foreground font-semibold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Volume
          </button>
          <button
            type="button"
            onClick={() => onSortModeChange('slow')}
            className={`px-2 py-0.5 rounded transition cursor-pointer flex items-center gap-1 ${
              sortMode === 'slow'
                ? 'bg-card text-amber-600 dark:text-amber-400 font-bold shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Mais Lentos</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          </button>
        </div>
      </div>

      {endpoints.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">Nenhum endpoint registrado ainda.</p>
      ) : (
        <div className="divide-y divide-border/60 overflow-hidden">
          {endpoints.slice(0, 5).map((ep, i) => (
            <div
              key={`${ep.serviceName}-${ep.method}-${ep.route}-${i}`}
              className="py-2.5 flex items-center justify-between gap-3 group hover:bg-muted/50 -mx-2 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`text-2xs font-mono px-1.5 py-0.5 rounded font-bold shrink-0 ${getMethodBadgeClass(
                    ep.method
                  )}`}
                >
                  {ep.method || 'HTTP'}
                </span>
                <span className="font-mono text-xs text-foreground truncate" title={ep.route}>
                  {ep.route}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right font-mono text-xs">
                  <div className="font-semibold text-foreground">{ep.requestCount} reqs</div>
                  <div className="text-2xs text-muted-foreground">
                    p95:{' '}
                    <span
                      className={`font-bold ${
                        ep.p95DurationMs >= 1000
                          ? 'text-rose-600 dark:text-rose-400'
                          : ep.p95DurationMs >= 400
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {ep.p95DurationMs}ms
                    </span>
                    {ep.errorRate > 0 && (
                      <span className="text-rose-600 dark:text-rose-400 ml-1.5 font-bold">
                        {ep.errorRate}% err
                      </span>
                    )}
                  </div>
                </div>

                {onFilterByEndpoint && (
                  <button
                    type="button"
                    onClick={() => onFilterByEndpoint(ep.route)}
                    title="Filtrar traces deste endpoint no Traces Explorer" aria-label="Filtrar traces deste endpoint no Traces Explorer"
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
