import React from 'react';
import { Header } from './components/Header';
import { QuickLauncherModal } from './components/QuickLauncherModal';
import { AppPageHost } from './components/app/AppPageHost';
import { AppGlobalModals } from './components/app/AppGlobalModals';
import { useAppShellNavigation } from './hooks/app/useAppShellNavigation';
import { useAppShellData } from './hooks/app/useAppShellData';
import { useAppShellOnboarding } from './hooks/app/useAppShellOnboarding';
import { useAppShellNotifications } from './hooks/app/useAppShellNotifications';
import { useGlobalShortcuts } from './hooks/app/useGlobalShortcuts';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    visitedTabs,
    helpSearch,
    navigateToHelp,
    isQuickLauncherOpen,
    setIsQuickLauncherOpen
  } = useAppShellNavigation();
  const data = useAppShellData(activeTab);
  const onboarding = useAppShellOnboarding(setActiveTab);

  // Atalhos Alt+N: manter em sincronia com Header, QuickLauncherModal e a tabela da Ajuda
  // (fonte do mapa em utils/appShellNavigation.ts).
  useGlobalShortcuts(setActiveTab, setIsQuickLauncherOpen);
  useAppShellNotifications();

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-foreground overflow-hidden select-none transition-colors duration-300">
      {/* Topo / Header Cockpit */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefreshAll={data.refreshAll}
        isRefreshing={data.isRefreshing}
        onOpenQuickLauncher={() => setIsQuickLauncherOpen(true)}
        onOpenWhatsNew={onboarding.handleOpenWhatsNew}
      />

      {/* Modal de Busca Rápida (Ctrl+K) */}
      <QuickLauncherModal
        isOpen={isQuickLauncherOpen}
        onClose={() => setIsQuickLauncherOpen(false)}
        onNavigate={(tab) => setActiveTab(tab)}
        projects={data.projects}
        onRefreshAll={data.refreshAll}
      />

      {/* Conteúdo da Aba Ativa */}
      <AppPageHost
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        visitedTabs={visitedTabs}
        settingsVersion={data.settingsVersion}
        services={data.services}
        projects={data.projects}
        isRefreshing={data.isRefreshing}
        helpSearch={helpSearch}
        fetchServices={data.fetchServices}
        fetchProjects={data.fetchProjects}
        navigateToHelp={navigateToHelp}
        onSettingsSaved={data.handleSettingsSaved}
        onRestartTour={onboarding.handleRestartTour}
        onResetPageTours={onboarding.handleResetPageTours}
      />

      <AppGlobalModals
        isWelcomeOpen={onboarding.isWelcomeOpen}
        isTourOpen={onboarding.isTourOpen}
        isPageToursPromptOpen={onboarding.isPageToursPromptOpen}
        isWhatsNewOpen={onboarding.isWhatsNewOpen}
        changelogContent={onboarding.changelogContent}
        appVersion={onboarding.appVersion}
        onFinishWelcome={onboarding.handleFinishWelcome}
        onCloseTour={onboarding.handleCloseTour}
        onClosePageToursPrompt={() => onboarding.setIsPageToursPromptOpen(false)}
        onCloseWhatsNew={() => onboarding.setIsWhatsNewOpen(false)}
      />
    </div>
  );
};

export default App;
