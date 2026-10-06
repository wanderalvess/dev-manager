import {
  Terminal,
  Box,
  Layers,
  ScrollText,
  Activity,
  Database,
  Grid,
  GitPullRequest,
  FileSearch,
  CheckCheck,
  ClipboardCheck,
  PlayCircle,
  Zap,
  LucideIcon
} from 'lucide-react';

export interface NavSubItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
  shortcut?: string;
}

export interface NavThemeGroup {
  id: string;
  title: string;
  shortTitle: string;
  compactTitle: string;
  icon: LucideIcon;
  items: NavSubItem[];
}

export const NAV_THEME_GROUPS: NavThemeGroup[] = [
  {
    id: 'infra',
    title: 'Infraestrutura & Ambiente',
    shortTitle: 'Infraestrutura',
    compactTitle: 'Infra',
    icon: Terminal,
    items: [
      {
        id: 'env',
        label: 'Ambiente Dev',
        shortLabel: 'Ambiente',
        icon: Terminal,
        description: 'Serviços locais, servidores & scanner de portas',
        shortcut: 'Alt+1'
      },
      {
        id: 'containers',
        label: 'Containers',
        shortLabel: 'Containers',
        icon: Box,
        description: 'Gerenciador de containers, instâncias & logs',
        shortcut: 'Alt+3'
      },
      {
        id: 'deploy',
        label: 'Deploy & Esteiras',
        shortLabel: 'Deploy',
        icon: Layers,
        description: 'Perfis de deploy, containers & esteiras de automação',
        shortcut: 'Alt+4'
      },
      {
        id: 'logs',
        label: 'Logs em Tempo Real',
        shortLabel: 'Logs',
        icon: ScrollText,
        description: 'Acompanhamento contínuo (tail -f) de logs de aplicações e microsserviços',
        shortcut: 'Alt+8'
      },
      {
        id: 'apm',
        label: 'APM & Traces',
        shortLabel: 'APM',
        icon: Activity,
        description: 'Métricas, traces distribuídos (OTel/SigNoz) e observabilidade de APIs',
        shortcut: 'Alt+0'
      }
    ]
  },
  {
    id: 'data',
    title: 'Banco de Dados & Rotinas',
    shortTitle: 'Dados & Rotinas',
    compactTitle: 'Dados',
    icon: Database,
    items: [
      {
        id: 'database',
        label: 'Banco de Dados',
        shortLabel: 'Banco',
        icon: Database,
        description: 'Conexão e SQL runner Oracle, MySQL, Postgres',
        shortcut: 'Alt+2'
      },
      {
        id: 'routines',
        label: 'Catálogo de Rotinas',
        shortLabel: 'Rotinas',
        icon: Grid,
        description: 'Catálogo de executáveis, rotinas e atalhos',
        shortcut: 'Alt+6'
      }
    ]
  },
  {
    id: 'dev',
    title: 'Desenvolvimento & DevOps',
    shortTitle: 'Desenvolvimento',
    compactTitle: 'Dev',
    icon: GitPullRequest,
    items: [
      {
        id: 'git',
        label: 'Git & DevOps',
        shortLabel: 'Git',
        icon: GitPullRequest,
        description: 'Repositórios Git, branches, commits e PRs',
        shortcut: 'Alt+5'
      },
      {
        id: 'docs',
        label: 'Documentação Semântica',
        shortLabel: 'Docs',
        icon: FileSearch,
        description: 'Busca semântica RAG na documentação dos projetos',
        shortcut: 'Alt+7'
      }
    ]
  },
  {
    id: 'qa',
    title: 'Qualidade & Homologação',
    shortTitle: 'Qualidade',
    compactTitle: 'QA',
    icon: CheckCheck,
    items: [
      {
        id: 'quality',
        label: 'Homologação',
        shortLabel: 'Homologação',
        icon: ClipboardCheck,
        description: 'Matriz de cenários, prontidão da release e relatório de homologação',
        shortcut: 'Alt+Q'
      },
      {
        id: 'quality-regression',
        label: 'Validador Regressivo',
        shortLabel: 'Regressivo',
        icon: Database,
        description: 'Validação de dados Oracle com templates, asserções e payloads de API',
      },
      {
        id: 'quality-runners',
        label: 'Test Runners',
        shortLabel: 'Runners',
        icon: PlayCircle,
        description: 'Suítes automatizadas com sincronização para a Matriz de Homologação',
      },
      {
        id: 'quality-taut',
        label: 'TAUT (Cypress)',
        shortLabel: 'TAUT',
        icon: Zap,
        description: 'Automação E2E com Cypress: execução, cobertura e intake via CSV',
      }
    ]
  }
];
