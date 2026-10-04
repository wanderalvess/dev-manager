import React from 'react';
import { Ban, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { QualityMetrics } from '../../../utils/qualityPageUtils';

interface QualityMetricsStripProps {
  metrics: QualityMetrics;
}

export const QualityMetricsStrip: React.FC<QualityMetricsStripProps> = ({ metrics }) => (
  <div className="border border-border rounded-md bg-card grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
    <div className="p-3 space-y-0.5">
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-muted-foreground block">Total Cenários</span>
      <div className="text-lg font-bold font-mono tabular-nums text-foreground">{metrics.total}</div>
    </div>
    <div className="p-3 space-y-0.5">
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" /> Aprovados
      </span>
      <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{metrics.passed}</div>
    </div>
    <div className="p-3 space-y-0.5">
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Em Teste
      </span>
      <div className="text-lg font-bold font-mono tabular-nums text-cyan-600 dark:text-cyan-400">{metrics.inProgress}</div>
    </div>
    <div className="p-3 space-y-0.5">
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
        <XCircle className="w-3 h-3" /> Falhas / Bugs
      </span>
      <div className="text-lg font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">{metrics.failed}</div>
    </div>
    <div className="p-3 space-y-0.5">
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1">
        <Ban className="w-3 h-3" /> Bloqueados
      </span>
      <div className="text-lg font-bold font-mono tabular-nums text-amber-500">{metrics.blocked}</div>
    </div>
    <div className="p-3 space-y-0.5">
      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-primary block">Taxa de Sucesso</span>
      <div className="text-lg font-bold font-mono tabular-nums text-primary">{metrics.passRate}%</div>
    </div>
  </div>
);
