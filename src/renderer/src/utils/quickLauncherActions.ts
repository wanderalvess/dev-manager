import type React from 'react';
import {
  Grid,
  GitPullRequest,
  Terminal,
  Layers,
  Settings,
  HelpCircle,
  RefreshCw,
  Box,
  ScrollText,
  Database,
  FileSearch,
  Activity,
  CheckCheck
} from 'lucide-react';

export interface QuickLauncherItem {
  id: string;
  category: 'action' | 'routine' | 'repo';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ElementType;
  onSelect: () => void;
  isFavorite?: boolean;
  /** Score de relevância fuzzy (maior = melhor). Ausente/0 quando a busca está vazia. */
  score?: number;
  /** Índices do título que casaram com a busca, para highlight. */
  titleMatchIndices?: number[];
}

export interface QuickLauncherActionHandlers {
  onNavigate: (tab: string) => void;
  onRefreshAll: () => void;
  onClose: () => void;
}

interface NavigationActionSpec {
  id: string;
  tab: string;
  title: string;
  subtitle: string;
  /** Deve bater com App.tsx, Header e a tabela de atalhos da Ajuda. */
  badge?: string;
  icon: React.ElementType;
}

const NAVIGATION_ACTIONS: NavigationActionSpec[] = [
  {
    id: 'act-env',
    tab: 'env',
    title: 'Ambiente Dev (Cockpit)',
    subtitle: 'Parar serviços, matar processos e abrir IDE + Servidor Debug',
    badge: 'Alt+1',
    icon: Terminal
  },
  {
    id: 'act-database',
    tab: 'database',
    title: 'Banco de Dados',
    subtitle: 'Conexão e SQL runner Oracle, MySQL e Postgres',
    badge: 'Alt+2',
    icon: Database
  },
  {
    id: 'act-containers',
    tab: 'containers',
    title: 'Containers',
    subtitle: 'Gerenciamento de containers (Docker / Podman), métricas e logs',
    badge: 'Alt+3',
    icon: Box
  },
  {
    id: 'act-deploy',
    tab: 'deploy',
    title: 'Deploy',
    subtitle: 'Perfis de deploy sequenciais — Karaf, Containers ou comando genérico',
    badge: 'Alt+4',
    icon: Layers
  },
  {
    id: 'act-git',
    tab: 'git',
    title: 'Git & Azure DevOps Hub',
    subtitle: 'Sincronizar repositórios e gerar Pull Requests',
    badge: 'Alt+5',
    icon: GitPullRequest
  },
  {
    id: 'act-routines',
    tab: 'routines',
    title: 'Catálogo de Rotinas',
    subtitle: 'Executar executáveis (.EXE e .PC)',
    badge: 'Alt+6',
    icon: Grid
  },
  {
    id: 'act-docs',
    tab: 'docs',
    title: 'Documentação Semântica',
    subtitle: 'Busca semântica RAG na documentação dos projetos',
    badge: 'Alt+7',
    icon: FileSearch
  },
  {
    id: 'act-logs',
    tab: 'logs',
    title: 'Logs em Tempo Real (Tail -f)',
    subtitle: 'Monitorar em tempo real os arquivos de log configurados',
    badge: 'Alt+8',
    icon: ScrollText
  },
  {
    id: 'act-apm',
    tab: 'apm',
    title: 'APM & Traces (OpenTelemetry)',
    subtitle: 'Métricas, traces distribuídos e observabilidade de APIs',
    badge: 'Alt+0',
    icon: Activity
  },
  {
    id: 'act-quality',
    tab: 'quality',
    title: 'Central de Qualidade (QA Studio)',
    subtitle: 'Validador regressivo Oracle, asserções de banco e matriz de homologação',
    badge: 'Alt+Q',
    icon: CheckCheck
  },
  {
    id: 'act-help',
    tab: 'help',
    title: 'Ajuda & Diagnósticos',
    subtitle: 'FAQ, diagnósticos de rede e atalhos de teclado',
    badge: 'Alt+9',
    icon: HelpCircle
  },
  {
    id: 'act-settings',
    tab: 'settings',
    title: 'Configurações do Sistema',
    subtitle: 'Gerenciar caminhos, portas e serviços monitorados',
    icon: Settings
  }
];

/** Ações globais do sistema: navegação por aba + recarregar status (mantém a ordem original). */
export function buildQuickLauncherActions({
  onNavigate,
  onRefreshAll,
  onClose
}: QuickLauncherActionHandlers): QuickLauncherItem[] {
  const navigation: QuickLauncherItem[] = NAVIGATION_ACTIONS.map((spec) => ({
    id: spec.id,
    category: 'action',
    title: spec.title,
    subtitle: spec.subtitle,
    badge: spec.badge,
    icon: spec.icon,
    onSelect: () => {
      onNavigate(spec.tab);
      onClose();
    }
  }));

  return [
    ...navigation,
    {
      id: 'act-refresh',
      category: 'action',
      title: 'Recarregar Status Geral',
      subtitle: 'Atualizar portas, serviços e repositórios em tempo real',
      icon: RefreshCw,
      onSelect: () => {
        onRefreshAll();
        onClose();
      }
    }
  ];
}
