import React from 'react';
import { Cpu, Activity } from 'lucide-react';
import type { DockerContainerInfo, DockerContainerStats } from '../../../../../shared/types';
import { containerCardParsePercent } from '../../../utils/containerCardKind';
import { ContainerCardGauge } from './ContainerCardGauge';

interface ContainerCardMetricsProps {
  container: DockerContainerInfo;
  stats?: DockerContainerStats;
  isRunning: boolean;
}

/** Linha 2: imagem/status e medidores de CPU e memória. */
export const ContainerCardMetrics: React.FC<ContainerCardMetricsProps> = ({ container, stats, isRunning }) => (
  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/70 font-mono">
    <div className="text-[11px] text-muted-foreground truncate max-w-lg flex items-center gap-1.5">
      <span className="text-muted-foreground/60 select-none">IMG:</span>
      <span className="text-foreground/90 truncate">{container.image}</span>
      <span className="text-muted-foreground/40 hidden sm:inline">•</span>
      <span className="text-muted-foreground/70 text-[10px] hidden sm:inline">{container.status}</span>
    </div>

    {isRunning && stats && (
      <div className="flex items-center gap-4 shrink-0 flex-wrap" data-tour="container-stats">
        <ContainerCardGauge
          label="CPU"
          icon={<Cpu className="w-3 h-3 text-sky-400" />}
          percent={containerCardParsePercent(stats.cpu)}
          warnAbove={50}
          criticalAbove={80}
          normalClassName="bg-sky-500"
          valueText={stats.cpu}
          valueClassName="min-w-[36px] text-right"
        />
        <ContainerCardGauge
          label="MEM"
          icon={<Activity className="w-3 h-3 text-purple-400" />}
          percent={containerCardParsePercent(stats.memPerc)}
          warnAbove={60}
          criticalAbove={85}
          normalClassName="bg-purple-500"
          valueText={stats.mem}
        />

        {stats.netIO && stats.netIO !== '0B' && (
          <span className="text-[10px] text-muted-foreground/80 hidden xl:inline">NET: {stats.netIO}</span>
        )}
      </div>
    )}
  </div>
);
