import {
  Terminal,
  Boxes,
  Database,
  Layers,
  GitPullRequest,
  Grid,
  FileSearch,
  FileText,
  Activity,
  CheckCheck,
  Settings,
  HelpCircle,
  type LucideIcon
} from 'lucide-react';

export interface HelpOverviewModule {
  navTarget: string;
  icon: LucideIcon;
  title: string;
  description: string;
  shortcut?: string;
  // Classes Tailwind completas (literais) para o scanner do Tailwind enxergá-las.
  hoverBorderClass: string;
  iconClass: string;
  titleHoverClass: string;
}

export const HELP_OVERVIEW_MODULES: HelpOverviewModule[] = [
  {
    navTarget: 'env',
    icon: Terminal,
    title: 'Ambiente Dev',
    description: 'Serviços Windows, liberação de portas e servidor OSGi Debug.',
    shortcut: 'Alt+1',
    hoverBorderClass: 'hover:border-primary/50',
    iconClass: 'text-cyan-400',
    titleHoverClass: 'group-hover:text-primary'
  },
  {
    navTarget: 'database',
    icon: Database,
    title: 'Banco de Dados',
    description: 'Database Studio Oracle, PostgreSQL, MySQL e Backups agendados.',
    shortcut: 'Alt+2',
    hoverBorderClass: 'hover:border-emerald-500/50',
    iconClass: 'text-emerald-500',
    titleHoverClass: 'group-hover:text-emerald-500'
  },
  {
    navTarget: 'containers',
    icon: Boxes,
    title: 'Containers Docker',
    description: 'Gestão de ciclo de vida de containers, streaming de logs e status.',
    shortcut: 'Alt+3',
    hoverBorderClass: 'hover:border-blue-400/50',
    iconClass: 'text-blue-400',
    titleHoverClass: 'group-hover:text-blue-400'
  },
  {
    navTarget: 'deploy',
    icon: Layers,
    title: 'Deploy & OSGi',
    description: 'Pipelines Karaf, Maven builds, Docker compose e scripts custom.',
    shortcut: 'Alt+4',
    hoverBorderClass: 'hover:border-amber-500/50',
    iconClass: 'text-amber-500',
    titleHoverClass: 'group-hover:text-amber-500'
  },
  {
    navTarget: 'git',
    icon: GitPullRequest,
    title: 'Git & Azure DevOps',
    description: 'Status de branches, diffs, commits e criação ágil de Pull Requests.',
    shortcut: 'Alt+5',
    hoverBorderClass: 'hover:border-blue-500/50',
    iconClass: 'text-blue-500',
    titleHoverClass: 'group-hover:text-blue-500'
  },
  {
    navTarget: 'routines',
    icon: Grid,
    title: 'Catálogo de Rotinas',
    description: 'Executáveis WinThor (.exe/.pc), download CCW e rollback .bak.',
    shortcut: 'Alt+6',
    hoverBorderClass: 'hover:border-indigo-500/50',
    iconClass: 'text-indigo-400',
    titleHoverClass: 'group-hover:text-indigo-400'
  },
  {
    navTarget: 'docs',
    icon: FileSearch,
    title: 'Documentação (RAG)',
    description: 'Busca semântica em manuais e contratos de API com IA local.',
    shortcut: 'Alt+7',
    hoverBorderClass: 'hover:border-purple-500/50',
    iconClass: 'text-purple-400',
    titleHoverClass: 'group-hover:text-purple-400'
  },
  {
    navTarget: 'logs',
    icon: FileText,
    title: 'Logs em Tempo Real',
    description: 'Acompanhamento contínuo (tail -f) de logs de aplicações.',
    shortcut: 'Alt+8',
    hoverBorderClass: 'hover:border-sky-500/50',
    iconClass: 'text-sky-500',
    titleHoverClass: 'group-hover:text-sky-500'
  },
  {
    navTarget: 'apm',
    icon: Activity,
    title: 'APM & Traces',
    description: 'Receptor OpenTelemetry, latências, erros e waterfall de traces.',
    shortcut: 'Alt+0',
    hoverBorderClass: 'hover:border-rose-500/50',
    iconClass: 'text-rose-500',
    titleHoverClass: 'group-hover:text-rose-500'
  },
  {
    navTarget: 'quality',
    icon: CheckCheck,
    title: 'Qualidade (QA & PO)',
    description: 'Homologação, validador regressivo, test runners e TAUT (Cypress) em páginas próprias.',
    shortcut: 'Alt+Q',
    hoverBorderClass: 'hover:border-emerald-500/50',
    iconClass: 'text-emerald-400',
    titleHoverClass: 'group-hover:text-emerald-400'
  },
  {
    navTarget: 'settings',
    icon: Settings,
    title: 'Configurações',
    description: 'Pastas do workspace, portas monitoradas, Karaf e IDEs.',
    hoverBorderClass: 'hover:border-primary/50',
    iconClass: 'text-primary',
    titleHoverClass: 'group-hover:text-primary'
  },
  {
    navTarget: 'help',
    icon: HelpCircle,
    title: 'Central de Ajuda',
    description: 'Tutoriais, documentação dos módulos, FAQ e atalhos globais.',
    shortcut: 'Alt+9',
    hoverBorderClass: 'hover:border-primary/50',
    iconClass: 'text-primary',
    titleHoverClass: 'group-hover:text-primary'
  }
];
