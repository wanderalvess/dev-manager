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

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [projects, setProjects] = useState<GitProjectInfo[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isQuickLauncherOpen, setIsQuickLauncherOpen] = useState<boolean>(false);
  const [helpSearch, setHelpSearch] = useState<string>('');

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
  const fetchServices = useCallback(async () => {
    if (isFetchingServicesRef.current) return;
    if (window.electronAPI) {
      isFetchingServicesRef.current = true;
      try {
        const data = await window.electronAPI.getServicesStatus();
        setServices((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data || [];
        });
      } catch (err) {
        console.warn('[App] Erro ao carregar status dos serviços:', err);
      } finally {
        isFetchingServicesRef.current = false;
      }
    }
  }, []);

  const isFetchingProjectsRef = React.useRef(false);
  const fetchProjects = useCallback(async () => {
    if (isFetchingProjectsRef.current) return;
    if (window.electronAPI) {
      isFetchingProjectsRef.current = true;
      try {
        const data = await window.electronAPI.listProjects();
        setProjects((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data || [];
        });
      } catch (err) {
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
            onNavigateToHelp={navigateToHelp}
          />
        )}
        {activeTab === 'database' && <DatabasePage />}
        {activeTab === 'containers' && <ContainersPage />}
        {activeTab === 'deploy' && (
          <DeployPage
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
        {activeTab === 'logs' && <LogsPage onNavigateToSettings={() => setActiveTab('settings')} />}
        {activeTab === 'settings' && (
          <SettingsPage onSettingsSaved={refreshAll} onNavigate={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'help' && (
          <HelpPage onNavigate={(tab) => setActiveTab(tab)} initialSearch={helpSearch} />
        )}
      </main>

      <ToastHost />
    </div>
  );
};

export default App;
