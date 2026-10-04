import { useState } from 'react';
import { useCopyToClipboard } from '../useCopyToClipboard';
import type { DockerDataState } from './useDockerData';
import type { ContainerErrorsState } from './useContainerErrors';

/** Troca de distro WSL, controles rápidos (terminal/terminate), IP e start do daemon. */
export function useWslDistroControls(data: DockerDataState, errors: ContainerErrorsState) {
  const { selectedDistro, setSelectedDistro, daemonStatus, setDaemonStatus, loadDockerData } = data;
  const { smartError, setSmartError, handleShowError, setErrorMessage } = errors;

  const [isSwitchingDistro, setIsSwitchingDistro] = useState<boolean>(false);
  const [isTerminatingDistro, setIsTerminatingDistro] = useState<boolean>(false);
  const [isOpeningWslTerminal, setIsOpeningWslTerminal] = useState<boolean>(false);
  const [isStartingDaemon, setIsStartingDaemon] = useState<boolean>(false);
  const { copy: copyWslIp, copiedKey: wslIpFeedback } = useCopyToClipboard();

  const handleSelectDistro = async (newDistro: string) => {
    setIsSwitchingDistro(true);
    setSelectedDistro(newDistro);
    try {
      if (window.electronAPI?.setDockerTargetWslDistro) {
        const res = await window.electronAPI.setDockerTargetWslDistro(newDistro || null);
        setDaemonStatus(res);
      }
      await loadDockerData();
    } catch (err: any) {
      setErrorMessage(`Falha ao alterar contexto WSL: ${err?.message || err}`);
    } finally {
      setIsSwitchingDistro(false);
    }
  };

  // Iniciar Docker Daemon na Distro WSL (com auto-recuperação do erro)
  const handleStartDockerDaemon = async (distro?: string) => {
    const targetDistro = distro || smartError?.distroName || selectedDistro || daemonStatus?.wslDistro;
    if (!targetDistro || !window.electronAPI?.startWslDockerDaemon) return;
    setIsStartingDaemon(true);
    try {
      const res = await window.electronAPI.startWslDockerDaemon(targetDistro);
      if (res.success) {
        const retry = smartError?.retryAction;
        setSmartError(null);
        await loadDockerData();
        if (retry) {
          await retry();
        }
      } else {
        handleShowError('Falha ao Iniciar Docker no WSL', res.message || res.error || 'Não foi possível iniciar o daemon.');
      }
    } catch (err: any) {
      handleShowError('Erro ao Iniciar Docker no WSL', err);
    } finally {
      setIsStartingDaemon(false);
    }
  };

  const handleOpenWslTerminal = async (distro?: string) => {
    const targetDistro = distro || selectedDistro || daemonStatus?.wslDistro;
    if (!targetDistro || !window.electronAPI?.openWslTerminal) return;
    setIsOpeningWslTerminal(true);
    try {
      await window.electronAPI.openWslTerminal(targetDistro);
    } catch (err: any) {
      handleShowError('Falha ao abrir terminal WSL', err);
    } finally {
      setIsOpeningWslTerminal(false);
    }
  };

  const handleTerminateDistro = async (distro?: string) => {
    const targetDistro = distro || selectedDistro || daemonStatus?.wslDistro;
    if (!targetDistro || !window.electronAPI?.terminateWslDistro) return;
    setIsTerminatingDistro(true);
    try {
      await window.electronAPI.terminateWslDistro(targetDistro);
      await loadDockerData();
    } catch (err: any) {
      handleShowError('Falha ao terminar distro WSL', err);
    } finally {
      setIsTerminatingDistro(false);
    }
  };

  return {
    isSwitchingDistro,
    isTerminatingDistro,
    isOpeningWslTerminal,
    isStartingDaemon,
    copyWslIp,
    wslIpFeedback,
    handleSelectDistro,
    handleStartDockerDaemon,
    handleOpenWslTerminal,
    handleTerminateDistro
  };
}

export type WslDistroControlsState = ReturnType<typeof useWslDistroControls>;
