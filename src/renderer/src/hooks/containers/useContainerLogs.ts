import { useState, useCallback } from 'react';
import type { DockerContainerInfo } from '../../../../shared/types';
import { useCopyToClipboard } from '../useCopyToClipboard';
import { buildLogFileName } from '../../utils/dockerSequenceUtils';

/** Modal de logs (abrir/atualizar/baixar/copiar). Também expõe o clipboard compartilhado da página. */
export function useContainerLogs() {
  const [selectedContainer, setSelectedContainer] = useState<DockerContainerInfo | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [logLines, setLogLines] = useState<number>(200);
  const { copy: copyToClipboard, copiedKey: copyFeedback } = useCopyToClipboard();

  const handleOpenLogs = async (container: DockerContainerInfo) => {
    setSelectedContainer(container);
    setIsLoadingLogs(true);
    try {
      if (window.electronAPI?.getDockerLogs) {
        const text = await window.electronAPI.getDockerLogs(container.id, logLines);
        setLogs(text || '(Nenhum log retornado)');
      }
    } catch (err: any) {
      setLogs(`Erro ao buscar logs: ${err.message || err}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRefreshLogs = useCallback(
    async (showLoading = true) => {
      if (!selectedContainer || !window.electronAPI?.getDockerLogs) return;
      if (showLoading) setIsLoadingLogs(true);
      try {
        const text = await window.electronAPI.getDockerLogs(selectedContainer.id, logLines);
        setLogs(text || '(Nenhum log retornado)');
      } catch (err: any) {
        if (showLoading) setLogs(`Erro ao atualizar logs: ${err.message || err}`);
      } finally {
        if (showLoading) setIsLoadingLogs(false);
      }
    },
    [selectedContainer, logLines]
  );

  const handleDownloadLogs = () => {
    if (!selectedContainer || !logs) return;
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildLogFileName(selectedContainer.names);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyLogs = () => copyToClipboard(logs, 'Logs copiados!');

  return {
    selectedContainer,
    closeLogs: () => setSelectedContainer(null),
    logs,
    isLoadingLogs,
    logLines,
    setLogLines,
    copyToClipboard,
    copyFeedback,
    handleOpenLogs,
    handleRefreshLogs,
    handleDownloadLogs,
    handleCopyLogs
  };
}

export type ContainerLogsState = ReturnType<typeof useContainerLogs>;
