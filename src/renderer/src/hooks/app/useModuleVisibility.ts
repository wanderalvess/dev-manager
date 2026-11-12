import { useCallback, useEffect, useMemo, useState } from 'react';
import { NAV_THEME_GROUPS } from '../../components/header/headerNavConfig';
import { DEFAULT_TOUR_STEPS } from '../../components/onboarding/tourSteps';

export function useModuleVisibility(
  activeTab: string,
  setActiveTab: (tab: string) => void,
  visitedTabs: Set<string>,
  settingsVersion: number
) {
  const [disabledModules, setDisabledModules] = useState<string[]>([]);

  useEffect(() => {
    window.electronAPI?.getSettings?.().then((s) => {
      if (Array.isArray(s?.disabledModules)) setDisabledModules(s.disabledModules);
    }).catch(() => {});
  }, [settingsVersion]);

  const navGroups = useMemo(() => {
    if (disabledModules.length === 0) return NAV_THEME_GROUPS;
    return NAV_THEME_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => !disabledModules.includes(item.id))
    })).filter((g) => g.items.length > 0);
  }, [disabledModules]);

  const navigate = useCallback(
    (tab: string) => {
      if (disabledModules.includes(tab)) return;
      setActiveTab(tab);
    },
    [disabledModules, setActiveTab]
  );

  const mountedTabs = useMemo(() => {
    const out = new Set(visitedTabs);
    out.add(activeTab);
    return out;
  }, [visitedTabs, activeTab]);

  return {
    disabledModules,
    navGroups,
    navigate,
    mountedTabs,
    tourSteps: DEFAULT_TOUR_STEPS
  };
}
