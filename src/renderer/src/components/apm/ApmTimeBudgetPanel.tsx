import React from 'react';
import { Clock, Code2, Database } from 'lucide-react';
import type { TimeBudgetData, SpanTierCategory } from '../../utils/apmUiUtils';
import type { DetailTab } from './apmTypes';

export interface ApmTimeBudgetPanelProps {
  timeBudget: TimeBudgetData | null;
  hasSqlTab: boolean;
  onSelectTab: (tab: DetailTab) => void;
  onSelectTier: (tier: SpanTierCategory) => void;
}

export const ApmTimeBudgetPanel: React.FC<ApmTimeBudgetPanelProps> = ({
  timeBudget, hasSqlTab, onSelectTab, onSelectTier
}) => timeBudget ? (
  <div className="px-3.5 py-2.5 border-b border-border bg-muted/20 flex flex-col gap-2 shrink-0">
    <div className="flex items-center justify-between text-[11px] font-mono">
      <span className="text-muted-foreground flex items-center gap-1.5 font-semibold">
        <Clock className="w-3.5 h-3.5 text-primary" />
        <span>Time Budget (Alocação de Tempo)</span>
      </span>
      <div className="flex items-center gap-2 text-[10px] tabular-nums">
        <span className="text-sky-600 dark:text-sky-400 font-semibold" title="Tempo em handlers e chamadas HTTP">🌐 HTTP: {timeBudget.httpPct}% ({timeBudget.httpMs}ms)</span>
        <span>•</span>
        <span className="text-purple-600 dark:text-purple-400 font-semibold" title="Tempo em lógica Java / OSGi">☕ Java: {timeBudget.javaPct}% ({timeBudget.javaMs}ms)</span>
        <span>•</span>
        <span className="text-amber-600 dark:text-amber-400 font-semibold" title="Tempo em consultas JDBC / Oracle">🗄️ JDBC: {timeBudget.jdbcPct}% ({timeBudget.jdbcMs}ms)</span>
      </div>
    </div>
    <div className="w-full h-2.5 rounded-full bg-muted/60 overflow-hidden flex shadow-inner">
      {timeBudget.httpPct > 0 && <div style={{ width: `${timeBudget.httpPct}%` }} className="bg-sky-500 h-full transition-all" title={`Requisição HTTP: ${timeBudget.httpMs}ms (${timeBudget.httpPct}%) — ${timeBudget.httpSpansCount} spans`} />}
      {timeBudget.javaPct > 0 && <div style={{ width: `${timeBudget.javaPct}%` }} className="bg-purple-500 h-full transition-all" title={`Processamento Java: ${timeBudget.javaMs}ms (${timeBudget.javaPct}%) — ${timeBudget.javaSpansCount} spans`} />}
      {timeBudget.jdbcPct > 0 && <div style={{ width: `${timeBudget.jdbcPct}%` }} className="bg-amber-500 h-full transition-all" title={`Queries JDBC no Banco: ${timeBudget.jdbcMs}ms (${timeBudget.jdbcPct}%) — ${timeBudget.jdbcSpansCount} spans`} />}
    </div>
    {timeBudget.hasDbBottleneck ? (
      <div className="px-2.5 py-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] font-mono text-amber-800 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Gargalo no Banco: <strong>{timeBudget.jdbcPct}%</strong> ({timeBudget.jdbcMs}ms) consumidos em queries JDBC</span>
        </span>
        {hasSqlTab && <button type="button" onClick={() => onSelectTab('sql')} className="text-xs text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200 underline font-bold cursor-pointer">Inspecionar SQL &rarr;</button>}
      </div>
    ) : timeBudget.hasJavaBottleneck ? (
      <div className="px-2.5 py-1.5 rounded bg-purple-500/10 border border-purple-500/30 text-[11px] font-mono text-purple-800 dark:bg-purple-950/30 dark:border-purple-800/40 dark:text-purple-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
          <span>Gargalo em Java: <strong>{timeBudget.javaPct}%</strong> ({timeBudget.javaMs}ms) em processamento interno / OSGi</span>
        </span>
        <button type="button" onClick={() => onSelectTier('java')} className="text-xs text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-200 underline font-bold cursor-pointer">Filtrar Java &rarr;</button>
      </div>
    ) : null}
  </div>
) : null;
