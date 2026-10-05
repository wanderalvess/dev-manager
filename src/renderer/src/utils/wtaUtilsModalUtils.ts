export type WtaUtilsTab = 'access' | 'karaf' | 'dev';

/** Usuário e senha padrão do WTA separados por TAB, como colados em formulários. */
export const WTA_DEFAULT_CREDENTIALS_CLIPBOARD = 'PCADMIN\t1';

export const WTA_ENV_SAMPLE =
  'DB_HOST=172.17.0.1\nDB_PORT=1521\nDB_SERVICE=XE\nDB_USER=LOCAL\nDB_PASSWORD=pcinfo\n';

/** Remove a barra inicial que o Docker adiciona ao nome do container. */
export function wtaUtilsModalCleanName(names: string): string {
  return names.replace(/^\//, '');
}

export function wtaUtilsModalPortalUrls(port: number): { portalUrl: string; installerUrl: string } {
  return {
    portalUrl: `http://localhost:${port}/wta/`,
    installerUrl: `http://localhost:${port}/instalador`
  };
}

/** Classes do botão de aba; a cor ativa é fixa (ciano) neste modal. */
export function wtaUtilsModalTabClass(active: boolean): string {
  const base =
    'px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer';
  return active
    ? `${base} border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-card shadow-2xs`
    : `${base} border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40`;
}
