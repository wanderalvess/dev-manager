import React from 'react';
import type { TraceDetails } from '../../../../shared/types';
import type { TimeBudgetData, SpanTierCategory } from '../../utils/apmUiUtils';

export interface ApmWaterfallControlsProps {
  details: TraceDetails | null;
  timeBudget: TimeBudgetData | null;
  tierFilter: SpanTierCategory | 'ALL';
  onTierFilterChange: React.Dispatch<React.SetStateAction<SpanTierCategory | 'ALL'>>;
}

export const ApmWaterfallControls: React.FC<ApmWaterfallControlsProps> = ({
  details, timeBudget, tierFilter, onTierFilterChange
}) => (
  <div className="p-2.5 bg-muted/40 rounded-lg border border-border flex flex-col gap-2 select-none">
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-1 text-2xs font-mono">
        <span className="text-2xs uppercase font-bold tracking-wider text-muted-foreground mr-1">Camada:</span>
        <button
          type="button"
          onClick={() => onTierFilterChange('ALL')}
          className={`px-2 py-0.5 rounded text-2xs font-semibold cursor-pointer transition ${
            tierFilter === 'ALL' ? 'bg-primary text-primary-foreground shadow-2xs' : 'bg-card border border-border text-muted-foreground hover:text-foreground'
          }`}
        >
          Todas ({details?.spans.length || 0})
        </button>
        {([
          { tier: 'http', label: '🌐 HTTP', count: timeBudget?.httpSpansCount, duration: timeBudget?.httpMs, active: 'bg-sky-500 text-white shadow-2xs', inactive: 'bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20' },
          { tier: 'java', label: '☕ Java', count: timeBudget?.javaSpansCount, duration: timeBudget?.javaMs, active: 'bg-purple-600 text-white shadow-2xs', inactive: 'bg-purple-500/10 border border-purple-500/30 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20' },
          { tier: 'jdbc', label: '🗄️ JDBC', count: timeBudget?.jdbcSpansCount, duration: timeBudget?.jdbcMs, active: 'bg-amber-500 text-white shadow-2xs', inactive: 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20' }
        ] as const).map(({ tier, label, count, duration, active, inactive }) => (
          <button
            key={tier}
            type="button"
            onClick={() => onTierFilterChange((previous) => previous === tier ? 'ALL' : tier)}
            className={`px-2 py-0.5 rounded text-2xs font-semibold cursor-pointer transition flex items-center gap-1 ${tierFilter === tier ? active : inactive}`}
          >
            <span>{label} ({count ?? 0})</span>
            <span className="tabular-nums font-normal">{duration}ms</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 text-2xs font-mono text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-sky-500 inline-block" /> HTTP</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-purple-500 inline-block" /> Java</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-amber-500 inline-block" /> JDBC</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-xs bg-rose-500 inline-block" /> Erro</span>
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <div className="w-full flex justify-between font-mono text-2xs text-muted-foreground tabular-nums px-0.5">
        <span>0ms</span>
        <span>{Math.round((details?.summary.durationMs || 100) * 0.25)}ms</span>
        <span>{Math.round((details?.summary.durationMs || 100) * 0.5)}ms</span>
        <span>{Math.round((details?.summary.durationMs || 100) * 0.75)}ms</span>
        <span className="font-bold text-foreground">{details?.summary.durationMs}ms</span>
      </div>
      <div className="w-full h-2 rounded-full bg-muted/70 overflow-hidden flex shadow-2xs">
        {timeBudget && <>
          {timeBudget.httpPct > 0 && <div style={{ width: `${timeBudget.httpPct}%` }} className="bg-sky-500 h-full" title={`Requisição HTTP: ${timeBudget.httpMs}ms (${timeBudget.httpPct}%)`} />}
          {timeBudget.javaPct > 0 && <div style={{ width: `${timeBudget.javaPct}%` }} className="bg-purple-500 h-full" title={`Processamento Java: ${timeBudget.javaMs}ms (${timeBudget.javaPct}%)`} />}
          {timeBudget.jdbcPct > 0 && <div style={{ width: `${timeBudget.jdbcPct}%` }} className="bg-amber-500 h-full" title={`Queries JDBC: ${timeBudget.jdbcMs}ms (${timeBudget.jdbcPct}%)`} />}
        </>}
      </div>
    </div>
  </div>
);
