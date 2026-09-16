import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { EnvironmentPage } from './pages/EnvironmentPage';
import { DatabasePage } from './pages/DatabasePage';
import { ContainersPage } from './pages/ContainersPage';
import { DeployPage } from './pages/DeployPage';
import { GitAzurePage } from './pages/GitAzurePage';
import { RoutinesPage } from './pages/RoutinesPage';
import { DocsPage } from './pages/DocsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { LogsPage } from './pages/LogsPage';
import { QuickLauncherModal } from './components/QuickLauncherModal';
import { ToastHost, showToast } from './components/ToastHost';
import { OnboardingTour } from './components/onboarding/OnboardingTour';
import { TOUR_STEPS, TOUR_STORAGE_KEY } from './components/onboarding/tourSteps';
import { ServiceStatus, GitProjectInfo } from '../../shared/types';

// Marca se o usuário já viu a tela de Ajuda/Visão Geral pelo menos uma vez.
// Usado para decidir a aba inicial no primeiro uso (onboarding).
const ONBOARDING_SEEN_KEY = 'devManager:onboardingSeen';

const getInitialTab = (): string => {
  try {
    return window.localStorage.getItem(ONBOARDING_SEEN_KEY) ? 'env' : 'help';
  } catch {
    return 'env';
  }
};

// Após uma falha de rede (ex: backend indisponível), pausa novas tentativas dessa chamada por esse período
// em vez de tentar de novo a cada poll — evita hammering do processo quando o servidor está fora do ar.
const FETCH_FAILURE_COOLDOWN_MS = 5000;

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getInitialTab()]));
  const [settingsVersion, setSettingsVersion] = useState<number>(0);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [projects, setProjects] = useState<GitProjectInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isQuickLauncherOpen, setIsQuickLauncherOpen] = useState<boolean>(false);
  const [helpSearch, setHelpSearch] = useState<string>('');
  const [isTourOpen, setIsTourOpen] = useState<boolean>(() => {
    try {
      return !window.localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  const navigateToHelp = useCallback((search?: string) => {
    setHelpSearch(search || '');
    setActiveTab('help');
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
    } catch {
      // localStorage indisponível (ex: modo privado) - onboarding reaparece a cada abertura, sem problema
    }
  }, []);

  const isFetchingServicesRef = React.useRef(false);
  const servicesFailureUntilRef = React.useRef(0);
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

  const isFetchingProjectsRef = React.useRef(false);
  const projectsFailureUntilRef = React.useRef(0);
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

  // Suporte a atalhos de teclado (Alt+1 .. Alt+9 e Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickLauncherOpen((prev) => !prev);
        return;
      }

      if (e.altKey) {
        if (e.key === '1') setActiveTab('env');
        else if (e.key === '2') setActiveTab('database');
        else if (e.key === '3') setActiveTab('containers');
        else if (e.key === '4') setActiveTab('deploy');
        else if (e.key === '5') setActiveTab('git');
        else if (e.key === '6') setActiveTab('routines');
        else if (e.key === '7') setActiveTab('docs');
        else if (e.key === '8') setActiveTab('logs');
        else if (e.key === '9') setActiveTab('help');
        else if (e.key === '0') setActiveTab('settings');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Notifica o usuário sobre o resultado de backups agendados, mesmo fora da aba Banco de Dados
  useEffect(() => {
    if (!window.electronAPI?.onBackupScheduleResult) return;
    return window.electronAPI.onBackupScheduleResult(({ connectionName, result }) => {
      if (result.success) {
        showToast(`Backup agendado de "${connectionName}" concluído com sucesso.`, 'success');
      } else {
        showToast(`Falha no backup agendado de "${connectionName}": ${result.message}`, 'error');
      }
    });
  }, []);

  // Notifica o usuário sobre o resultado de deploys/builds Karaf, mesmo fora da aba de Deploy
  useEffect(() => {
    if (!window.electronAPI?.onKarafDeployResult) return;
    return window.electronAPI.onKarafDeployResult((result) => {
      if (result.success) {
        showToast('Deploy Karaf concluído com sucesso.', 'success');
      } else {
        showToast(`Falha no deploy Karaf: ${result.error || 'erro desconhecido'}`, 'error');
      }
    });
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onKarafBuildResult) return;
    return window.electronAPI.onKarafBuildResult((result) => {
      showToast(`Falha na compilação Maven (código ${result.code}).`, 'error');
    });
  }, []);

  // Notifica quando o watcher de auto-reindex do RAG termina uma reindexação em segundo plano
  useEffect(() => {
    if (!window.electronAPI?.onDocsReindexComplete) return;
    return window.electronAPI.onDocsReindexComplete((status) => {
      showToast(`Documentação reindexada automaticamente (${status.totalChunks} trechos).`, 'success');
    });
  }, []);


  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden select-none transition-colors duration-300">
      {/* Topo / Header Cockpit */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefreshAll={refreshAll}
        isRefreshing={isRefreshing}
        onOpenQuickLauncher={() => setIsQuickLauncherOpen(true)}
      />

      {/* Modal de Busca Rápida (Ctrl+K) */}
      <QuickLauncherModal
        isOpen={isQuickLauncherOpen}
        onClose={() => setIsQuickLauncherOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        projects={projects}
        onRefreshAll={refreshAll}
      />

      {/* Conteúdo da Aba Ativa */}

      <main className="flex-1 overflow-hidden bg-background relative">
        {visitedTabs.has('env') && (
          <div className={`h-full w-full ${activeTab === 'env' ? '' : 'hidden'}`}>
            <EnvironmentPage
              services={services}
              onRefreshServices={fetchServices}
              onNavigateToSettings={() => setActiveTab('settings')}
              onNavigateToHelp={navigateToHelp}
              isActive={activeTab === 'env'}
              settingsVersion={settingsVersion}
            />
          </div>
        )}
        {visitedTabs.has('database') && (
          <div className={`h-full w-full ${activeTab === 'database' ? '' : 'hidden'}`}>
            <DatabasePage settingsVersion={settingsVersion} />
          </div>
        )}
        {visitedTabs.has('containers') && (
          <div className={`h-full w-full ${activeTab === 'containers' ? '' : 'hidden'}`}>
            <ContainersPage isActive={activeTab === 'containers'} settingsVersion={settingsVersion} />
          </div>
        )}
        {visitedTabs.has('deploy') && (
          <div className={`h-full w-full ${activeTab === 'deploy' ? '' : 'hidden'}`}>
            <DeployPage
              projects={projects}
              onNavigateToSettings={() => setActiveTab('settings')}
              settingsVersion={settingsVersion}
            />
          </div>
        )}
        {visitedTabs.has('git') && (
          <div className={`h-full w-full ${activeTab === 'git' ? '' : 'hidden'}`}>
            <GitAzurePage
              projects={projects}
              onRefreshProjects={fetchProjects}
              isRefreshing={isRefreshing}
              onNavigateToSettings={() => setActiveTab('settings')}
            />
          </div>
        )}
        {visitedTabs.has('routines') && (
          <div className={`h-full w-full ${activeTab === 'routines' ? '' : 'hidden'}`}>
            <RoutinesPage onNavigateToSettings={() => setActiveTab('settings')} />
          </div>
        )}
        {visitedTabs.has('docs') && (
          <div className={`h-full w-full ${activeTab === 'docs' ? '' : 'hidden'}`}>
            <DocsPage onNavigateToSettings={() => setActiveTab('settings')} />
          </div>
        )}
        {visitedTabs.has('logs') && (
          <div className={`h-full w-full ${activeTab === 'logs' ? '' : 'hidden'}`}>
            <LogsPage onNavigateToSettings={() => setActiveTab('settings')} isActive={activeTab === 'logs'} />
          </div>
        )}
        {visitedTabs.has('settings') && (
          <div className={`h-full w-full ${activeTab === 'settings' ? '' : 'hidden'}`}>
            <SettingsPage onSettingsSaved={handleSettingsSaved} onNavigate={(tab) => setActiveTab(tab)} />
          </div>
        )}
        {visitedTabs.has('help') && (
          <div className={`h-full w-full ${activeTab === 'help' ? '' : 'hidden'}`}>
            <HelpPage
              onNavigate={(tab) => setActiveTab(tab)}
              initialSearch={helpSearch}
              onRestartTour={() => setIsTourOpen(true)}
            />
          </div>
        )}
      </main>

      <ToastHost />

      <OnboardingTour
        steps={TOUR_STEPS}
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        storageKey={TOUR_STORAGE_KEY}
      />
    </div>
  );
};

export default App;
