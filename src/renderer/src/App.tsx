import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { EnvironmentPage } from './pages/EnvironmentPage';
import { DatabasePage } from './pages/DatabasePage';
import { ContainersPage } from './pages/ContainersPage';
import { KarafDeployPage } from './pages/KarafDeployPage';
import { GitAzurePage } from './pages/GitAzurePage';
import { RoutinesPage } from './pages/RoutinesPage';
import { DocsPage } from './pages/DocsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import { QuickLauncherModal } from './components/QuickLauncherModal';
import { ServiceStatus, GitProjectInfo } from '../../shared/types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('env');
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [projects, setProjects] = useState<GitProjectInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isQuickLauncherOpen, setIsQuickLauncherOpen] = useState<boolean>(false);

  const fetchServices = useCallback(async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.getServicesStatus();
      setServices(data);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (window.electronAPI) {
      const data = await window.electronAPI.listProjects();
      setProjects(data);
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

  useEffect(() => {
    refreshAll();
    // Polling a cada 8 segundos para status dos serviços
    const interval = setInterval(() => {
      fetchServices();
    }, 8000);
    return () => clearInterval(interval);
  }, [refreshAll, fetchServices]);

  // Suporte a atalhos de teclado (Alt+1 .. Alt+6 e Ctrl+K)
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
        else if (e.key === '4') setActiveTab('karaf');
        else if (e.key === '5') setActiveTab('git');
        else if (e.key === '6') setActiveTab('routines');
        else if (e.key === '7') setActiveTab('docs');
        else if (e.key === '8') setActiveTab('settings');
        else if (e.key === '9') setActiveTab('help');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

      <main className="flex-1 overflow-hidden bg-background">
        {activeTab === 'env' && (
          <EnvironmentPage
            services={services}
            onRefreshServices={fetchServices}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        )}
        {activeTab === 'database' && <DatabasePage />}
        {activeTab === 'containers' && <ContainersPage />}
        {activeTab === 'karaf' && (
          <KarafDeployPage
            projects={projects}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        )}
        {activeTab === 'git' && (
          <GitAzurePage
            projects={projects}
            onRefreshProjects={fetchProjects}
            isRefreshing={isRefreshing}
            onNavigateToSettings={() => setActiveTab('settings')}
          />
        )}
        {activeTab === 'routines' && (
          <RoutinesPage onNavigateToSettings={() => setActiveTab('settings')} />
        )}
        {activeTab === 'docs' && <DocsPage onNavigateToSettings={() => setActiveTab('settings')} />}
        {activeTab === 'settings' && <SettingsPage onSettingsSaved={refreshAll} />}
        {activeTab === 'help' && <HelpPage onNavigate={(tab) => setActiveTab(tab)} />}
      </main>
    </div>
  );
};

export default App;
