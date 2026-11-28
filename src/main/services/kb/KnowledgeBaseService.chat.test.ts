import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '../ConfigService';
import { KnowledgeBaseService } from './KnowledgeBaseService';
import { KB_NOT_FOUND_ANSWER } from '../../../shared/knowledgeBaseChat';
import type { KbAskResponse } from '../../../shared/knowledgeBaseTypes';

const config = {
  getSettings: () => ({ knowledgeBase: { enabled: true, baseUrl: 'http://127.0.0.1:9', apiKey: 'k' } }),
  getConfigFilePath: () => 'C:/tmp/nao-existe/config.json'
} as unknown as ConfigService;

const askResponse = (over: Partial<KbAskResponse> = {}): KbAskResponse => ({
  provider: 'none',
  mode: 'hybrid',
  answerable: true,
  mixedSources: false,
  systemPrompt: 'SIS',
  userPrompt: 'PERGUNTA [1] trecho',
  citations: [{ n: 1, chunkId: 'c1', documentId: 'd1', docType: 'api_doc', externalId: 'x', title: 'Doc' }],
  ...over
});

function build(ask: KbAskResponse) {
  const llm = { chat: vi.fn(async (_req: { messages: Array<{ role: string; content: string }> }) => ({ text: 'Resposta [1]', provider: 'Claude', model: 'm1' })) };
  const service = new KnowledgeBaseService(config, llm);
  vi.spyOn(service, 'ask').mockResolvedValue(ask);
  return { service, llm };
}

describe('KnowledgeBaseService.chat', () => {
  it('responde com o LLM usando o prompt do servidor e devolve as citações', async () => {
    const { service, llm } = build(askResponse({ mixedSources: true }));
    const res = await service.chat({ question: ' Como salvar? ', history: [{ role: 'user', content: 'oi' }] });

    expect(res).toMatchObject({ answer: 'Resposta [1]', answerable: true, mixedSources: true, provider: 'Claude', model: 'm1' });
    expect(res.citations).toHaveLength(1);
    const call = llm.chat.mock.calls[0][0];
    expect(call.messages.map((m) => m.role)).toEqual(['system', 'user', 'user']);
    expect(call.messages[0].content).toContain('divergência');
    expect(service.ask).toHaveBeenCalledWith(expect.objectContaining({ question: 'Como salvar?' }));
  });

  it('sem trechos não chama o LLM e diz que não encontrou', async () => {
    const { service, llm } = build(askResponse({ answerable: false, citations: [] }));
    const res = await service.chat({ question: 'algo' });
    expect(res).toMatchObject({ answer: KB_NOT_FOUND_ANSWER, answerable: false });
    expect(llm.chat).not.toHaveBeenCalled();
  });

  it('recusa pergunta vazia e modo sem motor de IA', async () => {
    const { service } = build(askResponse());
    await expect(service.chat({ question: '   ' })).rejects.toThrow(/vazia/);
    const semLlm = new KnowledgeBaseService(config);
    await expect(semLlm.chat({ question: 'oi' })).rejects.toThrow(/motor de IA/);
  });
});
