// Mapa tecla -> aba dos atalhos Alt+N. Manter em sincronia com os `shortcut` do Header
// (header/headerNavConfig.ts), os `badge` do QuickLauncherModal e a tabela da Central de Ajuda.
export const ALT_SHORTCUT_TABS: Readonly<Record<string, string>> = {
  '1': 'env',
  '2': 'database',
  '3': 'containers',
  '4': 'deploy',
  '5': 'git',
  '6': 'routines',
  '7': 'docs',
  '8': 'logs',
  '9': 'help',
  '0': 'apm',
  q: 'quality'
};

export interface ShortcutKeyEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

export const isQuickLauncherToggle = (e: ShortcutKeyEvent): boolean =>
  (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';

// Retorna a aba alvo do atalho Alt+tecla, ou null quando o evento não é um atalho de navegação.
export const resolveAltShortcutTab = (e: ShortcutKeyEvent): string | null => {
  if (!e.altKey) return null;
  const key = e.key === 'Q' ? 'q' : e.key;
  return Object.prototype.hasOwnProperty.call(ALT_SHORTCUT_TABS, key) ? ALT_SHORTCUT_TABS[key] : null;
};

// Primeira tela no primeiro uso é 'help' (Central de Ajuda); depois do onboarding, 'env'.
export const resolveInitialTab = (hasSeenOnboarding: boolean): string => (hasSeenOnboarding ? 'env' : 'help');

// Prefixo das chaves de "tour já visto" por tela; limpas ao resetar os tours de página.
export const PAGE_TOUR_KEY_PREFIX = 'devManager:tour:';

export const collectPageTourKeys = (keys: Array<string | null>): string[] =>
  keys.filter((key): key is string => !!key && key.startsWith(PAGE_TOUR_KEY_PREFIX));
