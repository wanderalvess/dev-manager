import type {
  DocFolderConfig,
  ConfluenceSourceConfig,
  JiraSourceConfig,
  LlmProviderConfig
} from '../../../shared/types';
import { DEFAULT_SYSTEM_PROMPT, PROVIDER_PRESETS, type ProviderPreset } from './docSettingsPresets';

export function getFolderDisplayTitle(folder: DocFolderConfig): string {
  if (folder.label && folder.label.trim()) return folder.label.trim();
  const normalized = folder.path.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
  }
  return parts[parts.length - 1] || folder.path;
}

/** Retorna null quando faltam campos obrigatórios (nome, URL ou token). */
export function buildConfluenceSource(
  draft: Partial<ConfluenceSourceConfig> | null
): ConfluenceSourceConfig | null {
  if (!draft?.name || !draft?.baseUrl || !draft?.authToken) return null;
  return {
    id: draft.id || `confluence_${Date.now()}`,
    name: draft.name.trim(),
    baseUrl: draft.baseUrl.trim(),
    spaceKey: draft.spaceKey?.trim() || undefined,
    authToken: draft.authToken.trim(),
    authEmail: draft.authEmail?.trim() || undefined,
    enabled: draft.enabled !== undefined ? draft.enabled : true
  };
}

export function buildJiraSource(draft: Partial<JiraSourceConfig> | null): JiraSourceConfig | null {
  if (!draft?.name || !draft?.baseUrl || !draft?.authToken) return null;
  return {
    id: draft.id || `jira_${Date.now()}`,
    name: draft.name.trim(),
    baseUrl: draft.baseUrl.trim(),
    projectKey: draft.projectKey?.trim() || undefined,
    jql: draft.jql?.trim() || undefined,
    authToken: draft.authToken.trim(),
    enabled: draft.enabled !== undefined ? draft.enabled : true
  };
}

export function applyProviderPreset(
  prev: Partial<LlmProviderConfig> | null,
  preset: ProviderPreset
): Partial<LlmProviderConfig> {
  return {
    ...prev,
    provider: preset.type,
    name: prev?.name || preset.name,
    baseUrl: preset.baseUrl,
    model: preset.defaultModel,
    temperature: prev?.temperature ?? 0.3,
    maxTokens: prev?.maxTokens ?? 2048,
    systemPrompt: prev?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    enabled: prev?.enabled !== undefined ? prev.enabled : true
  };
}

export function createNewLlmDraft(): Partial<LlmProviderConfig> {
  const defaultPreset = PROVIDER_PRESETS[0];
  return {
    id: `llm_${Date.now()}`,
    name: 'OpenAI Oficial',
    provider: 'openai',
    baseUrl: defaultPreset.baseUrl,
    model: defaultPreset.defaultModel,
    apiKey: '',
    temperature: 0.3,
    maxTokens: 2048,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    enabled: true
  };
}

/** Retorna null quando faltam nome ou modelo. */
export function buildLlmProvider(draft: Partial<LlmProviderConfig> | null): LlmProviderConfig | null {
  if (!draft?.name || !draft?.model) return null;
  return {
    id: draft.id || `llm_${Date.now()}`,
    name: draft.name.trim(),
    provider: draft.provider || 'openai',
    baseUrl: draft.baseUrl?.trim() || '',
    apiKey: draft.apiKey?.trim() || '',
    model: draft.model.trim(),
    temperature: draft.temperature ?? 0.3,
    maxTokens: draft.maxTokens ?? 2048,
    systemPrompt: draft.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
    enabled: draft.enabled !== undefined ? draft.enabled : true
  };
}

/** Config efêmera para teste de conexão: não é trimada nem persistida. */
export function buildLlmTestConfig(draft: Partial<LlmProviderConfig>): LlmProviderConfig {
  return {
    id: draft.id || 'test',
    name: draft.name || 'Teste',
    provider: draft.provider || 'openai',
    baseUrl: draft.baseUrl || '',
    apiKey: draft.apiKey || '',
    model: draft.model || 'gpt-4o-mini',
    temperature: draft.temperature ?? 0.3,
    maxTokens: draft.maxTokens ?? 2048,
    systemPrompt: draft.systemPrompt || '',
    enabled: true
  };
}
