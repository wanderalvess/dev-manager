import { useState, useCallback } from 'react';
import type { SmartErrorInfo } from '../../components/containers/modals/ContainerSmartErrorModal';
import type { DockerDataState } from './useDockerData';

export interface ShowErrorOptions {
  distroName?: string;
  containerName?: string;
  retryAction?: () => Promise<void>;
}

/** Erro inteligente: classifica a mensagem (Docker ausente/offline) para a auto-recuperação. */
export function useContainerErrors(data: Pick<DockerDataState, 'selectedDistro' | 'daemonStatus'>) {
  const { selectedDistro, daemonStatus } = data;
  const [smartError, setSmartError] = useState<SmartErrorInfo | null>(null);

  const handleShowError = useCallback(
    (title: string, errOrMsg: any, options?: ShowErrorOptions) => {
      const rawMsg = errOrMsg?.message || String(errOrMsg);
      const isNotInstalled = /DOCKER_NOT_INSTALLED|apt (update|install)|docker\.io/i.test(rawMsg);
      const isDaemonOffline =
        isNotInstalled ||
        /Cannot connect to the Docker daemon|docker\.sock|dockerd|daemon is not running|Is the docker daemon running/i.test(
          rawMsg
        );
      setSmartError({
        title: isNotInstalled
          ? 'Docker Não Instalado no WSL'
          : isDaemonOffline
          ? 'Docker Engine Offline no WSL'
          : title,
        message: rawMsg,
        distroName: options?.distroName || selectedDistro || daemonStatus?.wslDistro,
        containerName: options?.containerName,
        isDaemonOffline,
        isNotInstalled,
        retryAction: options?.retryAction
      });
    },
    [selectedDistro, daemonStatus]
  );

  const setErrorMessage = useCallback(
    (msg: string | null) => {
      if (!msg) {
        setSmartError(null);
        return;
      }
      handleShowError('Erro de Operação', msg);
    },
    [handleShowError]
  );

  return { smartError, setSmartError, handleShowError, setErrorMessage };
}

export type ContainerErrorsState = ReturnType<typeof useContainerErrors>;
