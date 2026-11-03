import {
  DEFAULT_LLM_PROVIDER_TEMPLATES,
  LlmProviderConfig,
  LlmProviderType
} from '../../../shared/types';

/** Motor exibido como ativo: o escolhido explicitamente ou, na falta, o primeiro habilitado. */
export function findActiveLlmProvider(
  providers: LlmProviderConfig[] | undefined,
  activeId: string | undefined
): LlmProviderConfig | undefined {
  return (providers || []).find((p) => (activeId ? p.id === activeId : p.enabled));
}

/** Nunca exibe a chave inteira: só os 4 últimos caracteres. */
export function maskApiKey(provider: Pick<LlmProviderConfig, 'apiKey' | 'provider'>): string {
  if (provider.apiKey) return `••••••••${provider.apiKey.slice(-4)}`;
  return provider.provider === 'ollama' ? 'Sem chave (Local)' : 'Não informada';
}

export function formatEndpoint(baseUrl: string | undefined): string {
  return baseUrl ? baseUrl.replace('https://', '') : 'Oficial Cloud';
}

export function describeTemperature(temperature: number | undefined): string {
  const t = temperature ?? 0.7;
  if (t <= 0.3) return 'Precisa';
  if (t <= 0.6) return 'Técnica/Código';
  if (t >= 0.8) return 'Criativa';
  return 'Balanceada';
}

export function formatTimeoutSeconds(timeoutMs: number | undefined): string {
  return ((timeoutMs ?? 30000) / 1000).toFixed(0);
}

export function createNewLlmProviderDraft(now: number): Partial<LlmProviderConfig> {
  return {
    id: `llm-${now}`,
    name: 'Novo Motor',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 2048,
    timeoutMs: 30000,
    enabled: true
  };
}

/** Ao trocar o tipo, adota URL/modelo do template, mantendo os atuais se não houver template. */
export function switchProviderType(
  draft: Partial<LlmProviderConfig>,
  provider: LlmProviderType
): Partial<LlmProviderConfig> {
  const template = DEFAULT_LLM_PROVIDER_TEMPLATES.find((t) => t.provider === provider);
  return {
    ...draft,
    provider,
    baseUrl: template?.baseUrl || draft.baseUrl,
    model: template?.model || draft.model
  };
}

/** Segundos digitados -> ms, com piso de 5s. */
export function secondsToTimeoutMs(seconds: number): number {
  return Math.max(5000, seconds * 1000);
}

/** Exemplo do formato da chave de cada provedor (o Ollama local dispensa chave). */
export function apiKeyPlaceholder(provider: LlmProviderType | undefined): string {
  switch (provider) {
    case 'anthropic':
      return 'sk-ant-...';
    case 'gemini':
      return 'AIzaSy...';
    case 'openrouter':
      return 'sk-or-...';
    case 'ollama':
      return 'Deixe em branco (Ollama local)';
    default:
      return 'sk-...';
  }
}

/** Provedor em nuvem sem chave não consegue responder; o Ollama local dispensa. */
export function llmProviderNeedsKey(provider: Pick<LlmProviderConfig, 'apiKey' | 'provider'>): boolean {
  return provider.provider !== 'ollama' && !provider.apiKey?.trim();
}

/**
 * Carrega um preset no formulário. Mantém o id e o que o preset não define (chave de API e
 * prompt de sistema já digitados), para que escolher o preset depois de colar a chave não a apague.
 */
export function applyTemplateToDraft(
  draft: Partial<LlmProviderConfig> | null,
  template: Omit<LlmProviderConfig, 'id'>,
  fallbackId: string
): Partial<LlmProviderConfig> {
  return {
    ...template,
    id: draft?.id || fallbackId,
    apiKey: template.apiKey || draft?.apiKey,
    systemPrompt: template.systemPrompt || draft?.systemPrompt
  };
}
