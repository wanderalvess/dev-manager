import { describe, expect, it } from 'vitest';
import type { LlmProviderConfig } from '../../../shared/types';
import {
  apiKeyPlaceholder,
  applyTemplateToDraft,
  createNewLlmProviderDraft,
  llmProviderNeedsKey,
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

  it('apiKeyPlaceholder mostra o formato da chave de cada provedor', () => {
    expect(apiKeyPlaceholder('anthropic')).toBe('sk-ant-...');
    expect(apiKeyPlaceholder('gemini')).toBe('AIzaSy...');
    expect(apiKeyPlaceholder('ollama')).toContain('Ollama');
    expect(apiKeyPlaceholder(undefined)).toBe('sk-...');
  });

  it('llmProviderNeedsKey exige chave, exceto no Ollama local', () => {
    expect(llmProviderNeedsKey(makeProvider({ apiKey: '' }))).toBe(true);
    expect(llmProviderNeedsKey(makeProvider({ apiKey: '   ' }))).toBe(true);
    expect(llmProviderNeedsKey(makeProvider({ apiKey: 'sk-1' }))).toBe(false);
    expect(llmProviderNeedsKey(makeProvider({ provider: 'ollama', apiKey: '' }))).toBe(false);
  });

  it('applyTemplateToDraft mantém id e chave já digitados ao escolher um preset', () => {
    const template = { name: 'Anthropic Claude', provider: 'anthropic', model: 'm', enabled: true } as Omit<LlmProviderConfig, 'id'>;
    const out = applyTemplateToDraft({ id: 'llm-1', apiKey: 'sk-ant-1', systemPrompt: 'sp' }, template, 'llm-9');
    expect(out).toMatchObject({ id: 'llm-1', apiKey: 'sk-ant-1', systemPrompt: 'sp', provider: 'anthropic' });
    expect(applyTemplateToDraft(null, template, 'llm-9').id).toBe('llm-9');
  });

  it('switchProviderType preserva valores sem template', () => {
    const draft = { baseUrl: 'http://x', model: 'm' };
    const out = switchProviderType(draft, 'custom');
    expect(out.provider).toBe('custom');
    expect(out.baseUrl).toBeTruthy();
  });
});
