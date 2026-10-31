import React from 'react';
import { Header } from './components/Header';
import { QuickLauncherModal } from './components/QuickLauncherModal';
import { AppPageHost } from './components/app/AppPageHost';
import { AppSidebar } from './components/app/AppSidebar';
import { AppGlobalModals } from './components/app/AppGlobalModals';
import { ConsoleDock } from './components/console/ConsoleDock';
import { KarafConsoleProvider } from './hooks/karafConsole/KarafConsoleContext';
import { useAppShellNavigation } from './hooks/app/useAppShellNavigation';
import { useAppShellData } from './hooks/app/useAppShellData';
import { useAppShellOnboarding } from './hooks/app/useAppShellOnboarding';
import { useAppShellNotifications } from './hooks/app/useAppShellNotifications';
import { useGlobalShortcuts } from './hooks/app/useGlobalShortcuts';
import { useModuleVisibility } from './hooks/app/useModuleVisibility';

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
  // Toda navegação passa por `navigate`, que barra páginas de módulos desligados em Configurações → Módulos.
  const modules = useModuleVisibility(activeTab, setActiveTab, visitedTabs, data.settingsVersion);
  const { navigate } = modules;

  // Atalhos Alt+N: manter em sincronia com Header, QuickLauncherModal e a tabela da Ajuda
  // (fonte do mapa em utils/appShellNavigation.ts).
  useGlobalShortcuts(navigate, setIsQuickLauncherOpen);
  useAppShellNotifications();

  return (
    <KarafConsoleProvider>
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden select-none transition-colors duration-300">
      {/* Menu lateral com todos os módulos (a partir de lg; abaixo disso o Header traz o seletor compacto) */}
      <AppSidebar
        activeTab={activeTab}
        setActiveTab={navigate}
        navGroups={modules.navGroups}
        onOpenWhatsNew={onboarding.handleOpenWhatsNew}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Topo / Header Cockpit */}
      <Header
        activeTab={activeTab}
        setActiveTab={navigate}
        navGroups={modules.navGroups}
        onRefreshAll={data.refreshAll}
        isRefreshing={data.isRefreshing}
        onOpenQuickLauncher={() => setIsQuickLauncherOpen(true)}
        onOpenWhatsNew={onboarding.handleOpenWhatsNew}
      />

      {/* Modal de Busca Rápida (Ctrl+K) */}
      <QuickLauncherModal
        isOpen={isQuickLauncherOpen}
        onClose={() => setIsQuickLauncherOpen(false)}
        onNavigate={navigate}
        disabledModules={modules.disabledModules}
        projects={data.projects}
        onRefreshAll={data.refreshAll}
      />

      {/* Conteúdo da Aba Ativa */}
      <AppPageHost
        activeTab={activeTab}
        setActiveTab={navigate}
        visitedTabs={modules.mountedTabs}
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

      <ConsoleDock />
      </div>

      <AppGlobalModals
        isSplashOpen={onboarding.isSplashOpen}
        isNewUser={onboarding.isNewUser}
        onSplashStartOnboarding={onboarding.handleSplashStartOnboarding}
        onSplashExplore={onboarding.handleSplashExplore}
        onSplashEnter={onboarding.handleSplashEnter}
        onSplashWhatsNew={onboarding.handleSplashWhatsNew}
        onSettingsSaved={data.handleSettingsSaved}
        onOpenSettings={onboarding.handleWelcomeOpenSettings}
        onOpenInfrFirstSteps={onboarding.handleWelcomeOpenInfrFirstSteps}
        isWelcomeOpen={onboarding.isWelcomeOpen}
        isTourOpen={onboarding.isTourOpen}
        tourSteps={modules.tourSteps}
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
    </KarafConsoleProvider>
  );
};

export default App;
