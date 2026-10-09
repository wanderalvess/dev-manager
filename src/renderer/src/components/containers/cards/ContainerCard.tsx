import React from 'react';
import type {
  DockerContainerInfo,
  DockerContainerStats
} from '../../../../../shared/types';
import { containerCardKinds } from '../../../utils/containerCardKind';
import { ContainerCardTitleRow } from '../card/ContainerCardTitleRow';
import { ContainerCardMetrics } from '../card/ContainerCardMetrics';
import { ContainerCardActions } from '../card/ContainerCardActions';

export interface ContainerCardProps {
  container: DockerContainerInfo;
  stats?: DockerContainerStats;
  isLoadingAction?: 'start' | 'stop' | 'restart' | 'remove';
  isOpeningTerminal?: boolean;
  isLoadingInspect?: boolean;
  copyFeedback: string | null;
  getStateBadge: (state: string) => React.ReactNode;
  onCopyText: (text: string, key: string) => void;
  onOpenOracleTools: (container: DockerContainerInfo) => void;
  onOpenWtaTools: (container: DockerContainerInfo) => void;
  onOpenWshTools: (container: DockerContainerInfo) => void;
  onInspectContainer: (container: DockerContainerInfo) => void;
  onContainerAction: (container: DockerContainerInfo, action: 'start' | 'stop' | 'restart' | 'remove') => void;
  onTogglePause: (container: DockerContainerInfo) => void;
  onOpenTerminal: (container: DockerContainerInfo) => void;
  onOpenLogs: (container: DockerContainerInfo) => void;
  isSelected?: boolean;
  onToggleSelect?: (containerId: string) => void;
}

export const ContainerCard: React.FC<ContainerCardProps> = ({
  container,
  stats,
  isLoadingAction,
  isOpeningTerminal,
  isLoadingInspect,
  copyFeedback,
  getStateBadge,
  onCopyText,
  onOpenOracleTools,
  onOpenWtaTools,
  onOpenWshTools,
  onInspectContainer,
  onContainerAction,
  onTogglePause,
  onOpenTerminal,
  onOpenLogs,
  isSelected,
  onToggleSelect
}) => {
  const isRunning = container.state === 'running';
  const cleanName = container.names.replace(/^\//, '');
  const { isOracle, isWta, isWsh } = containerCardKinds(cleanName);

  return (
    <div
      key={container.id}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'border-primary ring-2 ring-primary/40 bg-primary/4 shadow-md'
          : isRunning
          ? isOracle
            ? 'border-orange-500/35 bg-card shadow-[0_2px_14px_rgba(234,88,12,0.06)]'
            : isWta
            ? 'border-cyan-500/35 bg-card shadow-[0_2px_14px_rgba(6,182,212,0.06)]'
            : isWsh
            ? 'border-violet-500/35 bg-card shadow-[0_2px_14px_rgba(139,92,246,0.06)]'
            : 'border-border/80 bg-card shadow-xs hover:border-primary/40'
          : 'border-border/60 bg-card opacity-80 hover:opacity-100'
      }`}
    >
      {/* Trilho Lateral Indicador de LED */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
          isRunning
            ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.7)]'
            : container.state === 'paused'
            ? 'bg-amber-500'
            : 'bg-muted-foreground dark:bg-muted'
        }`}
      />

      <div className="p-3.5 pl-4.5 flex flex-col gap-2.5">
        <ContainerCardTitleRow
          container={container}
          cleanName={cleanName}
          isOracle={isOracle}
          isWta={isWta}
          isWsh={isWsh}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          getStateBadge={getStateBadge}
        />
        <ContainerCardMetrics container={container} stats={stats} isRunning={isRunning} />
        <ContainerCardActions
          container={container}
          isRunning={isRunning}
          isOracle={isOracle}
          isWta={isWta}
          isWsh={isWsh}
          isLoadingAction={isLoadingAction}
          isOpeningTerminal={isOpeningTerminal}
          isLoadingInspect={isLoadingInspect}
          copyFeedback={copyFeedback}
          onCopyText={onCopyText}
          onOpenOracleTools={onOpenOracleTools}
          onOpenWtaTools={onOpenWtaTools}
          onOpenWshTools={onOpenWshTools}
          onInspectContainer={onInspectContainer}
          onContainerAction={onContainerAction}
          onTogglePause={onTogglePause}
          onOpenTerminal={onOpenTerminal}
          onOpenLogs={onOpenLogs}
        />
      </div>
    </div>
  );
};
