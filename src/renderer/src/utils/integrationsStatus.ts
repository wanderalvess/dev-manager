import { MCP_TOOL_COUNT } from '../../../shared/mcpCatalog';
import type { ApmReceiverStatus, AppSettings, GitProjectInfo } from '../../../shared/types';

/** `error`: configurada, mas a checagem ao vivo falhou (ex.: porta do OTLP ocupada). */
export type IntegrationStatus = 'active' | 'unconfigured' | 'detected' | 'error' | 'none';

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
  /** Texto do selo de status; vazio quando não há o que dizer. */
  statusLabel: string;
  actionLabel: string;
  target: IntegrationTarget;
  /** Detalhe do problema quando `status` é `error`. */
  detail?: string;
}

export const INTEGRATION_GROUP_TITLES: Record<IntegrationGroupId, { title: string; subtitle: string }> = {
  ai: { title: 'Inteligência artificial', subtitle: 'Assistentes e respostas da IA' },
  code: { title: 'Código e entrega', subtitle: 'Git, pull requests e pipelines' },
  quality: { title: 'Qualidade, observabilidade e avisos', subtitle: 'Testes, traces e notificações' }
};

export type IntegrationFilter = 'all' | 'active' | 'attention' | 'unconfigured';

/** Estado ao vivo que não vem das configurações salvas. `undefined` = ainda não consultado. */
export interface IntegrationLiveState {
  apmReceiver?: Pick<ApmReceiverStatus, 'listening' | 'port' | 'error'> | null;
}

const count = (list: readonly unknown[] | undefined): number => (Array.isArray(list) ? list.length : 0);

/** Monta os cartões da tela Integrações a partir das configurações salvas e dos repositórios detectados. */
export function buildIntegrations(
  settings: Partial<AppSettings> | null,
  projects: readonly Pick<GitProjectInfo, 'provider'>[] = [],
  live: IntegrationLiveState = {}
): IntegrationItem[] {
  const s = settings ?? {};
  const activeLlm = (s.llmProviders ?? []).find((p) => p.id === s.activeLlmProviderId) ?? null;
  const llmCount = count(s.llmProviders);
  const hostedRepos = projects.filter((p) => p.provider === 'github' || p.provider === 'gitlab').length;
  const apm = live.apmReceiver;
  const otlpPort = apm?.port ?? s.apmReceiverPort ?? 4318;
  // settings:get devolve os tokens vazios (sanitizados); o has* diz se existe um salvo.
  const hasAzureToken = Boolean(s.azureDevOpsToken || s.hasAzureDevOpsToken);
  const hasCcwCookie = Boolean(s.ccwAuthCookie || s.hasCcwAuthCookie);
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
      statusLabel: `${MCP_TOOL_COUNT} tools`,
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
      status: hasAzureToken ? 'active' : 'unconfigured',
      statusLabel: hasAzureToken ? 'Token salvo' : 'Não configurado',
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
      status: hasCcwCookie ? 'active' : 'unconfigured',
      statusLabel: hasCcwCookie ? 'Cookie salvo' : 'Não configurado',
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
      ...otlpStatus(apm, otlpPort),
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

/** Receptor OTLP: só diz "recebendo" quando o app confirmou que a porta está escutando. */
function otlpStatus(
  apm: IntegrationLiveState['apmReceiver'],
  port: number
): Pick<IntegrationItem, 'status' | 'statusLabel' | 'detail'> {
  if (apm === undefined) return { status: 'none', statusLabel: `Porta ${port}` };
  if (apm === null) return { status: 'none', statusLabel: `Porta ${port} · estado desconhecido` };
  if (apm.listening) return { status: 'active', statusLabel: `Recebendo na porta ${port}` };
  return {
    status: 'error',
    statusLabel: `Parado na porta ${port}`,
    detail: apm.error || 'O receptor não está escutando. A porta pode estar ocupada por outro programa.'
  };
}

const FILTER_MATCH: Record<IntegrationFilter, (status: IntegrationStatus) => boolean> = {
  all: () => true,
  active: (status) => status === 'active' || status === 'detected',
  attention: (status) => status === 'error',
  unconfigured: (status) => status === 'unconfigured'
};

export function filterIntegrations(items: readonly IntegrationItem[], filter: IntegrationFilter): IntegrationItem[] {
  return items.filter((i) => FILTER_MATCH[filter](i.status));
}

/** Quantos cartões cada filtro mostra, para o número ao lado do chip. */
export function countIntegrationsByFilter(items: readonly IntegrationItem[]): Record<IntegrationFilter, number> {
  return {
    all: items.length,
    active: filterIntegrations(items, 'active').length,
    attention: filterIntegrations(items, 'attention').length,
    unconfigured: filterIntegrations(items, 'unconfigured').length
  };
}
