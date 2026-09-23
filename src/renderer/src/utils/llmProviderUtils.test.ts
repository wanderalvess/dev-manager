import { describe, expect, it } from 'vitest';
import { isLlmProviderActive, resolveActiveLlmProvider } from './llmProviderUtils';
import type { LlmProviderConfig } from '../../../shared/types';

function makeProvider(overrides: Partial<LlmProviderConfig>): LlmProviderConfig {
  return { id: 'p1', name: 'Provedor', provider: 'openai', model: 'gpt', enabled: false, ...overrides };
}

describe('isLlmProviderActive', () => {
  it('quando há activeLlmProviderId, só o provedor com esse id é ativo (independente de enabled)', () => {
    const provider = makeProvider({ id: 'a', enabled: false });
    expect(isLlmProviderActive(provider, 'a')).toBe(true);
    expect(isLlmProviderActive(provider, 'b')).toBe(false);
  });

  it('sem activeLlmProviderId, cai para o campo enabled do próprio provedor', () => {
    expect(isLlmProviderActive(makeProvider({ enabled: true }), undefined)).toBe(true);
    expect(isLlmProviderActive(makeProvider({ enabled: false }), undefined)).toBe(false);
    expect(isLlmProviderActive(makeProvider({ enabled: true }), '')).toBe(true);
  });
});

describe('resolveActiveLlmProvider', () => {
  it('retorna o provedor selecionado por activeLlmProviderId', () => {
    const providers = [makeProvider({ id: 'a', enabled: false }), makeProvider({ id: 'b', enabled: true })];
    expect(resolveActiveLlmProvider(providers, 'a')?.id).toBe('a');
  });

  it('sem seleção, retorna o primeiro provedor com enabled=true', () => {
    const providers = [makeProvider({ id: 'a', enabled: false }), makeProvider({ id: 'b', enabled: true })];
    expect(resolveActiveLlmProvider(providers, undefined)?.id).toBe('b');
  });

  it('retorna undefined quando nenhum provedor está ativo', () => {
    const providers = [makeProvider({ id: 'a', enabled: false })];
    expect(resolveActiveLlmProvider(providers, undefined)).toBeUndefined();
    expect(resolveActiveLlmProvider([], 'a')).toBeUndefined();
  });
});
