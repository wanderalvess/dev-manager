import { useState, useEffect, useCallback } from 'react';
import { TOUR_STORAGE_KEY } from '../../components/onboarding/tourSteps';
import { WELCOME_STORAGE_KEY } from '../../components/onboarding/welcomeSteps';
import { resolveInitialTab } from '../../utils/appShellNavigation';

const getInitialTab = (): string => {
  try {
    const hasSeenOnboarding =
      window.localStorage.getItem(TOUR_STORAGE_KEY) || window.localStorage.getItem(WELCOME_STORAGE_KEY);
    return resolveInitialTab(!!hasSeenOnboarding);
  } catch {
    return 'help';
  }
};

// Aba ativa, abas já visitadas (montagem preguiçosa), busca da Ajuda e Quick Launcher.
export function useAppShellNavigation() {
  const [activeTab, setActiveTab] = useState<string>(getInitialTab);
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([getInitialTab()]));
  const [helpSearch, setHelpSearch] = useState<string>('');
  const [isQuickLauncherOpen, setIsQuickLauncherOpen] = useState<boolean>(false);

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

  return {
    activeTab,
    setActiveTab,
    visitedTabs,
    helpSearch,
    navigateToHelp,
    isQuickLauncherOpen,
    setIsQuickLauncherOpen
  };
}
