import { describe, expect, it } from 'vitest';
import { buildChatMessages, trimHistory } from './knowledgeBaseChat';

const ask = { systemPrompt: 'SIS', userPrompt: 'PERGUNTA com fontes', mixedSources: false };

describe('trimHistory', () => {
  it('mantém só as 6 últimas, descarta vazias e corta as muito longas', () => {
    const turns = Array.from({ length: 10 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${i}` }));
    turns.push({ role: 'user', content: '   ' });
    const out = trimHistory(turns);
    expect(out.map((t) => t.content)).toEqual(['m4', 'm5', 'm6', 'm7', 'm8', 'm9']);
    expect(trimHistory([{ role: 'user', content: 'x'.repeat(5000) }])[0].content).toHaveLength(2000);
    expect(trimHistory(undefined)).toEqual([]);
  });
});

describe('buildChatMessages', () => {
  it('monta system, histórico e a pergunta com as fontes', () => {
    const msgs = buildChatMessages(ask, [{ role: 'user', content: 'oi' }, { role: 'assistant', content: 'olá' }]);
    expect(msgs.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(msgs[0].content).toContain('SIS');
    expect(msgs[0].content).toContain('[n]');
    expect(msgs[3].content).toBe('PERGUNTA com fontes');
  });

  it('só pede a comparação das duas versões quando há código e TDN juntos', () => {
    expect(buildChatMessages(ask)[0].content).not.toContain('divergência');
    expect(buildChatMessages({ ...ask, mixedSources: true })[0].content).toContain('divergência');
  });
});
