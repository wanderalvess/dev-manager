import { useCallback, useEffect, useMemo, useState } from 'react';
import { APP_MODULE_IDS, isModuleEnabled, normalizeDisabledModules } from '../../../../shared/appModules';
import { NAV_THEME_GROUPS } from '../../components/header/headerNavConfig';
import { TOUR_STEPS } from '../../components/onboarding/tourSteps';
import { showToast } from '../../components/ToastHost';
import { filterMountedTabs, filterNavGroups, filterTourSteps, resolveFallbackTab } from '../../utils/moduleVisibility';

const findModuleLabel = (tab: string): string =>
  NAV_THEME_GROUPS.flatMap((group) => group.items).find((item) => item.id === tab)?.label ?? tab;

/**
 * Módulos ligados/desligados (Configurações → Módulos): relê a lista a cada save de configurações,
 * filtra Header/tour/páginas montadas, barra a navegação para página desligada (atalhos, Ctrl+K, links
 * entre páginas) e tira o usuário da página atual se ela acabou de ser desligada.
 */
export function useModuleVisibility(
  activeTab: string,
  setActiveTab: (tab: string) => void,
  visitedTabs: Set<string>,
  settingsVersion: number
) {
  const [disabledModules, setDisabledModules] = useState<string[]>([]);
  // Até a primeira leitura, nenhuma página de módulo monta: evita abrir (e já disparar o polling de) uma
  // página que estava desligada só para desmontá-la logo depois.
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.getSettings) {
      setIsLoaded(true);
      return;
    }
    let cancelled = false;
    api
      .getSettings()
      .then((settings) => {
        if (!cancelled) setDisabledModules(normalizeDisabledModules(settings.disabledModules));
      })
      .catch((err) => console.warn('[App] Falha ao carregar os módulos ligados:', err))
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [settingsVersion]);

  useEffect(() => {
    const fallback = resolveFallbackTab(activeTab, disabledModules);
    if (fallback !== activeTab) setActiveTab(fallback);
  }, [activeTab, disabledModules, setActiveTab]);

  const navigate = useCallback(
    (tab: string) => {
      if (isModuleEnabled(tab, disabledModules)) {
        setActiveTab(tab);
        return;
      }
      showToast(`O módulo "${findModuleLabel(tab)}" está desligado. Ligue-o em Configurações → Módulos.`, 'info');
    },
    [disabledModules, setActiveTab]
  );

  const navGroups = useMemo(() => filterNavGroups(NAV_THEME_GROUPS, disabledModules), [disabledModules]);
  const tourSteps = useMemo(() => filterTourSteps(TOUR_STEPS, navGroups), [navGroups]);
  const mountedTabs = useMemo(
    () => (isLoaded ? filterMountedTabs(visitedTabs, disabledModules) : filterMountedTabs(visitedTabs, APP_MODULE_IDS)),
    [isLoaded, visitedTabs, disabledModules]
  );

  return { disabledModules, navigate, navGroups, tourSteps, mountedTabs };
}
