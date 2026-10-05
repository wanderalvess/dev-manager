import { describe, expect, it } from 'vitest';
import type { LlmProviderConfig } from '../../../shared/types';
import {
  createNewLlmProviderDraft,
  describeTemperature,
  findActiveLlmProvider,
  formatEndpoint,
  formatTimeoutSeconds,
  maskApiKey,
  secondsToTimeoutMs,
  switchProviderType
} from './aiTabUtils';

const makeProvider = (over: Partial<LlmProviderConfig> = {}): LlmProviderConfig =>
  ({
    id: 'p1',
    name: 'P1',
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt',
    enabled: true,
    ...over
  }) as LlmProviderConfig;

describe('aiTabUtils', () => {
  it('findActiveLlmProvider usa o id ativo ou o primeiro habilitado', () => {
    const a = makeProvider({ id: 'a', enabled: false });
    const b = makeProvider({ id: 'b', enabled: true });
    expect(findActiveLlmProvider([a, b], 'a')?.id).toBe('a');
    expect(findActiveLlmProvider([a, b], undefined)?.id).toBe('b');
    expect(findActiveLlmProvider(undefined, undefined)).toBeUndefined();
  });

  it('maskApiKey nunca expõe a chave completa', () => {
    const masked = maskApiKey(makeProvider({ apiKey: 'sk-secret-1234' }));
    expect(masked).toBe('••••••••1234');
    expect(masked).not.toContain('secret');
    expect(maskApiKey(makeProvider({ provider: 'ollama', apiKey: '' }))).toBe('Sem chave (Local)');
    expect(maskApiKey(makeProvider({ apiKey: '' }))).toBe('Não informada');
  });

  it('formatEndpoint remove o esquema https', () => {
    expect(formatEndpoint('https://x.com/v1')).toBe('x.com/v1');
    expect(formatEndpoint('')).toBe('Oficial Cloud');
  });

  it('describeTemperature segue as faixas originais', () => {
    expect(describeTemperature(0.2)).toBe('Precisa');
    expect(describeTemperature(0.5)).toBe('Técnica/Código');
    expect(describeTemperature(0.7)).toBe('Balanceada');
    expect(describeTemperature(0.9)).toBe('Criativa');
    expect(describeTemperature(undefined)).toBe('Balanceada');
  });

  it('timeout converte e aplica piso de 5s', () => {
    expect(formatTimeoutSeconds(undefined)).toBe('30');
    expect(secondsToTimeoutMs(1)).toBe(5000);
    expect(secondsToTimeoutMs(60)).toBe(60000);
  });

  it('createNewLlmProviderDraft gera id com timestamp', () => {
    expect(createNewLlmProviderDraft(42).id).toBe('llm-42');
  });

  it('switchProviderType preserva valores sem template', () => {
    const draft = { baseUrl: 'http://x', model: 'm' };
    const out = switchProviderType(draft, 'custom');
    expect(out.provider).toBe('custom');
    expect(out.baseUrl).toBeTruthy();
  });
});
