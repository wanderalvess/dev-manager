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
