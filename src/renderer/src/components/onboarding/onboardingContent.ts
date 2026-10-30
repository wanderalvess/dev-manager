import type { AppSettings } from '../../../../shared/types';
import type { ThemeVariant } from '../../context/ThemeContext';

// Conteúdo da abertura e do onboarding em etapas (OnboardingWizard). Tudo aqui é dado puro para
// poder ser testado sem montar os componentes.

// Itens que a abertura marca como prontos, um por vez: as áreas do menu e, por fim, o servidor MCP.
export const SPLASH_BOOT_ITEMS = [
  'Infraestrutura & Ambiente',
  'Observabilidade & Diagnóstico',
  'Banco de Dados & Backups',
  'Desenvolvimento & DevOps',
  'Qualidade & Homologação',
  'Servidor MCP'
];

export type BootItemState = 'done' | 'loading' | 'queued';

/** Estado do item `index` quando `completed` itens já terminaram (o seguinte está carregando). */
export function bootItemState(index: number, completed: number): BootItemState {
  if (index < completed) return 'done';
  return index === completed ? 'loading' : 'queued';
}

export const ONBOARDING_STEPS = [
  { id: 'welcome', label: 'Boas-vindas', hint: 'Prazer, Hub Manager' },
  { id: 'modules', label: 'Módulos', hint: 'Ligue o que você usa' },
  { id: 'theme', label: 'Tema', hint: 'Escolha o visual' },
  { id: 'env', label: 'Ambiente', hint: 'Caminhos e checklist' },
  { id: 'mcp', label: 'IA & MCP', hint: 'Agentes no comando' },
  { id: 'done', label: 'Pronto', hint: 'Atalhos e tour' }
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

// Cores de amostra de cada tema (o `--primary`/`--background`/`--card` do modo escuro em index.css).
export const ONBOARDING_THEMES: { id: ThemeVariant; label: string; accent: string; bg: string; card: string }[] = [
  { id: 'paper', label: 'Papel', accent: '#5B93FF', bg: '#0E1116', card: '#161B22' },
  { id: 'default', label: 'Cockpit Âmbar', accent: '#FF6A00', bg: '#020817', card: '#0F172A' },
  { id: 'midnight', label: 'Midnight Tech', accent: '#3B82F6', bg: '#050505', card: '#0E0E0E' },
  { id: 'cyberpunk', label: 'Cyberpunk', accent: '#18DC9B', bg: '#030A08', card: '#091511' },
  { id: 'nebula', label: 'Nebula', accent: '#B163F5', bg: '#08040B', card: '#120B19' },
  { id: 'nordic', label: 'Nordic Frost', accent: '#2BB3F0', bg: '#04080B', card: '#0B1219' }
];

// Pedidos de exemplo para a etapa de MCP: nomes reais das ferramentas expostas em src/mcp.
export const MCP_EXAMPLES: { ask: string; tools: string[]; result: string }[] = [
  {
    ask: 'Sobe o Karaf em debug pra mim',
    tools: ['env_batch_stop_services', 'env_launch_server_debug'],
    result: 'Serviços parados e Karaf no ar com a porta de debug aberta.'
  },
  {
    ask: 'Builda e faz deploy do bundle',
    tools: ['karaf_build_and_deploy', 'karaf_verify_bundle'],
    result: 'Maven ok, bundle instalado e ativo no Karaf.'
  },
  {
    ask: 'Por que esse bundle não sobe?',
    tools: ['karaf_check_bundle_dependencies', 'karaf_detect_wiring_conflicts'],
    result: 'Aponta o pacote que falta e o conflito de wiring.'
  },
  {
    ask: 'Faz backup do banco de homologação',
    tools: ['db_list_connections', 'db_run_backup'],
    result: 'Dump gerado e registrado no histórico de backups.'
  },
  {
    ask: 'Cria a branch da minha task',
    tools: ['git_list_tasks', 'git_create_task_branch'],
    result: 'Branch criada a partir da task do Azure DevOps.'
  },
  {
    ask: 'Roda a suíte de regressão',
    tools: ['qa_list_templates', 'qa_run_regression_suite'],
    result: 'Asserções executadas e resultado na Matriz de Homologação.'
  },
  {
    ask: 'Procura na documentação como configurar isso',
    tools: ['rag_search_docs'],
    result: 'Trechos do Confluence e do Jira com os links de origem.'
  }
];

export interface EnvRow {
  /** Campo de AppSettings que a detecção automática pode preencher (para marcar "detectado agora"). */
  key?: string;
  label: string;
  hint: string;
  value: string;
  done: boolean;
}

export interface EnvSection {
  id: string;
  title: string;
  rows: EnvRow[];
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const row = (label: string, hint: string, value: string, key?: string): EnvRow => ({ key, label, hint, value, done: value !== '' });

/** Resumo do que está configurado, nas mesmas seções de Configurações. Valor vazio = ainda não configurado. */
export function buildEnvSections(settings: Partial<AppSettings> | null): EnvSection[] {
  const s = settings ?? {};
  const count = (list: unknown[] | undefined, noun: string): string =>
    list && list.length > 0 ? `${list.length} ${noun}` : '';
  return [
    {
      id: 'dirs',
      title: 'Diretórios & IDE',
      rows: [
        row('Diretório de Repositórios Git', 'obrigatório', text(s.projectsPath), 'projectsPath'),
        row('IDE / Editor de Código', 'obrigatório', text(s.intellijPath), 'intellijPath'),
        row('JDK', 'opcional', text(s.jdkPath), 'jdkPath')
      ]
    },
    {
      id: 'karaf',
      title: 'Karaf',
      rows: [
        row('Pasta do Karaf', 'servidor OSGi', text(s.karafPath), 'karafPath'),
        row('Script de inicialização', 'karaf / karaf.bat', text(s.karafScript), 'karafScript'),
        row('Credenciais', 'usuário e senha do console', text(s.karafUser) && (text(s.karafPass) || s.hasKarafPass) ? text(s.karafUser) : ''),
        row(
          'Portas SSH e Debug',
          'console e depuração remota',
          s.karafSshPort || s.karafDebugPort ? [s.karafSshPort, s.karafDebugPort].filter(Boolean).map((p) => `:${p}`).join(' · ') : ''
        )
      ]
    },
    {
      id: 'winthor',
      title: 'Rotinas WinThor',
      rows: [
        row('Pasta das rotinas', 'binários do catálogo', text(s.appPath), 'appPath'),
        row('Central de Controle WinThor', 'URL do CCW', text(s.ccwBaseUrl)),
        row('Versão do WinThor', 'usada no catálogo de rotinas', text(s.ccwWinthorVersion)),
        row('WTA', 'URL e login', text(s.wtaUrl) && text(s.wtaLogin) ? `${text(s.wtaLogin)} @ ${text(s.wtaUrl)}` : '')
      ]
    },
    {
      id: 'azure',
      title: 'Azure & Git',
      rows: [
        row('Azure DevOps', 'Personal Access Token', text(s.azureDevOpsToken) || s.hasAzureDevOpsToken ? 'configurado' : ''),
        row('Banco de Dados', 'conexões salvas', count(s.databaseConnections, 'conexão(ões)'))
      ]
    },
    {
      id: 'quality',
      title: 'Qualidade & QA',
      rows: [row('Projeto TAUT (Cypress)', 'testes automatizados', text(s.tautProjectPath))]
    },
    {
      id: 'services',
      title: 'Serviços & Portas',
      rows: [
        row('Serviços monitorados', 'parados pela esteira', count(s.trackedServices, 'serviço(s)')),
        row('Processos monitorados', 'encerrados pela esteira', count(s.trackedProcesses, 'processo(s)')),
        row('Portas monitoradas', 'scanner de portas', count(s.monitoredPorts, 'porta(s)'))
      ]
    }
  ];
}

/** Liga/desliga um módulo na lista de desligados, sem deixar o app com todos desligados. */
export function toggleDisabledModule(disabled: string[], id: string, totalModules: number): string[] {
  if (disabled.includes(id)) return disabled.filter((m) => m !== id);
  if (totalModules - disabled.length <= 1) return disabled;
  return [...disabled, id];
}

/** "3/4": quantas linhas da seção já estão configuradas. */
export function sectionProgress(section: EnvSection): string {
  return `${section.rows.filter((r) => r.done).length}/${section.rows.length}`;
}

/** Quantos dos módulos `ids` estão ligados. */
export function countEnabled(ids: string[], disabled: string[]): number {
  return ids.filter((id) => !disabled.includes(id)).length;
}

/** Liga ou desliga um grupo inteiro de módulos, sem deixar o app com todos desligados. */
export function setModulesEnabled(disabled: string[], ids: string[], on: boolean, totalModules: number): string[] {
  if (on) return disabled.filter((id) => !ids.includes(id));
  const next = [...new Set([...disabled, ...ids])];
  return totalModules - next.length < 1 ? disabled : next;
}

/** Resumo do checklist para a etapa final: quantos itens prontos e quais faltam. */
export function summarizeChecklist(items: { label: string; done: boolean }[]): { done: number; total: number; missing: string[] } {
  return {
    done: items.filter((i) => i.done).length,
    total: items.length,
    missing: items.filter((i) => !i.done).map((i) => i.label)
  };
}
