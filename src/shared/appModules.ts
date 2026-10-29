// Páginas da navegação que o usuário pode ligar/desligar (Configurações → Módulos), na ordem do Header.
// 'help' e 'settings' não são módulos: ficam sempre disponíveis. Manter em sincronia com
// renderer/src/components/header/headerNavConfig.ts (o teste de moduleVisibility confere).
export const APP_MODULE_IDS = [
  'env',
  'containers',
  'winthor',
  'deploy',
  'karaf',
  'logs',
  'apm',
  'integration-trace',
  'database',
  'db-backups',
  'routines',
  'git',
  'docs',
  'http-client',
  'quality',
  'quality-regression',
  'quality-runners',
  'quality-taut'
] as const;

export type AppModuleId = (typeof APP_MODULE_IDS)[number];

export const isAppModuleId = (id: string): id is AppModuleId => (APP_MODULE_IDS as readonly string[]).includes(id);

/**
 * Limpa a lista de módulos desligados vinda de fora (IPC/REST/MCP/import): descarta ids desconhecidos e
 * repetidos e, se tudo vier desligado, religa o primeiro módulo — o app nunca fica sem nenhuma página.
 * Persistir os desligados (e não os ligados) faz um módulo novo de uma versão futura já nascer ligado.
 */
export function normalizeDisabledModules(value: unknown): AppModuleId[] {
  if (!Array.isArray(value)) return [];
  const disabled = APP_MODULE_IDS.filter((id) => value.includes(id));
  return disabled.length === APP_MODULE_IDS.length ? disabled.slice(1) : disabled;
}

/** Abas que não são módulos (Ajuda, Configurações) estão sempre ligadas. */
export const isModuleEnabled = (tab: string, disabledModules: readonly string[] | undefined): boolean =>
  !isAppModuleId(tab) || !(disabledModules ?? []).includes(tab);

export const getEnabledModuleIds = (disabledModules: readonly string[] | undefined): AppModuleId[] =>
  APP_MODULE_IDS.filter((id) => isModuleEnabled(id, disabledModules));
