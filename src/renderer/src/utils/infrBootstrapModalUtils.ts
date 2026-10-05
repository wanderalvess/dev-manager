export type InfrBootstrapTab = 'oracle' | 'wta' | 'wsh' | 'scripts';

// Vazio = o backend detecta a pasta INFR-Docker a partir do diretório de projetos configurado
export const INFR_DEFAULT_CUSTOM_PATH = '';
export const INFR_DEFAULT_ORACLE_CONTAINER = 'oracle-winthor';
export const INFR_DEFAULT_ORACLE_PORT = 1521;
export const INFR_DEFAULT_WTA_CONTAINER = 'linux-winthor';
export const INFR_DEFAULT_WTA_PORT = 8080;

/** Converte o valor do input numérico; campo vazio/inválido volta ao padrão. */
export function infrBootstrapModalParsePort(value: string, fallback: number): number {
  return parseInt(value, 10) || fallback;
}

/** Linha de comando exibida na prévia (somente visual, nada é executado a partir dela). */
export function infrBootstrapModalPreviewCommand(
  script: 'oracle_setup.sh' | 'wta_setup.sh',
  container: string,
  port: number,
  defaultContainer: string,
  defaultPort: number
): string {
  return `./${script} --container ${container || defaultContainer} --port ${port || defaultPort}`;
}

/** Classes do botão de aba; a cor ativa é fixa (laranja) neste modal. */
export function infrBootstrapModalTabClass(active: boolean): string {
  const base =
    'px-3.5 py-2.5 text-xs font-bold rounded-t-lg border-b-2 flex items-center gap-2 transition cursor-pointer';
  return active
    ? `${base} border-orange-500 text-orange-600 dark:text-orange-400 bg-card shadow-2xs`
    : `${base} border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40`;
}
