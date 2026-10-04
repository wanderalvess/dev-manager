import { describe, it, expect } from 'vitest';
import {
  getFolderDisplayTitle,
  buildConfluenceSource,
  buildJiraSource,
  applyProviderPreset,
  createNewLlmDraft,
  buildLlmProvider,
  buildLlmTestConfig
} from './docSettingsUtils';
import { DEFAULT_SYSTEM_PROMPT, PROVIDER_PRESETS } from './docSettingsPresets';

describe('getFolderDisplayTitle', () => {
  it('usa o label quando presente', () => {
    expect(getFolderDisplayTitle({ path: 'C:\\a\\b', label: '  Manuais ' } as any)).toBe('Manuais');
  });
  it('usa os dois últimos segmentos do caminho', () => {
    expect(getFolderDisplayTitle({ path: 'C:\\docs\\erp\\' } as any)).toBe('docs / erp');
  });
  it('cai para o caminho quando há um só segmento vazio', () => {
    expect(getFolderDisplayTitle({ path: '/' } as any)).toBe('/');
  });
});

describe('buildConfluenceSource / buildJiraSource', () => {
  it('retorna null sem campos obrigatórios', () => {
    expect(buildConfluenceSource({ name: 'x' })).toBeNull();
    expect(buildJiraSource(null)).toBeNull();
  });
  it('normaliza e aplica defaults', () => {
    const c = buildConfluenceSource({ name: ' W ', baseUrl: ' u ', authToken: ' t ', spaceKey: ' ' });
    expect(c).toMatchObject({ name: 'W', baseUrl: 'u', authToken: 't', spaceKey: undefined, enabled: true });
    expect(c!.id).toMatch(/^confluence_/);
    const j = buildJiraSource({ id: 'j1', name: 'J', baseUrl: 'u', authToken: 't', jql: ' q ', enabled: false });
    expect(j).toMatchObject({ id: 'j1', jql: 'q', enabled: false });
  });
});

describe('LLM helpers', () => {
  it('applyProviderPreset preserva nome e parâmetros existentes', () => {
    const r = applyProviderPreset({ name: 'Meu', temperature: 0.7 }, PROVIDER_PRESETS[1]);
    expect(r).toMatchObject({ name: 'Meu', provider: 'gemini', temperature: 0.7, maxTokens: 2048 });
    expect(r.systemPrompt).toBe(DEFAULT_SYSTEM_PROMPT);
  });
  it('createNewLlmDraft usa o primeiro preset', () => {
    const d = createNewLlmDraft();
    expect(d.provider).toBe('openai');
    expect(d.baseUrl).toBe(PROVIDER_PRESETS[0].baseUrl);
  });
  it('buildLlmProvider exige nome e modelo e faz trim', () => {
    expect(buildLlmProvider({ name: 'a' })).toBeNull();
    const p = buildLlmProvider({ name: ' a ', model: ' m ', apiKey: ' k ' });
    expect(p).toMatchObject({ name: 'a', model: 'm', apiKey: 'k', provider: 'openai', enabled: true });
  });
  it('buildLlmTestConfig aplica defaults sem trim', () => {
    expect(buildLlmTestConfig({})).toMatchObject({ id: 'test', name: 'Teste', model: 'gpt-4o-mini', enabled: true });
  });
});
