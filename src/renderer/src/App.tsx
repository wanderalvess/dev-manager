import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { RefreshCw } from 'lucide-react';
import { Header } from './components/Header';
import { QuickLauncherModal } from './components/QuickLauncherModal';
import { ToastHost, showToast } from './components/ToastHost';
import { OnboardingTour } from './components/onboarding/OnboardingTour';
import { WelcomeIntro } from './components/onboarding/WelcomeIntro';
import { PageToursPromptModal } from './components/onboarding/PageToursPromptModal';
import { PAGE_TOURS_PREF_KEY } from './components/onboarding/usePageTour';
import { TOUR_STEPS, TOUR_STORAGE_KEY } from './components/onboarding/tourSteps';
import { WELCOME_STORAGE_KEY } from './components/onboarding/welcomeSteps';
import { getMissingRequiredPaths } from './utils/environmentPageUtils';
import changelogRaw from '../../../CHANGELOG.md?raw';
import { ServiceStatus, GitProjectInfo } from '../../shared/types';

// Code-split cada página: cada aba só baixa/parseia seu próprio bundle na primeira
// vez que é visitada (visitedTabs em conjunto com isso evita tanto o parse quanto o
// download antecipado de todas as ~10 páginas no startup do app).
const EnvironmentPage = lazy(() => import('./pages/EnvironmentPage').then((m) => ({ default: m.EnvironmentPage })));
const DatabasePage = lazy(() => import('./pages/DatabasePage').then((m) => ({ default: m.DatabasePage })));
const ContainersPage = lazy(() => import('./pages/ContainersPage').then((m) => ({ default: m.ContainersPage })));
const DeployPage = lazy(() => import('./pages/DeployPage').then((m) => ({ default: m.DeployPage })));
const GitAzurePage = lazy(() => import('./pages/GitAzurePage').then((m) => ({ default: m.GitAzurePage })));
const RoutinesPage = lazy(() => import('./pages/RoutinesPage').then((m) => ({ default: m.RoutinesPage })));
const DocsPage = lazy(() => import('./pages/DocsPage').then((m) => ({ default: m.DocsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const LogsPage = lazy(() => import('./pages/LogsPage').then((m) => ({ default: m.LogsPage })));
const ApmPage = lazy(() => import('./pages/ApmPage').then((m) => ({ default: m.ApmPage })));
const QualityPage = lazy(() => import('./pages/QualityPage').then((m) => ({ default: m.QualityPage })));
// Modal de novidades e histórico de versões do changelog
const WhatsNewModal = lazy(() => import('./components/WhatsNewModal').then((m) => ({ default: m.WhatsNewModal })));

const PageLoadingFallback: React.FC = () => (
  <div className="h-full w-full flex items-center justify-center">
    <RefreshCw className="w-6 h-6 text-primary animate-spin" />
  </div>
);

// Decide a aba inicial: se o onboarding inicial ainda não foi concluído, a primeira tela no primeiro uso é sempre 'help' (Central de Ajuda).
const getInitialTab = (): string => {
  try {
    const hasSeenOnboarding =
      window.localStorage.getItem(TOUR_STORAGE_KEY) ||
      window.localStorage.getItem(WELCOME_STORAGE_KEY);
    return hasSeenOnboarding ? 'env' : 'help';
  } catch {
    return 'help';
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
  const [isWelcomeOpen, setIsWelcomeOpen] = useState<boolean>(() => {
    try {
      return !window.localStorage.getItem(WELCOME_STORAGE_KEY);
    } catch {
      return false;
    }
  });
  const [isPageToursPromptOpen, setIsPageToursPromptOpen] = useState<boolean>(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState<boolean>(false);
  const [changelogContent, setChangelogContent] = useState<string>('');
  const [appVersion, setAppVersion] = useState<string>('');

  const handleOpenWhatsNew = useCallback(async () => {
    if (window.electronAPI?.getChangelog) {
      try {
        const content = await window.electronAPI.getChangelog();
        if (content && !content.startsWith('Erro ao ler')) {
          setChangelogContent(content);
          setIsWhatsNewOpen(true);
          return;
        }
      } catch {
        // segue para o fallback estático
      }
    }
    setChangelogContent(changelogRaw);
    setIsWhatsNewOpen(true);
  }, []);

  const handleFinishWelcome = useCallback(() => {
    setIsWelcomeOpen(false);
  }, []);

  const handleCloseTour = useCallback(() => {
    setIsTourOpen(false);
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify({ done: true, ts: Date.now() }));
    } catch {
      // localStorage indisponível
    }

    // O tour mostra onde ficam as telas, mas sem os caminhos essenciais (Karaf, repositórios, IDE)
    // configurados o app não faz nada de útil ainda — manda pra Configurações, que já tem seu
    // próprio checklist detalhado (computeSetupChecklistStatus) pra guiar os campos específicos;
    // o toast aqui só aponta pra lá, sem repetir/discordar da lista de campos que o checklist define.
    (async () => {
      let missingPaths: string[] = [];
      try {
        if (window.electronAPI?.getSettings) {
          const st = await window.electronAPI.getSettings();
          missingPaths = getMissingRequiredPaths(st);
        }
      } catch {
        // segue sem checagem de setup — não bloqueia o fluxo de onboarding
      }

      if (missingPaths.length > 0) {
        showToast('Configure seu ambiente antes de continuar — veja o checklist em Configurações.', 'info');
        setActiveTab('settings');
      }

      try {
        // Se ainda não foi perguntado se quer ver tutoriais das próximas telas, abre o modal de escolha.
        // Roda independente do redirecionamento acima: sem isso, quem tem caminhos pendentes (a
        // maioria das instalações novas) nunca chegaria a ser perguntado.
        if (window.localStorage.getItem(PAGE_TOURS_PREF_KEY) === null) {
          setIsPageToursPromptOpen(true);
        }
      } catch {
        // localStorage indisponível
      }
    })();
  }, []);

  // Primeira execução após instalação: o estado inicial de isWelcomeOpen/isTourOpen/activeTab já
  // é calculado de forma síncrona a partir do localStorage (vazio nessa hora, pois é instalação
  // nova) — então Welcome+Tour já abrem certo antes mesmo deste efeito rodar. Esta chamada ao
  // Electron (isFirstRun) é assíncrona e pode demorar (ela aguarda checkAdminPrivileges, que
  // spawna um processo do Windows); NÃO reforçamos aqui a reabertura de Welcome/Tour, porque se o
  // usuário for rápido e já tiver pulado a introdução antes dela responder, forçar de novo jogava
  // ele de volta pro onboarding do nada. Só usamos o resultado pra limpar um marcador desalinhado
  // (ex: pasta de dados restaurada de outra máquina).
  useEffect(() => {
    if (!window.electronAPI?.getAppInfo) return;
    window.electronAPI.getAppInfo().then((info) => {
      if (info.isFirstRun) {
        try {
          window.localStorage.removeItem(TOUR_STORAGE_KEY);
          window.localStorage.removeItem(WELCOME_STORAGE_KEY);
          window.localStorage.removeItem(PAGE_TOURS_PREF_KEY);
        } catch {
          // localStorage indisponível
        }
        return;
      }

      if (info.appVersion) {
        setAppVersion(info.appVersion);
      }

      if (info.isAppUpdated) {
        if (window.electronAPI?.getChangelog) {
          window.electronAPI.getChangelog().then((content) => {
            if (content && !content.startsWith('Erro ao ler')) {
              setChangelogContent(content);
            } else {
              setChangelogContent(changelogRaw);
            }
            setIsWhatsNewOpen(true);
          }).catch(() => {
            setChangelogContent(changelogRaw);
            setIsWhatsNewOpen(true);
          });
        } else {
          setChangelogContent(changelogRaw);
          setIsWhatsNewOpen(true);
        }
      }
    }).catch(() => {});
  }, []);

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

  // Suporte a atalhos de teclado (Alt+0 .. Alt+9 e Ctrl+K) — manter em sincronia com os
  // `shortcut` do Header, os `badge` do QuickLauncherModal e a tabela da Central de Ajuda.
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
        else if (e.key === '0') setActiveTab('apm');
        else if (e.key.toLowerCase() === 'q') setActiveTab('quality');
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
        onOpenWhatsNew={handleOpenWhatsNew}
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
        <Suspense fallback={<PageLoadingFallback />}>
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
            <DatabasePage settingsVersion={settingsVersion} onNavigateToSettings={() => setActiveTab('settings')} />
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
              settingsVersion={settingsVersion}
            />
          </div>
        )}
        {visitedTabs.has('routines') && (
          <div className={`h-full w-full ${activeTab === 'routines' ? '' : 'hidden'}`}>
            <RoutinesPage
              onNavigateToSettings={() => setActiveTab('settings')}
              onNavigateToEnv={() => setActiveTab('env')}
              settingsVersion={settingsVersion}
            />
          </div>
        )}
        {visitedTabs.has('docs') && (
          <div className={`h-full w-full ${activeTab === 'docs' ? '' : 'hidden'}`}>
            <DocsPage
              onNavigateToSettings={() => setActiveTab('settings')}
              settingsVersion={settingsVersion}
            />
          </div>
        )}
        {visitedTabs.has('logs') && (
          <div className={`h-full w-full ${activeTab === 'logs' ? '' : 'hidden'}`}>
            <LogsPage
              onNavigateToSettings={() => setActiveTab('settings')}
              isActive={activeTab === 'logs'}
              settingsVersion={settingsVersion}
            />
          </div>
        )}
        {visitedTabs.has('apm') && (
          <div className={`h-full w-full ${activeTab === 'apm' ? '' : 'hidden'}`}>
            <ApmPage
              isActive={activeTab === 'apm'}
              onNavigateToSettings={() => setActiveTab('settings')}
              onNavigateToDatabase={() => setActiveTab('database')}
            />
          </div>
        )}
        {visitedTabs.has('quality') && (
          <div className={`h-full w-full ${activeTab === 'quality' ? '' : 'hidden'}`}>
            <QualityPage
              isActive={activeTab === 'quality'}
              onNavigate={(tab) => setActiveTab(tab)}
              settingsVersion={settingsVersion}
            />
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
              settingsVersion={settingsVersion}
              onRestartTour={() => {
                // O botão só promete o tour de spotlight — reabrir também a introdução (tema,
                // slides de boas-vindas) surpreendia quem só queria rever onde ficam os recursos.
                try {
                  window.localStorage.removeItem(PAGE_TOURS_PREF_KEY);
                  window.localStorage.removeItem(TOUR_STORAGE_KEY);
                } catch {
                  // localStorage indisponível
                }
                setIsTourOpen(true);
              }}
              onResetPageTours={() => {
                // Diferente de "Ver Tour Guiado": não replaya o tour global inteiro, só limpa a
                // marca de "já visto" dos tours de cada tela (devManager:tour:*) e a preferência
                // sim/não — quem clicou "Pular e explorar sozinho" na primeira vez fica preso
                // nessa escolha pra sempre sem este botão.
                try {
                  const keysToRemove: string[] = [];
                  for (let i = 0; i < window.localStorage.length; i++) {
                    const key = window.localStorage.key(i);
                    if (key && key.startsWith('devManager:tour:')) keysToRemove.push(key);
                  }
                  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
                  window.localStorage.removeItem(PAGE_TOURS_PREF_KEY);
                } catch {
                  // localStorage indisponível
                }
                setIsPageToursPromptOpen(true);
              }}
            />
          </div>
        )}
        </Suspense>
      </main>

      <ToastHost />

      <WelcomeIntro isOpen={isWelcomeOpen} onFinish={handleFinishWelcome} />

      <OnboardingTour
        steps={TOUR_STEPS}
        isOpen={isTourOpen && !isWelcomeOpen}
        onClose={handleCloseTour}
        storageKey={TOUR_STORAGE_KEY}
      />

      <PageToursPromptModal
        isOpen={isPageToursPromptOpen}
        onSelectChoice={() => setIsPageToursPromptOpen(false)}
      />

      {isWhatsNewOpen && changelogContent && (
        <Suspense fallback={null}>
          <WhatsNewModal
            isOpen={isWhatsNewOpen}
            onClose={() => setIsWhatsNewOpen(false)}
            changelogContent={changelogContent}
            currentAppVersion={appVersion}
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
