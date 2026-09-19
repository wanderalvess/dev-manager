import { describe, expect, it, beforeEach, vi } from 'vitest';
import { LlmService } from './LlmService';
import { ConfigService } from './ConfigService';
import { DocsIndexService } from './DocsIndexService';
import { LlmProviderConfig } from '../../shared/types';

describe('LlmService', () => {
  let mockConfigService: any;
  let mockDocsIndexService: any;

  beforeEach(() => {
    mockConfigService = {
      getSettings: vi.fn().mockReturnValue({
        llmProviders: [
          {
            id: 'prov-openai',
            name: 'OpenAI Test',
            provider: 'openai',
            model: 'gpt-4o-mini',
            apiKey: 'sk-test-key',
            enabled: true,
            isDefault: true
          },
          {
            id: 'prov-gemini',
            name: 'Google Gemini',
            provider: 'gemini',
            model: 'gemini-2.0-flash',
            apiKey: 'gemini-test-key',
            enabled: true
          },
          {
            id: 'prov-anthropic',
            name: 'Claude Test',
            provider: 'anthropic',
            model: 'claude-3-5-sonnet-20241022',
            apiKey: 'ant-test-key',
            enabled: false
          }
        ],
        activeLlmProviderId: 'prov-openai'
      })
    };

    mockDocsIndexService = {
      search: vi.fn().mockResolvedValue([
        {
          chunk: {
            id: 'chunk-1',
            entryTitle: 'Guia de Rotinas WinThor',
            entryId: 'C:/docs/rotinas.md',
            sourceLabel: 'Wiki',
            text: 'A rotina 1203 é responsável por extrato de clientes.'
          },
          score: 0.92
        }
      ])
    };
  });

  describe('getActiveProvider', () => {
    it('retorna o provedor apontado por activeLlmProviderId', () => {
      const service = new LlmService(mockConfigService);
      const active = service.getActiveProvider();
      expect(active?.id).toBe('prov-openai');
    });

    it('faz fallback para o primeiro habilitado se activeLlmProviderId for inválido', () => {
      mockConfigService.getSettings.mockReturnValue({
        llmProviders: [
          { id: 'prov-gemini', name: 'Gemini', provider: 'gemini', model: 'gemini-2.0-flash', enabled: true }
        ],
        activeLlmProviderId: 'inexistente'
      });
      const service = new LlmService(mockConfigService);
      const active = service.getActiveProvider();
      expect(active?.id).toBe('prov-gemini');
    });

    it('retorna null quando não há provedores configurados', () => {
      mockConfigService.getSettings.mockReturnValue({ llmProviders: [] });
      const service = new LlmService(mockConfigService);
      expect(service.getActiveProvider()).toBeNull();
    });
  });

  describe('testConnection', () => {
    it('testa conexão com sucesso para provedor OpenAI', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'pong' } }] })
      } as any);

      const service = new LlmService(mockConfigService);
      const config: LlmProviderConfig = {
        id: 'test',
        name: 'OpenAI Test',
        provider: 'openai',
        apiKey: 'sk-123',
        model: 'gpt-4o-mini',
        enabled: true
      };

      const result = await service.testConnection(config);
      expect(result.success).toBe(true);
      expect(typeof result.latencyMs).toBe('number');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-123',
            'Content-Type': 'application/json'
          })
        })
      );
      fetchSpy.mockRestore();
    });

    it('retorna erro 401 amigável quando a chave é inválida', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: { message: 'Incorrect API key provided' } })
      } as any);

      const service = new LlmService(mockConfigService);
      const config: LlmProviderConfig = {
        id: 'test',
        name: 'OpenAI Test',
        provider: 'openai',
        apiKey: 'sk-invalid',
        model: 'gpt-4o-mini',
        enabled: true
      };

      const result = await service.testConnection(config);
      expect(result.success).toBe(false);
      expect(result.message).toContain('401/403');
      fetchSpy.mockRestore();
    });

    it('retorna mensagem de timeout amigável para Ollama ou rede lenta', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

      const service = new LlmService(mockConfigService);
      const config: LlmProviderConfig = {
        id: 'test',
        name: 'Ollama Local',
        provider: 'ollama',
        baseUrl: 'http://localhost:11434/v1',
        model: 'llama3.2',
        enabled: true,
        timeoutMs: 500
      };

      const result = await service.testConnection(config);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Tempo limite esgotado');
      expect(result.message).toContain('ollama serve');
      fetchSpy.mockRestore();
    });
  });

  describe('chat', () => {
    it('chama OpenAI e extrai resposta corretamente', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'gpt-4o-mini',
          choices: [{ message: { content: 'Olá, em que posso ajudar?' } }],
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 }
        })
      } as any);

      const service = new LlmService(mockConfigService);
      const response = await service.chat({
        messages: [{ role: 'user', content: 'Olá' }]
      });

      expect(response.text).toBe('Olá, em que posso ajudar?');
      expect(response.provider).toBe('OpenAI Test');
      expect(response.usage?.totalTokens).toBe(25);
      fetchSpy.mockRestore();
    });

    it('chama Google Gemini REST e extrai resposta', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: 'Resposta do Gemini' }]
              }
            }
          ],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 10, totalTokenCount: 15 }
        })
      } as any);

      const service = new LlmService(mockConfigService);
      const response = await service.chat({
        providerId: 'prov-gemini',
        messages: [{ role: 'user', content: 'Como funciona o WinThor?' }]
      });

      expect(response.text).toBe('Resposta do Gemini');
      expect(response.usage?.totalTokens).toBe(15);
      fetchSpy.mockRestore();
    });

    it('chama Anthropic Messages API e extrai resposta', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          model: 'claude-3-5-sonnet-20241022',
          content: [{ type: 'text', text: 'Resposta do Claude' }],
          usage: { input_tokens: 8, output_tokens: 12 }
        })
      } as any);

      const service = new LlmService(mockConfigService);
      const response = await service.chat({
        providerId: 'prov-anthropic',
        messages: [{ role: 'user', content: 'Qual o comando Karaf?' }]
      });

      expect(response.text).toBe('Resposta do Claude');
      expect(response.usage?.totalTokens).toBe(20);
      fetchSpy.mockRestore();
    });
  });

  describe('askWithDocs (RAG)', () => {
    it('executa busca vetorial, formata contexto e gera resposta com fontes', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'A rotina 1203 consulta o extrato de clientes do WinThor.' } }]
        })
      } as any);

      const service = new LlmService(mockConfigService, mockDocsIndexService);
      const response = await service.askWithDocs({
        query: 'Como consultar extrato de cliente?'
      });

      expect(mockDocsIndexService.search).toHaveBeenCalledWith('Como consultar extrato de cliente?', {
        sourceLabel: undefined,
        topK: 5
      });
      expect(response.answer).toBe('A rotina 1203 consulta o extrato de clientes do WinThor.');
      expect(response.sources).toHaveLength(1);
      expect(response.sources[0].title).toBe('Guia de Rotinas WinThor');
      expect(response.sources[0].path).toBe('C:/docs/rotinas.md');
      expect(response.sources[0].score).toBe(0.92);

      fetchSpy.mockRestore();
    });

    it('retorna mensagem informativa quando não há documentos encontrados', async () => {
      mockDocsIndexService.search.mockResolvedValueOnce([]);
      const service = new LlmService(mockConfigService, mockDocsIndexService);
      const response = await service.askWithDocs({
        query: 'Termo inexistente em qualquer documento'
      });

      expect(response.answer).toContain('Não foram encontrados trechos relevantes');
      expect(response.sources).toEqual([]);
    });
  });
});
