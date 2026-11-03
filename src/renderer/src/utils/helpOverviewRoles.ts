export interface HelpOverviewRoleLink {
  label: string;
  /** Aba do app que o link abre (mesmos ids de HELP_OVERVIEW_MODULES). */
  navTarget: string;
}

export interface HelpOverviewRole {
  name: string;
  subtitle: string;
  links: HelpOverviewRoleLink[];
}

/** Atalhos da Visão geral por papel: onde cada pessoa costuma começar. */
export const HELP_OVERVIEW_ROLES: HelpOverviewRole[] = [
  {
    name: 'Desenvolvedor',
    subtitle: 'Karaf, deploy e Git',
    links: [
      { label: 'Subir o Karaf em debug', navTarget: 'env' },
      { label: 'Fazer o deploy de um perfil', navTarget: 'deploy' },
      { label: 'Abrir um Pull Request', navTarget: 'git' }
    ]
  },
  {
    name: 'QA',
    subtitle: 'Homologação e regressão',
    links: [
      { label: 'Rodar a regressão e validar cenários', navTarget: 'quality' },
      { label: 'Acompanhar uma integração ponta a ponta', navTarget: 'integration-trace' },
      { label: 'Testar APIs no API Studio', navTarget: 'http-client' }
    ]
  },
  {
    name: 'PO / SME',
    subtitle: 'Acompanhar e validar',
    links: [
      { label: 'Acompanhar a Qualidade', navTarget: 'quality' },
      { label: 'Rastrear uma integração', navTarget: 'integration-trace' },
      { label: 'Perguntar à documentação com IA', navTarget: 'docs' }
    ]
  }
];

/** Perguntas do FAQ que a Visão geral destaca como "Problemas mais comuns". */
export const HELP_COMMON_PROBLEM_IDS: string[] = [
  'admin-privileges',
  'karaf-deploy-no-deployment-change',
  'karaf-resolution-missing-requirement',
  'port-in-use',
  'karaf-client-bat',
  'karaf-jvm-memory-oom'
];
