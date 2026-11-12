import { useCallback, useState } from 'react';

export const TAB_SHORTCUTS: Record<string, string> = {
  '1': 'env',
  '2': 'database',
  '3': 'containers',
  '4': 'deploy',
  '5': 'git',
  '6': 'routines',
  '7': 'docs',
  '8': 'logs',
  '9': 'http-client',
  '0': 'apm',
  'q': 'quality',
  'h': 'help'
};

export function useAppShellNavigation() {
  const [activeTab, setActiveTabState] = useState<string>('env');
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['env']));
  const [helpSearch, setHelpSearch] = useState<string>('');
  const [isQuickLauncherOpen, setIsQuickLauncherOpen] = useState(false);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab);
    setVisitedTabs((prev) => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
  }, []);

  const navigateToHelp = useCallback(
    (search = '') => {
      setHelpSearch(search);
      setActiveTab('help');
    },
    [setActiveTab]
  );

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
