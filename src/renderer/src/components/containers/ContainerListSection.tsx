import React from 'react';
import { Box } from 'lucide-react';
import type { DockerContainerInfo, DockerContainerStats } from '../../../../shared/types';
import { ContainerCard } from './cards/ContainerCard';
import { getStateBadge } from './ContainerStateBadge';
import type { ContainerActionsState } from '../../hooks/containers/useContainerActions';
import type { ContainerBatchState } from '../../hooks/containers/useContainerBatch';
import type { ContainerLogsState } from '../../hooks/containers/useContainerLogs';
import type { ContainerToolModalsState } from '../../hooks/containers/useContainerToolModals';

interface ContainerListSectionProps {
  containers: DockerContainerInfo[];
  filteredContainers: DockerContainerInfo[];
  containerStats: Record<string, DockerContainerStats>;
  selectedDistro: string;
  onReload: () => void;
  actions: ContainerActionsState;
  batch: ContainerBatchState;
  logs: ContainerLogsState;
  tools: ContainerToolModalsState;
}

export const ContainerListSection: React.FC<ContainerListSectionProps> = ({
  containers,
  filteredContainers,
  containerStats,
  selectedDistro,
  onReload,
  actions,
  batch,
  logs,
  tools
}) => (
  <div className="px-4">
    {filteredContainers.length === 0 ? (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-6 bg-card/30 border border-dashed border-border/80 rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-muted/80 flex items-center justify-center text-muted-foreground mb-3">
          <Box className="w-6 h-6 stroke-[1.5]" />
        </div>
        <p className="text-sm font-bold text-foreground">Nenhum container localizado</p>
        <p className="text-xs text-muted-foreground max-w-md mt-1.5 leading-relaxed">
          {containers.length === 0
            ? 'Certifique-se de que a distro WSL selecionada possui o Docker Engine em execução ou inicie seus containers do WinThor.'
            : 'Nenhum container corresponde ao critério de busca informado.'}
        </p>
        {containers.length === 0 && selectedDistro && (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={onReload}
              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98"
            >
              Recarregar status da distro
            </button>
          </div>
        )}
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-3" data-tour="container-list">
        {filteredContainers.map((container) => {
          const cleanName = container.names.replace(/^\//, '');
          const stats =
            containerStats[container.id] ||
            containerStats[cleanName] ||
            Object.values(containerStats).find(
              (s) => s.id.startsWith(container.id.slice(0, 10)) || s.name === cleanName
            );

          return (
            <ContainerCard
              key={container.id}
              container={container}
              stats={stats}
              isLoadingAction={actions.actionLoading[container.id]}
              isOpeningTerminal={actions.isOpeningTerminal[container.id]}
              isLoadingInspect={actions.isLoadingInspect}
              copyFeedback={logs.copyFeedback}
              getStateBadge={getStateBadge}
              onCopyText={(text, key) => logs.copyToClipboard(text, key)}
              onOpenOracleTools={tools.openOracleTools}
              onOpenWtaTools={tools.openWtaTools}
              onOpenWshTools={tools.openWshTools}
              onInspectContainer={actions.handleInspectContainer}
              onContainerAction={actions.handleContainerAction}
              onTogglePause={actions.handleTogglePause}
              onOpenTerminal={actions.handleOpenTerminal}
              onOpenLogs={logs.handleOpenLogs}
              isSelected={batch.selectedContainerIds.has(container.id)}
              onToggleSelect={batch.handleToggleSelectContainer}
            />
          );
        })}
      </div>
    )}
  </div>
);
