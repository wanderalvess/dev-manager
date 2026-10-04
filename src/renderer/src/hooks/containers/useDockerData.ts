import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DockerContainerInfo,
  DockerDaemonStatus,
  DockerContainerStats,
  WslDistroInfo
} from '../../../../shared/types';

/** Status do Docker, lista de containers, stats e polling (12s dados / 6s stats). */
export function useDockerData(isActive?: boolean) {
  const [containers, setContainers] = useState<DockerContainerInfo[]>([]);
  const [daemonStatus, setDaemonStatus] = useState<DockerDaemonStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [containerStats, setContainerStats] = useState<Record<string, DockerContainerStats>>({});
  const [availableDistros, setAvailableDistros] = useState<WslDistroInfo[]>([]);
  const [selectedDistro, setSelectedDistro] = useState<string>('');

  const loadDockerStats = useCallback(async () => {
    if (!window.electronAPI?.getDockerContainerStats) return;
    try {
      const statsList = await window.electronAPI.getDockerContainerStats();
      if (Array.isArray(statsList)) {
        const map: Record<string, DockerContainerStats> = {};
        for (const s of statsList) {
          map[s.id] = s;
          if (s.name) map[s.name] = s;
        }
        setContainerStats(map);
      }
    } catch {
      // Falha silenciosa caso o daemon esteja oscilando
    }
  }, []);

  // Guarda contra execuções concorrentes: o polling não empilha chamadas lentas ao daemon.
  const isLoadingDockerRef = useRef(false);
  const loadDockerData = useCallback(async () => {
    if (isLoadingDockerRef.current) return;
    isLoadingDockerRef.current = true;
    setIsLoading(true);
    try {
      if (window.electronAPI) {
        const status = window.electronAPI.getDockerStatus
          ? await window.electronAPI.getDockerStatus()
          : { installed: true, running: true };
        setDaemonStatus(status);

        if (status.availableDistros) {
          setAvailableDistros(status.availableDistros);
        }
        if (status.isWsl && status.wslDistro) {
          setSelectedDistro(status.wslDistro);
        } else {
          setSelectedDistro('');
        }

        if (status.installed && status.running) {
          const list = window.electronAPI.listDockerContainers
            ? await window.electronAPI.listDockerContainers()
            : [];
          setContainers(list || []);
          loadDockerStats();
        } else {
          setContainers([]);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar informações do Docker:', err);
    } finally {
      setIsLoading(false);
      isLoadingDockerRef.current = false;
    }
  }, [loadDockerStats]);

  useEffect(() => {
    if (isActive === false) return;
    loadDockerData();
    const interval = setInterval(loadDockerData, 12000);
    const statsInterval = setInterval(loadDockerStats, 6000);
    return () => {
      clearInterval(interval);
      clearInterval(statsInterval);
    };
  }, [isActive, loadDockerData, loadDockerStats]);

  return {
    containers,
    daemonStatus,
    setDaemonStatus,
    isLoading,
    containerStats,
    availableDistros,
    selectedDistro,
    setSelectedDistro,
    loadDockerData,
    loadDockerStats
  };
}

export type DockerDataState = ReturnType<typeof useDockerData>;
