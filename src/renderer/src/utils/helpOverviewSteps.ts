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
    cardClass: 'border-cyan-500/20 hover:border-cyan-500/60',
    numberClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/25',
    badgeClass: 'bg-cyan-500/10 text-cyan-400',
    titleHoverClass: 'group-hover:text-cyan-400',
    linkClass: 'text-cyan-400'
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
    cardClass: 'border-amber-500/20 hover:border-amber-500/60',
    numberClass: 'bg-amber-500/10 text-amber-500 border border-amber-500/25',
    badgeClass: 'bg-amber-500/10 text-amber-500',
    titleHoverClass: 'group-hover:text-amber-500',
    linkClass: 'text-amber-500'
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
    cardClass: 'border-blue-500/20 hover:border-blue-500/60',
    numberClass: 'bg-blue-500/10 text-blue-500 border border-blue-500/25',
    badgeClass: 'bg-blue-500/10 text-blue-500',
    titleHoverClass: 'group-hover:text-blue-500',
    linkClass: 'text-blue-500'
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
    cardClass: 'border-indigo-500/20 hover:border-indigo-500/60',
    numberClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/25',
    badgeClass: 'bg-indigo-500/10 text-indigo-400',
    titleHoverClass: 'group-hover:text-indigo-400',
    linkClass: 'text-indigo-400'
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
    cardClass: 'border-violet-500/20 hover:border-violet-500/60',
    numberClass: 'bg-violet-500/10 text-violet-400 border border-violet-500/25',
    badgeClass: 'bg-violet-500/10 text-violet-400',
    titleHoverClass: 'group-hover:text-violet-400',
    linkClass: 'text-violet-400'
  }
];
