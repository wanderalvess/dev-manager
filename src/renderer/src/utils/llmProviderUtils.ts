import type { LlmProviderConfig } from '../../../shared/types';

/**
 * Verdadeiro se este é o provedor de LLM ativo: o selecionado explicitamente via
 * `activeLlmProviderId`, ou — sem seleção explícita — o único marcado como habilitado.
 * Regra compartilhada entre a listagem de provedores (DocSettingsModal) e a página de
 * Documentação/Chat (DocsPage), que precisam concordar sobre qual provedor está em uso.
 */
export function isLlmProviderActive(provider: LlmProviderConfig, activeLlmProviderId?: string): boolean {
  return activeLlmProviderId ? provider.id === activeLlmProviderId : provider.enabled;
}

/** Resolve o provedor de LLM ativo dentre os configurados, ou `undefined` se nenhum estiver ativo. */
export function resolveActiveLlmProvider(
  providers: LlmProviderConfig[],
  activeLlmProviderId?: string
): LlmProviderConfig | undefined {
  return providers.find((p) => isLlmProviderActive(p, activeLlmProviderId));
}
