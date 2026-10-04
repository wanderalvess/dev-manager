import React from 'react';
import { Cpu, Layers, Clock, Zap } from 'lucide-react';
import type { KarafJvmMemoryInfo } from '../../../../shared/types';
import {
  computeHeapGaugeWidth,
  computeNonHeapGaugeWidth,
  resolveBadgeClass,
  resolveGaugeClass
} from '../../utils/jvmMemoryModalUtils';

interface JvmMemoryCardsProps {
  metrics: KarafJvmMemoryInfo | null;
  isNearOom: boolean;
  alertLevel: KarafJvmMemoryInfo['alertLevel'];
}

export const JvmMemoryCards: React.FC<JvmMemoryCardsProps> = ({ metrics, isNearOom, alertLevel }) => (
  <>
    {/* Cards de Métricas Principais */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* Heap Card */}
      <div className="p-3.5 bg-card border border-border rounded-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wide flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-400" /> Heap Memory (Java Objects)
          </span>
          <span
            className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded border ${resolveBadgeClass(isNearOom, alertLevel)}`}
          >
            {metrics?.heapUsagePercent.toFixed(1) || '0.0'}%
          </span>
        </div>

        {/* Progress Gauge */}
        <div className="w-full bg-muted/60 rounded-xs h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${resolveGaugeClass(isNearOom, alertLevel)}`}
            style={{ width: `${computeHeapGaugeWidth(metrics?.heapUsagePercent)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1 text-[11px] font-mono tabular-nums">
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Usado</span>
            <span className="font-bold text-foreground">{metrics?.heapUsedMb ?? 0} MB</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Alocado</span>
            <span className="font-bold text-foreground">{metrics?.heapCommittedMb ?? 0} MB</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Máximo</span>
            <span className="font-bold text-foreground">{metrics?.heapMaxMb ?? 0} MB</span>
          </div>
        </div>
      </div>

      {/* Non-Heap Card */}
      <div className="p-3.5 bg-card border border-border rounded-lg space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wide flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-purple-400" /> Non-Heap (Metaspace / CodeCache)
          </span>
          <span className="text-xs font-mono font-bold text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">
            {metrics?.nonHeapUsedMb || 0} MB
          </span>
        </div>

        {/* Progress Gauge para Metaspace */}
        <div className="w-full bg-muted/60 rounded-xs h-1.5 overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${computeNonHeapGaugeWidth(metrics?.nonHeapUsedMb, metrics?.nonHeapCommittedMb)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-mono tabular-nums">
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Usado</span>
            <span className="font-bold text-foreground">{metrics?.nonHeapUsedMb ?? 0} MB</span>
          </div>
          <div>
            <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Alocado (Committed)</span>
            <span className="font-bold text-foreground">{metrics?.nonHeapCommittedMb ?? 0} MB</span>
          </div>
        </div>
      </div>
    </div>

    {/* Telemetria de Sistema Adicional */}
    <div className="grid grid-cols-3 gap-2 p-3 bg-muted/20 border border-border rounded-lg text-xs font-mono">
      <div className="flex items-center space-x-2">
        <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div>
          <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Uptime JVM</span>
          <span className="font-bold text-foreground">{metrics?.uptime || 'N/A'}</span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Zap className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div>
          <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Threads Ativas</span>
          <span className="font-bold text-foreground tabular-nums">{metrics?.liveThreads ?? 0}</span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Layers className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <div>
          <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">Classes</span>
          <span className="font-bold text-foreground tabular-nums">{metrics?.classesLoaded ?? 0}</span>
        </div>
      </div>
    </div>
  </>
);
