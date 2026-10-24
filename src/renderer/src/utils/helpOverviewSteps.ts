export interface HelpOverviewStep {
  number: number;
  navTarget: string;
  badge: string;
  title: string;
  description: string;
  // Trecho opcional em <code> entre description e descriptionSuffix.
  inlineCode?: string;
  descriptionSuffix?: string;
  // Alguns chips dependem da porta de debug configurada.
  chips: (debugPort: number) => string[];
  linkLabel: string;
  // Classes Tailwind completas (literais) para o scanner do Tailwind enxergá-las.
  cardClass: string;
  numberClass: string;
  badgeClass: string;
  titleHoverClass: string;
  linkClass: string;
}

export const HELP_OVERVIEW_STEPS: HelpOverviewStep[] = [
  {
    number: 1,
    navTarget: 'env',
    badge: 'Ambiente',
    title: 'Preparar Ambiente',
    description:
      'Encerra processos travados, libera portas TCP, inicia a IDE configurada e sobe os serviços em modo Debug.',
    chips: (debugPort) => [`:${debugPort} JDWP`, 'Portas'],
    linkLabel: 'Ir para Ambiente',
    cardClass: 'border-info/20 hover:border-info/60',
    numberClass: 'bg-info/10 text-info border border-info/25',
    badgeClass: 'bg-info/10 text-info',
    titleHoverClass: 'group-hover:text-info',
    linkClass: 'text-info'
  },
  {
    number: 2,
    navTarget: 'deploy',
    badge: 'Deploy',
    title: 'Compilar & Deploy',
    description: 'Pipelines sequenciais de build Maven, deploy de bundles OSGi no Karaf (',
    inlineCode: 'client.bat',
    descriptionSuffix: ') e Docker com streaming de saída.',
    chips: () => ['OSGi', 'Docker', 'Maven'],
    linkLabel: 'Ir para Deploy',
    cardClass: 'border-warning/20 hover:border-warning/60',
    numberClass: 'bg-warning/10 text-warning border border-warning/25',
    badgeClass: 'bg-warning/10 text-warning',
    titleHoverClass: 'group-hover:text-warning',
    linkClass: 'text-warning'
  },
  {
    number: 3,
    navTarget: 'git',
    badge: 'Git Hub',
    title: 'Git & Pull Request',
    description:
      'Sincroniza branches locais com a develop e abre a tela de criação de Pull Request no Azure DevOps sem preenchimento manual.',
    chips: () => ['Azure DevOps', 'Branches'],
    linkLabel: 'Ir para Git & Azure',
    cardClass: 'border-info/20 hover:border-info/60',
    numberClass: 'bg-info/10 text-info border border-info/25',
    badgeClass: 'bg-info/10 text-info',
    titleHoverClass: 'group-hover:text-info',
    linkClass: 'text-info'
  },
  {
    number: 4,
    navTarget: 'routines',
    badge: 'Rotinas',
    title: 'Catálogo de Rotinas',
    description:
      'Localização instantânea de executáveis Delphi (.exe e .pc), download direto e atualização pela Central de Controle WinThor (CCW) com backup .bak automático.',
    chips: () => ['Delphi .exe', 'CCW Download', 'Backup .bak'],
    linkLabel: 'Ir para Rotinas',
    cardClass: 'border-primary/20 hover:border-primary/60',
    numberClass: 'bg-primary/10 text-primary border border-primary/25',
    badgeClass: 'bg-primary/10 text-primary',
    titleHoverClass: 'group-hover:text-primary',
    linkClass: 'text-primary'
  },
  {
    number: 5,
    navTarget: 'database',
    badge: 'Dados & Docs',
    title: 'Banco & Docs RAG',
    description:
      'Studio SQL multi-vendor (Oracle/Postgres) com rotinas de backup, e busca semântica em contratos de API e manuais com IA.',
    chips: () => ['Oracle / PG', 'FastEmbed IA'],
    linkLabel: 'Ir para Banco',
    cardClass: 'border-primary/20 hover:border-primary/60',
    numberClass: 'bg-primary/10 text-primary border border-primary/25',
    badgeClass: 'bg-primary/10 text-primary',
    titleHoverClass: 'group-hover:text-primary',
    linkClass: 'text-primary'
  }
];
