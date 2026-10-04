import { useState, useCallback } from 'react';
import type {
  DockerContainerInfo,
  WslDumpFileInfo,
  WshPrerequisiteStatus
} from '../../../../shared/types';
import type { DockerDataState } from './useDockerData';
import type { ContainerErrorsState } from './useContainerErrors';

/** Modais utilitários por stack: Oracle (dumps), WSH (/opt) e WTA (Karaf). */
export function useContainerToolModals(data: DockerDataState, errors: ContainerErrorsState) {
  const { containers, selectedDistro, daemonStatus } = data;
  const { handleShowError } = errors;

  const [oracleModalContainer, setOracleModalContainer] = useState<DockerContainerInfo | null>(null);
  const [availableDumps, setAvailableDumps] = useState<WslDumpFileInfo[]>([]);
  const [isLoadingDumps, setIsLoadingDumps] = useState<boolean>(false);
  const [isOpeningDumpsFolder, setIsOpeningDumpsFolder] = useState<boolean>(false);

  const [wshModalContainer, setWshModalContainer] = useState<DockerContainerInfo | null>(null);
  const [wshPrereqs, setWshPrereqs] = useState<WshPrerequisiteStatus[]>([]);
  const [isLoadingWshPrereqs, setIsLoadingWshPrereqs] = useState<boolean>(false);
  const [isOpeningOptFolder, setIsOpeningOptFolder] = useState<boolean>(false);

  const [wtaModalContainer, setWtaModalContainer] = useState<DockerContainerInfo | null>(null);
  const [isOpeningKarafClient, setIsOpeningKarafClient] = useState<boolean>(false);

  const loadAvailableDumps = useCallback(
    async (distro?: string) => {
      if (!window.electronAPI?.listWslDmpFiles) return;
      setIsLoadingDumps(true);
      try {
        const target = distro || selectedDistro || daemonStatus?.wslDistro;
        const dumps = await window.electronAPI.listWslDmpFiles(target);
        setAvailableDumps(dumps || []);
      } catch {
        setAvailableDumps([]);
      } finally {
        setIsLoadingDumps(false);
      }
    },
    [selectedDistro, daemonStatus]
  );

  const handleOpenDumpsFolder = async () => {
    if (!window.electronAPI?.openWslDumpsFolder) return;
    setIsOpeningDumpsFolder(true);
    try {
      const target = selectedDistro || daemonStatus?.wslDistro;
      const res = await window.electronAPI.openWslDumpsFolder(target);
      if (!res.success && res.error) {
        handleShowError('Pasta de Dumps', res.error);
      }
    } catch (err: any) {
      handleShowError('Pasta de Dumps', err?.message || err);
    } finally {
      setIsOpeningDumpsFolder(false);
    }
  };

  const loadWshPrereqs = useCallback(async () => {
    if (!window.electronAPI?.checkWshPrerequisites) return;
    setIsLoadingWshPrereqs(true);
    try {
      const target = selectedDistro || daemonStatus?.wslDistro;
      const res = await window.electronAPI.checkWshPrerequisites(target);
      setWshPrereqs(res || []);
    } catch {
      setWshPrereqs([]);
    } finally {
      setIsLoadingWshPrereqs(false);
    }
  }, [selectedDistro, daemonStatus]);

  const handleOpenOptFolder = async () => {
    if (!window.electronAPI?.openWslOptFolder) return;
    setIsOpeningOptFolder(true);
    try {
      const target = selectedDistro || daemonStatus?.wslDistro;
      const res = await window.electronAPI.openWslOptFolder(target);
      if (!res.success && res.error) {
        handleShowError('Pasta /opt WSL', res.error);
      }
    } catch (err: any) {
      handleShowError('Pasta /opt WSL', err?.message || err);
    } finally {
      setIsOpeningOptFolder(false);
    }
  };

  const handleOpenKarafClient = async (containerName: string) => {
    if (!window.electronAPI?.openWtaKarafClient) return;
    setIsOpeningKarafClient(true);
    try {
      await window.electronAPI.openWtaKarafClient(containerName);
    } catch (err: any) {
      handleShowError('Console Karaf', err?.message || err);
    } finally {
      setIsOpeningKarafClient(false);
    }
  };

  const openOracleTools = (container: DockerContainerInfo) => {
    setOracleModalContainer(container);
    loadAvailableDumps();
  };

  const openWtaTools = (container: DockerContainerInfo) => setWtaModalContainer(container);

  // Sem container do WSH rodando, o modal abre no primeiro da lista (comportamento do barramento).
  const openWshTools = (container?: DockerContainerInfo | null) => {
    setWshModalContainer(container || containers[0] || null);
    loadWshPrereqs();
  };

  return {
    oracleModalContainer,
    closeOracleModal: () => setOracleModalContainer(null),
    availableDumps,
    isLoadingDumps,
    isOpeningDumpsFolder,
    loadAvailableDumps,
    handleOpenDumpsFolder,
    wshModalContainer,
    closeWshModal: () => setWshModalContainer(null),
    wshPrereqs,
    isLoadingWshPrereqs,
    isOpeningOptFolder,
    loadWshPrereqs,
    handleOpenOptFolder,
    wtaModalContainer,
    closeWtaModal: () => setWtaModalContainer(null),
    isOpeningKarafClient,
    handleOpenKarafClient,
    openOracleTools,
    openWtaTools,
    openWshTools
  };
}

export type ContainerToolModalsState = ReturnType<typeof useContainerToolModals>;
