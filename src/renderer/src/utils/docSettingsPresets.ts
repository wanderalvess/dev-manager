import type { LlmProviderType } from '../../../shared/types';

export const DEFAULT_SYSTEM_PROMPT =
  'Você é um assistente técnico especialista no ecossistema WinThor ERP e nas documentações internas da TOTVS. Responda de maneira clara, direta e objetiva, citando os arquivos e módulos de origem sempre que relevante.';

export interface ProviderPreset {
  type: LlmProviderType;
  label: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  models: string[];
  requiresApiKey: boolean;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    type: 'openai',
    label: 'OpenAI',
    name: 'OpenAI Oficial',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.5-preview', 'o3-mini'],
    requiresApiKey: true
  },
  {
    type: 'gemini',
    label: 'Google Gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    requiresApiKey: true
  },
  {
    type: 'anthropic',
    label: 'Anthropic Claude',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
    requiresApiKey: true
  },
  {
    type: 'ollama',
    label: 'Ollama (Local)',
    name: 'Ollama Local',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'deepseek-r1:8b', 'qwen2.5-coder', 'mistral'],
    requiresApiKey: false
  },
  {
    type: 'custom',
    label: 'OpenAI-Compatible / Custom',
    name: 'Endpoint Customizado',
    baseUrl: 'http://localhost:8080/v1',
    defaultModel: 'default',
    models: [],
    requiresApiKey: false
  }
];
