import { getEnabledModuleIds, isAppModuleId, isModuleEnabled, normalizeDisabledModules } from '../../../shared/appModules';
import type { NavThemeGroup } from '../components/header/headerNavConfig';
import type { TourStep } from '../components/onboarding/tourSteps';

/** Grupos da navegação só com as páginas ligadas; grupo que fica vazio some do Header. */
export function filterNavGroups(groups: NavThemeGroup[], disabledModules: readonly string[]): NavThemeGroup[] {
  return groups
    .map((group) => ({ ...group, items: group.items.filter((item) => isModuleEnabled(item.id, disabledModules)) }))
    .filter((group) => group.items.length > 0);
}

/**
 * Aba para onde ir quando a atual foi desligada: a primeira página ligada, na ordem da navegação.
 * Devolve a própria aba quando ela continua disponível.
 */
export function resolveFallbackTab(activeTab: string, disabledModules: readonly string[]): string {
  if (isModuleEnabled(activeTab, disabledModules)) return activeTab;
  return getEnabledModuleIds(disabledModules)[0] ?? 'help';
}

/** Passos do tour global que apontam para um grupo do menu lateral que sumiu (`nav-<grupo>`) não têm onde ancorar. */
export function filterTourSteps(steps: TourStep[], visibleGroups: NavThemeGroup[]): TourStep[] {
  const visible = new Set(visibleGroups.map((group) => `nav-${group.id}`));
  // `nav-integrations` não é um grupo de módulos: fica sempre no menu lateral.
  return steps.filter(
    (step) => !step.target?.startsWith('nav-') || step.target === 'nav-integrations' || visible.has(step.target)
  );
}

/** Abas visitadas que continuam montadas: página desligada desmonta (para polling e tour de página). */
export function filterMountedTabs(visitedTabs: Set<string>, disabledModules: readonly string[]): Set<string> {
  if (disabledModules.length === 0) return visitedTabs;
  return new Set([...visitedTabs].filter((tab) => isModuleEnabled(tab, disabledModules)));
}

/** Liga/desliga uma página; desligar a última página ligada é ignorado (sempre sobra uma). */
export function toggleModule(disabledModules: readonly string[], id: string, enabled: boolean): string[] {
  if (enabled) return disabledModules.filter((d) => d !== id);
  const enabledIds = getEnabledModuleIds(disabledModules);
  if (!isAppModuleId(id) || !enabledIds.includes(id) || enabledIds.length === 1) return [...disabledModules];
  return normalizeDisabledModules([...disabledModules, id]);
}
