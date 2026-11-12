import { useCallback, useEffect, useState } from 'react';
import type { GitProjectInfo, ServiceStatus } from '../../../../shared/types';

export function useAppShellData(_activeTab: string) {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [projects, setProjects] = useState<GitProjectInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [settingsVersion, setSettingsVersion] = useState(0);

  const fetchServices = useCallback(async () => {
    try {
      const data = await window.electronAPI?.getServicesStatus?.();
      if (Array.isArray(data)) setServices(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await window.electronAPI?.listProjects?.();
      if (Array.isArray(data)) setProjects(data);
    } catch {
      // ignore
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchServices(), fetchProjects()]);
    setIsRefreshing(false);
  }, [fetchServices, fetchProjects]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const handleSettingsSaved = useCallback(() => {
    setSettingsVersion((v) => v + 1);
  }, []);

  return {
    services,
    projects,
    isRefreshing,
    settingsVersion,
    fetchServices,
    fetchProjects,
    refreshAll,
    handleSettingsSaved
  };
}
