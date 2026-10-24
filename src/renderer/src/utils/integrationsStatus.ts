import type { AppSettings, GitProjectInfo } from '../../../shared/types';

export type IntegrationStatus = 'active' | 'unconfigured' | 'detected' | 'none';

export type IntegrationTarget =
  | { kind: 'page'; tab: string }
  | { kind: 'settings'; tab: string }
  | { kind: 'help'; search: string };

export type IntegrationGroupId = 'ai' | 'code' | 'quality';

export interface IntegrationItem {
  id: string;
  group: IntegrationGroupId;
  title: string;
  description: string;
  status: IntegrationStatus;
  /** Texto do selo de status; vazio quando não há o que dizer (ex.: MCP, sempre disponível). */
  statusLabel: string;
  actionLabel: string;
  target: IntegrationTarget;
}

export const INTEGRATION_GROUP_TITLES: Record<IntegrationGroupId, { title: string; subtitle: string }> = {
  ai: { title: 'Inteligência artificial', subtitle: 'Assistentes e respostas da IA' },
  code: { title: 'Código e entrega', subtitle: 'Git, pull requests e pipelines' },
  quality: { title: 'Qualidade, observabilidade e avisos', subtitle: 'Testes, traces e notificações' }
};

export type IntegrationFilter = 'all' | 'active' | 'unconfigured';

const count = (list: readonly unknown[] | undefined): number => (Array.isArray(list) ? list.length : 0);

/** Monta os cartões da tela Integrações a partir das configurações salvas e dos repositórios detectados. */
export function buildIntegrations(
  settings: Partial<AppSettings> | null,
  projects: readonly Pick<GitProjectInfo, 'provider'>[] = []
): IntegrationItem[] {
  const s = settings ?? {};
  const activeLlm = (s.llmProviders ?? []).find((p) => p.id === s.activeLlmProviderId) ?? null;
  const llmCount = count(s.llmProviders);
  const hostedRepos = projects.filter((p) => p.provider === 'github' || p.provider === 'gitlab').length;
  const otlpPort = s.apmReceiverPort ?? 4318;
  const webhooks = count(s.backupWebhooks);
  const qualitySources = count(s.qualitySources);

  return [
    {
      id: 'mcp',
      group: 'ai',
      title: 'Assistentes de IA (MCP)',
      description:
        'Deixa Claude Code, Copilot (VS Code e IntelliJ), Cursor e Antigravity usarem as automações do app pelo chat.',
      status: 'none',
      statusLabel: '',
      actionLabel: 'Ver como conectar',
      target: { kind: 'help', search: 'MCP' }
    },
    {
      id: 'llm',
      group: 'ai',
      title: 'Provedores de LLM',
      description: 'Use sua própria chave: OpenAI, Gemini, Anthropic, Groq, DeepSeek, OpenRouter ou Ollama local.',
      status: activeLlm ? 'active' : 'unconfigured',
      statusLabel: activeLlm ? `Ativo: ${activeLlm.name}` : llmCount > 0 ? 'Nenhum ativo' : 'Não configurado',
      actionLabel: 'Configurar',
      target: { kind: 'settings', tab: 'ai' }
    },
    {
      id: 'confluence',
      group: 'ai',
      title: 'Confluence',
      description: 'Páginas do Confluence entram no índice da busca de documentação.',
      status: count(s.confluenceSources) > 0 ? 'active' : 'unconfigured',
      statusLabel: count(s.confluenceSources) > 0 ? `${count(s.confluenceSources)} fonte(s)` : 'Não configurado',
      actionLabel: 'Configurar',
      target: { kind: 'page', tab: 'docs' }
    },
    {
      id: 'jira',
      group: 'ai',
      title: 'Jira',
      description: 'Issues do Jira na busca de documentação e como fonte de cenários de teste.',
      status: count(s.jiraSources) > 0 ? 'active' : 'unconfigured',
      statusLabel: count(s.jiraSources) > 0 ? `${count(s.jiraSources)} fonte(s)` : 'Não configurado',
      actionLabel: 'Configurar',
      target: { kind: 'page', tab: 'docs' }
    },
    {
      id: 'azure',
      group: 'code',
      title: 'Azure DevOps',
      description: 'Repositórios, tarefas, pull requests e pipelines.',
      status: s.azureDevOpsToken ? 'active' : 'unconfigured',
      statusLabel: s.azureDevOpsToken ? 'Conectado' : 'Não configurado',
      actionLabel: 'Configurar',
      target: { kind: 'settings', tab: 'azure' }
    },
    {
      id: 'git-hosts',
      group: 'code',
      title: 'GitLab e GitHub',
      description: 'Links de merge request e pull request a partir do remoto de cada repositório.',
      status: hostedRepos > 0 ? 'detected' : 'none',
      statusLabel: hostedRepos > 0 ? `Detectado em ${hostedRepos} repositório(s)` : 'Nenhum repositório',
      actionLabel: 'Ver repositórios',
      target: { kind: 'page', tab: 'git' }
    },
    {
      id: 'ccw',
      group: 'code',
      title: 'WinThor CCW',
      description: 'Baixa e atualiza rotinas pela Central de Controle WinThor, com backup .bak.',
      status: s.ccwAuthCookie ? 'active' : 'unconfigured',
      statusLabel: s.ccwAuthCookie ? 'Conectado' : 'Não configurado',
      actionLabel: 'Configurar',
      target: { kind: 'settings', tab: 'routines' }
    },
    {
      id: 'quality-sources',
      group: 'quality',
      title: 'Fontes de teste',
      description: 'Zephyr Scale, Zephyr Squad, Jira, Azure Test Plans ou webhook próprio.',
      status: qualitySources > 0 ? 'active' : 'unconfigured',
      statusLabel: qualitySources > 0 ? `${qualitySources} fonte(s)` : 'Não configurado',
      actionLabel: 'Configurar',
      target: { kind: 'settings', tab: 'quality' }
    },
    {
      id: 'otlp',
      group: 'quality',
      title: 'OpenTelemetry',
      description: `Recebe traces OTLP na porta ${otlpPort} para o APM. Funciona ao lado de SigNoz ou Jaeger.`,
      status: 'active',
      statusLabel: `Porta ${otlpPort}`,
      actionLabel: 'Trocar porta',
      target: { kind: 'settings', tab: 'ports' }
    },
    {
      id: 'webhooks',
      group: 'quality',
      title: 'Webhooks',
      description: 'Avisos de backup no Slack, Teams, Discord ou num endpoint genérico.',
      status: webhooks > 0 ? 'active' : 'unconfigured',
      statusLabel: webhooks > 0 ? `${webhooks} configurado(s)` : 'Nenhum',
      actionLabel: webhooks > 0 ? 'Gerenciar' : 'Adicionar',
      target: { kind: 'page', tab: 'db-backups' }
    }
  ];
}

export function filterIntegrations(items: readonly IntegrationItem[], filter: IntegrationFilter): IntegrationItem[] {
  if (filter === 'all') return [...items];
  if (filter === 'active') return items.filter((i) => i.status === 'active' || i.status === 'detected');
  return items.filter((i) => i.status === 'unconfigured');
}
