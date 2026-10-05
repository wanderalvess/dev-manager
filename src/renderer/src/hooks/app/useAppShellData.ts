import { useState, useEffect, useCallback, useRef } from 'react';
import { ServiceStatus, GitProjectInfo } from '../../../../shared/types';

// Após uma falha de rede (ex: backend indisponível), pausa novas tentativas dessa chamada por esse período
// em vez de tentar de novo a cada poll — evita hammering do processo quando o servidor está fora do ar.
const FETCH_FAILURE_COOLDOWN_MS = 5000;

// Serviços, projetos, refresh global, versão de configurações e polling da aba 'env'.
export function useAppShellData(activeTab: string) {
  const [settingsVersion, setSettingsVersion] = useState<number>(0);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [projects, setProjects] = useState<GitProjectInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const isFetchingServicesRef = useRef(false);
  const servicesFailureUntilRef = useRef(0);
  const fetchServices = useCallback(async () => {
    if (isFetchingServicesRef.current) return;
    if (Date.now() < servicesFailureUntilRef.current) return;
    if (window.electronAPI) {
      isFetchingServicesRef.current = true;
      try {
        const data = await window.electronAPI.getServicesStatus();
        setServices((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data || [];
        });
      } catch (err) {
        servicesFailureUntilRef.current = Date.now() + FETCH_FAILURE_COOLDOWN_MS;
        console.warn('[App] Erro ao carregar status dos serviços:', err);
      } finally {
        isFetchingServicesRef.current = false;
      }
    }
  }, []);

  const isFetchingProjectsRef = useRef(false);
  const projectsFailureUntilRef = useRef(0);
  const fetchProjects = useCallback(async () => {
    if (isFetchingProjectsRef.current) return;
    if (Date.now() < projectsFailureUntilRef.current) return;
    if (window.electronAPI) {
      isFetchingProjectsRef.current = true;
      try {
        const data = await window.electronAPI.listProjects();
        setProjects((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data || [];
        });
      } catch (err) {
        projectsFailureUntilRef.current = Date.now() + FETCH_FAILURE_COOLDOWN_MS;
        console.warn('[App] Erro ao carregar projetos:', err);
      } finally {
        isFetchingProjectsRef.current = false;
      }
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchServices(), fetchProjects()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchServices, fetchProjects]);

  const handleSettingsSaved = useCallback(() => {
    refreshAll();
    setSettingsVersion((prev) => prev + 1);
  }, [refreshAll]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Polling inteligente: atualiza status de serviços a cada 8 segundos apenas se a aba ativa for 'env'
  useEffect(() => {
    if (activeTab !== 'env') return;
    const interval = setInterval(() => {
      fetchServices();
    }, 8000);
    return () => clearInterval(interval);
  }, [activeTab, fetchServices]);

  return {
    settingsVersion,
    services,
    projects,
    isRefreshing,
    fetchServices,
    fetchProjects,
    refreshAll,
    handleSettingsSaved
  };
}
