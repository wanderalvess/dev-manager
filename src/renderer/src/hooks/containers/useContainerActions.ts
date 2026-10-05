import { useState } from 'react';
import type { DockerContainerInfo, DockerContainerInspect } from '../../../../shared/types';
import type { DockerDataState } from './useDockerData';
import type { ContainerErrorsState } from './useContainerErrors';

type ContainerAction = 'start' | 'stop' | 'restart' | 'remove';

/** Ações por container: start/stop/restart/remove, pause, terminal, inspect e prune. */
export function useContainerActions(data: DockerDataState, errors: ContainerErrorsState) {
  const { loadDockerData } = data;
  const { handleShowError, setErrorMessage } = errors;

  const [actionLoading, setActionLoading] = useState<Record<string, ContainerAction>>({});
  const [isOpeningTerminal, setIsOpeningTerminal] = useState<Record<string, boolean>>({});
  const [containerToRemove, setContainerToRemove] = useState<DockerContainerInfo | null>(null);
  const [inspectingContainer, setInspectingContainer] = useState<DockerContainerInspect | null>(null);
  const [isLoadingInspect, setIsLoadingInspect] = useState<boolean>(false);
  const [isPruning, setIsPruning] = useState<boolean>(false);
  const [showPruneConfirm, setShowPruneConfirm] = useState<boolean>(false);

  const handleOpenTerminal = async (container: DockerContainerInfo) => {
    if (!window.electronAPI?.openDockerContainerTerminal) return;
    setIsOpeningTerminal((prev) => ({ ...prev, [container.id]: true }));
    try {
      await window.electronAPI.openDockerContainerTerminal(container.id);
    } catch (err: any) {
      setErrorMessage(`Falha ao abrir terminal do container: ${err?.message || err}`);
    } finally {
      setIsOpeningTerminal((prev) => ({ ...prev, [container.id]: false }));
    }
  };

  const executeContainerAction = async (container: DockerContainerInfo, action: ContainerAction) => {
    if (!window.electronAPI) return;
    setActionLoading((prev) => ({ ...prev, [container.id]: action }));
    try {
      if (action === 'start') {
        await window.electronAPI.startDockerContainer(container.id);
      } else if (action === 'stop') {
        await window.electronAPI.stopDockerContainer(container.id);
      } else if (action === 'restart') {
        await window.electronAPI.restartDockerContainer(container.id);
      } else if (action === 'remove') {
        await window.electronAPI.removeDockerContainer(container.id);
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError(`Falha ao executar ${action} no container`, err, {
        containerName: container.names,
        retryAction: () => executeContainerAction(container, action)
      });
    } finally {
      setActionLoading((prev) => {
        const next = { ...prev };
        delete next[container.id];
        return next;
      });
    }
  };

  const handleContainerAction = async (container: DockerContainerInfo, action: ContainerAction) => {
    if (!window.electronAPI) return;

    if (action === 'remove') {
      setContainerToRemove(container);
      return;
    }

    await executeContainerAction(container, action);
  };

  const handleInspectContainer = async (container: DockerContainerInfo) => {
    if (!window.electronAPI?.inspectDockerContainer) return;
    setIsLoadingInspect(true);
    setInspectingContainer(null);
    try {
      const details = await window.electronAPI.inspectDockerContainer(container.id);
      if (details) {
        setInspectingContainer(details);
      } else {
        handleShowError('Inspecionar Container', 'Nenhum dado retornado pelo Docker inspect.');
      }
    } catch (err: any) {
      handleShowError('Falha ao inspecionar container', err, { containerName: container.names });
    } finally {
      setIsLoadingInspect(false);
    }
  };

  const handleTogglePause = async (container: DockerContainerInfo) => {
    if (!window.electronAPI) return;
    const isPaused = container.state === 'paused';
    try {
      if (isPaused) {
        if (window.electronAPI.unpauseDockerContainer) {
          await window.electronAPI.unpauseDockerContainer(container.id);
        }
      } else {
        if (window.electronAPI.pauseDockerContainer) {
          await window.electronAPI.pauseDockerContainer(container.id);
        }
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError(isPaused ? 'Falha ao despausar container' : 'Falha ao pausar container', err, {
        containerName: container.names,
        retryAction: () => handleTogglePause(container)
      });
    }
  };

  const handlePruneContainers = async () => {
    if (!window.electronAPI?.pruneDockerContainers) return;
    setIsPruning(true);
    setShowPruneConfirm(false);
    try {
      await window.electronAPI.pruneDockerContainers();
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Falha ao limpar containers parados', err);
    } finally {
      setIsPruning(false);
    }
  };

  return {
    actionLoading,
    isOpeningTerminal,
    containerToRemove,
    setContainerToRemove,
    inspectingContainer,
    setInspectingContainer,
    isLoadingInspect,
    isPruning,
    showPruneConfirm,
    setShowPruneConfirm,
    handleOpenTerminal,
    executeContainerAction,
    handleContainerAction,
    handleInspectContainer,
    handleTogglePause,
    handlePruneContainers
  };
}

export type ContainerActionsState = ReturnType<typeof useContainerActions>;
