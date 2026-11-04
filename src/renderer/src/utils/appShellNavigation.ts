import { isAppModuleId, isModuleEnabled } from '../../../shared/appModules';

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
  '9': 'http-client',
  '0': 'apm',
  q: 'quality',
  h: 'help'
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
  const key = e.key.toLowerCase();
  return Object.prototype.hasOwnProperty.call(ALT_SHORTCUT_TABS, key) ? ALT_SHORTCUT_TABS[key] : null;
};

/** Última aba usada, para o app abrir nela da próxima vez. */
export const LAST_TAB_STORAGE_KEY = 'devManager:lastTab';

/** Abas que existem: os módulos, a Ajuda e as Configurações (valor guardado de versão antiga pode não existir mais). */
export const isKnownTab = (tab: string | null | undefined): tab is string =>
  !!tab && (isAppModuleId(tab) || tab === 'help' || tab === 'settings');

// Primeira tela no primeiro uso é 'help' (Central de Ajuda); depois do onboarding, a última aba usada ('env' sem ela).
export const resolveInitialTab = (hasSeenOnboarding: boolean, lastTab?: string | null): string => {
  if (!hasSeenOnboarding) return 'help';
  return isKnownTab(lastTab) ? lastTab : 'env';
};

/**
 * Aba ao clicar em Entrar no cockpit: a escolhida em Configurações (Aparência → Tela ao entrar), se ainda existir e estiver
 * ligada; senão null, e o app fica na aba em que abriu (a última usada).
 */
export const resolveEnterTab = (startTab: string | undefined, disabledModules: readonly string[] | undefined): string | null =>
  isKnownTab(startTab) && isModuleEnabled(startTab, disabledModules) ? startTab : null;

// Prefixo das chaves de "tour já visto" por tela; limpas ao resetar os tours de página.
export const PAGE_TOUR_KEY_PREFIX = 'devManager:tour:';

export const collectPageTourKeys = (keys: Array<string | null>): string[] =>
  keys.filter((key): key is string => !!key && key.startsWith(PAGE_TOUR_KEY_PREFIX));
