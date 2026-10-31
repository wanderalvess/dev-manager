export type InfrBootstrapTab = 'firstSteps' | 'oracle' | 'wta' | 'wsh' | 'newVersion' | 'verify' | 'scripts';

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

export interface InfrNavItem {
  tab: InfrBootstrapTab;
  label: string;
  /** O que a etapa faz, numa linha (aparece embaixo do nome na navegação lateral) */
  hint: string;
  /** Número da etapa no "montar do zero"; sem número é uma ação à parte */
  step?: number;
}

/** Navegação do assistente, em grupos: montar do zero, a partir de um ambiente e diagnóstico. */
export const INFR_ASSISTANT_NAV: { group: string; items: InfrNavItem[] }[] = [
  {
    group: 'Montar do zero',
    items: [
      { tab: 'firstSteps', label: 'Primeiros passos', hint: 'WSL, distro, projeto, arquivos e o primeiro ambiente' },
      { tab: 'oracle', step: 1, label: 'Banco Oracle', hint: 'Sobe o Oracle (o dump entra em Primeiros passos)' },
      { tab: 'wta', step: 2, label: 'WTA', hint: 'Sobe o WinThor Anywhere ligado ao banco' },
      { tab: 'wsh', step: 3, label: 'WSH', hint: 'Sobe o Smart Hub apontando para o WTA' }
    ]
  },
  {
    group: 'A partir de um ambiente',
    items: [
      { tab: 'newVersion', label: 'Nova versão', hint: 'Copia um ambiente que funciona para outra versão' },
      { tab: 'verify', label: 'Verificar ambiente', hint: 'Mostra se banco, WTA e WSH subiram, com os logs' }
    ]
  },
  {
    group: 'Diagnóstico',
    items: [{ tab: 'scripts', label: 'Scripts e pasta', hint: 'Confere se o INFR-Docker está completo' }]
  }
];

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
