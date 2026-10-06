import {
  LlmProviderConfig,
  LlmChatRequest,
  LlmChatResponse,
  LlmTestResult,
  LlmRagQueryRequest,
  LlmRagQueryResponse
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { DocsIndexService } from './DocsIndexService';
import { isSafeUrl } from '../utils/security';

export class LlmService {
  constructor(
    private readonly configService: ConfigService,
    private readonly docsIndexService?: DocsIndexService
  ) {}

  /**
   * Obtém o provedor configurado e ativo no momento.
   */
  public getActiveProvider(): LlmProviderConfig | null {
    const settings = this.configService.getSettings();
    const providers = settings.llmProviders || [];
    if (providers.length === 0) return null;

    if (settings.activeLlmProviderId) {
      const active = providers.find((p) => p.id === settings.activeLlmProviderId);
      if (active) return active;
    }

    const defaultProv = providers.find((p) => p.isDefault && p.enabled);
    if (defaultProv) return defaultProv;

    const firstEnabled = providers.find((p) => p.enabled);
    return firstEnabled || providers[0] || null;
  }

  /**
   * Testa a conectividade com o provedor enviando uma requisição mínima (maxTokens: 5),
   * medindo a latência e fornecendo diagnósticos claros de erro.
   */
  public async testConnection(config: LlmProviderConfig): Promise<LlmTestResult> {
    const timeoutMs = config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : 30000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const startTime = Date.now();

    try {
      if (config.provider === 'gemini') {
        const apiKey = config.apiKey?.trim() || '';
        if (!apiKey) {
          return { success: false, message: 'Chave de API do Google Gemini não informada.' };
        }
        const model = config.model?.trim() || 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 5 }
          }),
          signal: controller.signal
        });

        clearTimeout(timer);
        const latencyMs = Date.now() - startTime;

        if (response.ok) {
          return { success: true, message: `Conexão bem-sucedida com Gemini (${model})!`, latencyMs };
        }
        return await this.handleHttpError(response, config);
      }

      if (config.provider === 'anthropic') {
        const apiKey = config.apiKey?.trim() || '';
        if (!apiKey) {
          return { success: false, message: 'Chave de API da Anthropic não informada.' };
        }
        const baseUrl = (config.baseUrl?.trim() || 'https://api.anthropic.com').replace(/\/+$/, '');
        const url = `${baseUrl}/v1/messages`;
        if (!isSafeUrl(url)) {
          return { success: false, message: 'URL do provedor (baseUrl) inválida ou insegura.' };
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: config.model || 'claude-3-5-sonnet-20241022',
            max_tokens: 5,
            messages: [{ role: 'user', content: 'ping' }]
          }),
          signal: controller.signal
        });

        clearTimeout(timer);
        const latencyMs = Date.now() - startTime;

        if (response.ok) {
          return { success: true, message: `Conexão bem-sucedida com Anthropic (${config.model})!`, latencyMs };
        }
        return await this.handleHttpError(response, config);
      }

      // Provedores compatíveis com OpenAI (OpenAI, OpenRouter, Groq, DeepSeek, Ollama, custom)
      const defaultBaseUrl = config.provider === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1';
      const baseUrl = (config.baseUrl?.trim() || defaultBaseUrl).replace(/\/+$/, '');
      const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
      if (!isSafeUrl(url)) {
        return { success: false, message: 'URL do provedor (baseUrl) inválida ou insegura.' };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (config.apiKey?.trim()) {
        headers['Authorization'] = `Bearer ${config.apiKey.trim()}`;
      }
      if (config.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://github.com/wanderalvess/dev-manager';
        headers['X-Title'] = 'Hub Manager';
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model || (config.provider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini'),
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5
        }),
        signal: controller.signal
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        return { success: true, message: `Conexão bem-sucedida com ${config.name || config.provider} (${config.model})!`, latencyMs };
      }
      return await this.handleHttpError(response, config);
    } catch (err: any) {
      clearTimeout(timer);
      return this.handleNetworkError(err, timeoutMs, config);
    }
  }

  /**
   * Executa uma chamada síncrona de chat ao provedor ativo ou especificado.
   */
  public async chat(request: LlmChatRequest): Promise<LlmChatResponse> {
    const provider = request.providerId
      ? (this.configService.getSettings().llmProviders || []).find((p) => p.id === request.providerId)
      : this.getActiveProvider();

    if (!provider) {
      throw new Error(
        'Nenhum provedor de LLM configurado ou ativo. Acesse Configurações > IA & Modelos LLM para configurar sua chave.'
      );
    }

    if (provider.provider !== 'ollama' && (!provider.apiKey || !provider.apiKey.trim())) {
      throw new Error(`A chave de API para o provedor "${provider.name}" não foi informada.`);
    }

    const timeoutMs = request.maxTokens ? Math.max(provider.timeoutMs || 30000, 45000) : (provider.timeoutMs || 30000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (provider.provider === 'gemini') {
        return await this.callGemini(provider, request, controller.signal);
      }
      if (provider.provider === 'anthropic') {
        return await this.callAnthropic(provider, request, controller.signal);
      }
      return await this.callOpenAiCompatible(provider, request, controller.signal);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Tempo esgotado (${timeoutMs / 1000}s) aguardando resposta do modelo ${provider.model}.`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Executa busca na base vetorial/textual de documentação e sintetiza uma resposta
   * contextualizada através do LLM ativo (RAG).
   */
  public async askWithDocs(request: LlmRagQueryRequest): Promise<LlmRagQueryResponse> {
    if (!this.docsIndexService) {
      throw new Error('Serviço de documentação (DocsIndexService) não está disponível.');
    }

    const trimmedQuery = request.query?.trim() || '';
    if (!trimmedQuery) {
      throw new Error('A pergunta não pode estar vazia.');
    }

    const topK = request.topK && request.topK > 0 ? request.topK : 5;
    const searchResults = await this.docsIndexService.search(trimmedQuery, {
      sourceLabel: request.sourceLabel,
      topK
    });

    const sources = searchResults.map((r) => ({
      title: r.chunk.entryTitle || r.chunk.id,
      path: r.chunk.entryId || r.chunk.id,
      score: Math.round(r.score * 100) / 100
    }));

    // Se nenhum documento relevante foi encontrado
    if (searchResults.length === 0) {
      return {
        answer:
          'Não foram encontrados trechos relevantes na documentação indexada para responder à sua dúvida. Certifique-se de que os repositórios ou pastas de documentação estão adicionados e indexados na página Documentações.',
        sources: []
      };
    }

    // Montar contexto com os trechos extraídos
    const contextBlocks = searchResults.map((r, idx) => {
      const title = r.chunk.entryTitle || r.chunk.id;
      const origin = r.chunk.sourceLabel ? ` [Fonte: ${r.chunk.sourceLabel}]` : '';
      const docPath = r.chunk.entryId || r.chunk.id;
      return `### Documento ${idx + 1}: ${title}${origin}\nCaminho: ${docPath}\nTrecho:\n${r.chunk.text}`;
    }).join('\n\n---\n\n');

    const defaultSystemPrompt =
      'Você é o Assistente Especialista em WinThor e Engenharia de Software do Hub Manager.\n' +
      'Sua missão é responder à dúvida do desenvolvedor com precisão técnica e clareza, baseando-se PRIMARIAMENTE no contexto documental fornecido.\n' +
      'Diretrizes:\n' +
      '1. Cite nomes de tabelas, rotinas, endpoints ou classes mencionadas no contexto.\n' +
      '2. Se a documentação tiver a resposta direta, explique o procedimento passo a passo.\n' +
      '3. Se a documentação for parcial, responda o que consta nela e complemente com boas práticas técnicas (PL/SQL, Java, Karaf OSGi, WinThor), informando expressamente o que é dedução técnica.\n' +
      '4. Formate a resposta em Markdown claro (código em blocos com syntax highlighting, listas e tópicos em negrito).';

    const provider = this.getActiveProvider();
    const configuredPrompt = provider?.systemPrompt?.trim();
    const systemInstruction = request.systemInstruction?.trim() || configuredPrompt || defaultSystemPrompt;

    const userPrompt =
      `# Contexto Documental Recuperado:\n\n${contextBlocks}\n\n` +
      `---\n\n# Pergunta do Desenvolvedor:\n${trimmedQuery}`;

    const chatResponse = await this.chat({
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3 // Temperatura menor para respostas mais ancoradas no RAG
    });

    return {
      answer: chatResponse.text,
      sources
    };
  }

  // ==========================================
  // Adaptadores de Provedor
  // ==========================================

  private async callOpenAiCompatible(
    provider: LlmProviderConfig,
    request: LlmChatRequest,
    signal: AbortSignal
  ): Promise<LlmChatResponse> {
    const defaultBaseUrl = provider.provider === 'ollama' ? 'http://localhost:11434/v1' : 'https://api.openai.com/v1';
    const baseUrl = (provider.baseUrl?.trim() || defaultBaseUrl).replace(/\/+$/, '');
    const url = baseUrl.endsWith('/chat/completions') ? baseUrl : `${baseUrl}/chat/completions`;
    if (!isSafeUrl(url)) {
      throw new Error(`URL do provedor ${provider.name} (baseUrl) inválida ou insegura.`);
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (provider.apiKey?.trim()) {
      headers['Authorization'] = `Bearer ${provider.apiKey.trim()}`;
    }
    if (provider.provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/wanderalvess/dev-manager';
      headers['X-Title'] = 'Hub Manager';
    }

    const payload = {
      model: provider.model || (provider.provider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini'),
      messages: request.messages,
      temperature: request.temperature ?? provider.temperature ?? 0.7,
      max_tokens: request.maxTokens ?? provider.maxTokens ?? 2048
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal
    });

    if (!res.ok) {
      const errDetail = await this.parseErrorBody(res);
      throw new Error(`Erro do provedor ${provider.name} (${res.status}): ${errDetail}`);
    }

    const data: any = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    return {
      text,
      provider: provider.name,
      model: data.model || provider.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens
          }
        : undefined
    };
  }

  private async callGemini(
    provider: LlmProviderConfig,
    request: LlmChatRequest,
    signal: AbortSignal
  ): Promise<LlmChatResponse> {
    const apiKey = provider.apiKey?.trim() || '';
    const model = provider.model?.trim() || 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    // Separar system instructions e mensagens
    const systemMessages = request.messages.filter((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const contents = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? provider.temperature ?? 0.7,
        maxOutputTokens: request.maxTokens ?? provider.maxTokens ?? 2048
      }
    };

    if (systemMessages.length > 0) {
      body.system_instruction = {
        parts: systemMessages.map((m) => ({ text: m.content }))
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) {
      const errDetail = await this.parseErrorBody(res);
      throw new Error(`Erro do Google Gemini (${res.status}): ${errDetail}`);
    }

    const data: any = await res.json();
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

    return {
      text,
      provider: provider.name,
      model,
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount
          }
        : undefined
    };
  }

  private async callAnthropic(
    provider: LlmProviderConfig,
    request: LlmChatRequest,
    signal: AbortSignal
  ): Promise<LlmChatResponse> {
    const apiKey = provider.apiKey?.trim() || '';
    const baseUrl = (provider.baseUrl?.trim() || 'https://api.anthropic.com').replace(/\/+$/, '');
    const url = `${baseUrl}/v1/messages`;
    if (!isSafeUrl(url)) {
      throw new Error(`URL do provedor ${provider.name} (baseUrl) inválida ou insegura.`);
    }

    const systemMessages = request.messages.filter((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const messages = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    const body: any = {
      model: provider.model || 'claude-3-5-sonnet-20241022',
      max_tokens: request.maxTokens ?? provider.maxTokens ?? 2048,
      temperature: request.temperature ?? provider.temperature ?? 0.7,
      messages
    };

    if (systemMessages.length > 0) {
      body.system = systemMessages.map((m) => m.content).join('\n\n');
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal
    });

    if (!res.ok) {
      const errDetail = await this.parseErrorBody(res);
      throw new Error(`Erro do Anthropic Claude (${res.status}): ${errDetail}`);
    }

    const data: any = await res.json();
    const text = data.content?.map((c: any) => c.text).join('') || '';

    return {
      text,
      provider: provider.name,
      model: data.model || provider.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0)
          }
        : undefined
    };
  }

  // ==========================================
  // Tratamento de Erros e Mensagens Amigáveis
  // ==========================================

  private async handleHttpError(response: Response, config: LlmProviderConfig): Promise<LlmTestResult> {
    if (response.status === 401 || response.status === 403) {
      return {
        success: false,
        message: 'Chave de API inválida ou sem permissão de acesso (401/403). Verifique sua chave.'
      };
    }
    if (response.status === 429) {
      return {
        success: false,
        message: 'Cota de tokens esgotada ou limite de requisições excedido no provedor (429).'
      };
    }
    if (response.status === 404) {
      return {
        success: false,
        message: `Modelo "${config.model}" não encontrado ou endpoint inexistente (404).`
      };
    }

    const detail = await this.parseErrorBody(response);
    return {
      success: false,
      message: `Falha na requisição (${response.status}): ${detail}`
    };
  }

  private handleNetworkError(err: any, timeoutMs: number, config: LlmProviderConfig): LlmTestResult {
    if (err?.name === 'AbortError') {
      const hint =
        config.provider === 'ollama'
          ? ' Se for Ollama/modelo local, verifique se o servidor está rodando (ex: ollama serve).'
          : '';
      return {
        success: false,
        message: `Tempo limite esgotado (${timeoutMs / 1000}s) ao contatar o provedor.${hint}`
      };
    }

    const errMsg = err?.message || String(err);
    if (errMsg.includes('ECONNREFUSED') || errMsg.includes('fetch failed')) {
      const hint =
        config.provider === 'ollama'
          ? ' Não foi possível conectar ao Ollama em ' + (config.baseUrl || 'http://localhost:11434') + '. O serviço está ativo?'
          : ' Falha ao conectar ao servidor. Verifique a URL e sua conexão de rede.';
      return {
        success: false,
        message: hint
      };
    }

    return {
      success: false,
      message: `Erro de conexão: ${errMsg}`
    };
  }

  private async parseErrorBody(response: Response): Promise<string> {
    try {
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        return json.error?.message || json.message || text.slice(0, 200);
      } catch {
        return text.slice(0, 200);
      }
    } catch {
      return response.statusText || 'Erro desconhecido';
    }
  }
}
