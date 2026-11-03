/** Telas do assistente: 'home' é a lista de ambientes; as outras abrem a partir dela, com o caminho de volta no cabeçalho. */
export type InfrBootstrapTab = 'home' | 'firstSteps' | 'oracle' | 'wta' | 'wsh' | 'newVersion' | 'verify' | 'scripts';

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

/** Nome de cada tela no cabeçalho (a de ambientes é a raiz; as outras mostram "Ambientes / <nome>"). */
export const INFR_VIEW_TITLE: Record<InfrBootstrapTab, string> = {
  home: 'Ambientes WinThor',
  firstSteps: 'Montar do zero',
  newVersion: 'Nova versão',
  verify: 'Verificar',
  oracle: 'Subir só o banco',
  wta: 'Subir só o WTA',
  wsh: 'Subir só o WSH',
  scripts: 'Scripts e pasta'
};

/** Estado de um container em palavras curtas, para o pipeline Oracle → WTA → WSH. */
export function infrContainerStateText(c?: { state: string }): string {
  if (!c) return 'não tem';
  switch (c.state) {
    case 'running':
      return 'no ar';
    case 'exited':
      return 'parado';
    case 'restarting':
      return 'reiniciando';
    case 'created':
      return 'criado, não iniciado';
    case 'paused':
      return 'pausado';
    default:
      return c.state || 'estado desconhecido';
  }
}

export type InfrPartTone = 'up' | 'wait' | 'down' | 'none';

/** Selo curto e tom de um container no Verificar (no ar, iniciando, parado, não criado). */
export function infrCheckBadge(c: { exists: boolean; state?: string; health?: string }): { text: string; tone: InfrPartTone } {
  if (!c.exists) return { text: 'não criado', tone: 'none' };
  if (c.state === 'running' && c.health === 'unhealthy') return { text: 'unhealthy', tone: 'down' };
  if (c.state === 'running' && c.health === 'starting') return { text: 'iniciando', tone: 'wait' };
  if (c.state === 'running') return { text: c.health ? `no ar · ${c.health}` : 'no ar', tone: 'up' };
  if (c.state === 'restarting') return { text: 'reiniciando', tone: 'wait' };
  return { text: c.state ?? '?', tone: 'down' };
}

/** Versão do WinThor pela imagem do WTA (linux-winthor:40-debian → 40); sem tag de versão, undefined. */
export function infrImageVersion(image?: string): string | undefined {
  return /:(\d{2,3})(?:-|$)/.exec(image ?? '')?.[1];
}

export interface InfrFolderStatus {
  /** Pasta do INFR-Docker em uso (a digitada ou a detectada pelos scripts) */
  folder: string;
  /** Todos os scripts foram achados nela */
  ok: boolean;
  missing: number;
}

/** Pasta do INFR-Docker e se os scripts estão nela, para o cabeçalho do assistente. */
export function infrFolderStatus(customPath: string, scripts: { path: string; exists: boolean }[]): InfrFolderStatus {
  const detected = scripts.map((s) => /^(.*?INFR-Docker)(?=[\\/]|$)/i.exec(s.path)?.[1]).find(Boolean) ?? '';
  const missing = scripts.filter((s) => !s.exists).length;
  return { folder: customPath.trim() || detected, ok: scripts.length > 0 && missing === 0, missing };
}
