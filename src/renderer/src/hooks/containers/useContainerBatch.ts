import { useState, useCallback } from 'react';
import type { DockerContainerInfo } from '../../../../shared/types';
import { getSelectedContainerNames } from '../../utils/dockerSequenceUtils';
import type { DockerDataState } from './useDockerData';
import type { ContainerErrorsState } from './useContainerErrors';
import type { SequenceProgressState } from './useContainerSequenceProgress';

/** Seleção múltipla e ações em lote (start/stop em sequência, restart serial). */
export function useContainerBatch(
  data: DockerDataState,
  errors: ContainerErrorsState,
  sequence: SequenceProgressState,
  filteredContainers: DockerContainerInfo[],
  onCreateGroup: (preselectedNames: string[]) => void
) {
  const { containers, loadDockerData } = data;
  const { handleShowError } = errors;
  const { setSequenceProgress } = sequence;

  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set());
  const [isExecutingBatch, setIsExecutingBatch] = useState<boolean>(false);
  const [batchActionType, setBatchActionType] = useState<'start' | 'stop' | 'restart' | null>(null);

  const handleToggleSelectContainer = useCallback((containerId: string) => {
    setSelectedContainerIds((prev) => {
      const next = new Set(prev);
      if (next.has(containerId)) {
        next.delete(containerId);
      } else {
        next.add(containerId);
      }
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback(() => {
    setSelectedContainerIds((prev) => {
      if (filteredContainers.length === 0) return new Set();
      const allSelected = filteredContainers.every((c) => prev.has(c.id));
      if (allSelected) {
        return new Set();
      }
      return new Set(filteredContainers.map((c) => c.id));
    });
  }, [filteredContainers]);

  const handleClearSelection = useCallback(() => {
    setSelectedContainerIds(new Set());
  }, []);

  const handleBatchStart = async () => {
    const names = getSelectedContainerNames(containers, selectedContainerIds);
    if (names.length === 0) return;

    setIsExecutingBatch(true);
    setBatchActionType('start');
    const slots = names.map((name) => ({ name }));

    setSequenceProgress({ running: true, index: 1, total: slots.length, currentName: slots[0].name });
    try {
      if (window.electronAPI?.startContainerSequence) {
        const res = await window.electronAPI.startContainerSequence(slots);
        if (!res.success) {
          handleShowError('Falha ao subir containers selecionados', res.error || 'Erro ao iniciar containers');
        }
      } else {
        for (const slot of slots) {
          await window.electronAPI?.startDockerContainer(slot.name);
        }
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Erro ao iniciar containers selecionados', err);
    } finally {
      setIsExecutingBatch(false);
      setBatchActionType(null);
      setSequenceProgress({ running: false });
    }
  };

  const handleBatchStop = async () => {
    const names = getSelectedContainerNames(containers, selectedContainerIds);
    if (names.length === 0) return;

    setIsExecutingBatch(true);
    setBatchActionType('stop');

    setSequenceProgress({ running: true, index: 1, total: names.length, currentName: names[0] });
    try {
      if ((window.electronAPI as any)?.stopContainerSequence) {
        const res = await (window.electronAPI as any).stopContainerSequence(names);
        if (!res.success) {
          handleShowError('Falha ao parar containers selecionados', res.error || 'Erro ao parar containers');
        }
      } else {
        for (const name of names) {
          await window.electronAPI?.stopDockerContainer(name);
        }
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Erro ao parar containers selecionados', err);
    } finally {
      setIsExecutingBatch(false);
      setBatchActionType(null);
      setSequenceProgress({ running: false });
    }
  };

  const handleBatchRestart = async () => {
    const targetContainers = containers.filter((c) => selectedContainerIds.has(c.id));
    if (targetContainers.length === 0) return;

    setIsExecutingBatch(true);
    setBatchActionType('restart');
    try {
      for (const c of targetContainers) {
        await window.electronAPI?.restartDockerContainer(c.id);
      }
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Erro ao reiniciar containers selecionados', err);
    } finally {
      setIsExecutingBatch(false);
      setBatchActionType(null);
    }
  };

  const handleCreateGroupFromSelection = () => {
    onCreateGroup(getSelectedContainerNames(containers, selectedContainerIds));
  };

  return {
    selectedContainerIds,
    isExecutingBatch,
    batchActionType,
    handleToggleSelectContainer,
    handleToggleSelectAll,
    handleClearSelection,
    handleBatchStart,
    handleBatchStop,
    handleBatchRestart,
    handleCreateGroupFromSelection
  };
}

export type ContainerBatchState = ReturnType<typeof useContainerBatch>;
