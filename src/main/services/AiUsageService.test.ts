import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LlmProviderConfig } from '../../shared/types';
import { AiUsageService } from './AiUsageService';
import { LlmService } from './LlmService';

const makeProvider = (over: Partial<LlmProviderConfig> = {}): LlmProviderConfig => ({
  id: 'p1',
  name: 'OpenAI Test',
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: 'sk-secret-key',
  enabled: true,
  ...over
});

describe('AiUsageService + LlmService', () => {
  let dir: string;
  let provider: LlmProviderConfig;
  let metricsEnabled: boolean;
  let config: any;
  const NOW = new Date(2026, 10, 15, 12, 0, 0);

  const fetchOk = (total: number) =>
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        model: 'gpt-4o-mini',
        choices: [{ message: { content: 'resposta confidencial' } }],
        usage: { prompt_tokens: total - 10, completion_tokens: 10, total_tokens: total }
      })
    });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-usage-'));
    provider = makeProvider();
    metricsEnabled = true;
    config = {
      getSettings: () => ({ llmProviders: [provider], activeLlmProviderId: provider.id, usageMetricsEnabled: metricsEnabled })
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const build = () => {
    const usage = new AiUsageService(config, { dir, now: () => NOW });
    return { usage, llm: new LlmService(config, undefined, usage) };
  };
  const ask = (llm: LlmService, source?: string) =>
    llm.chat({ messages: [{ role: 'user', content: 'pergunta confidencial' }], source });

  it('registra tokens, provedor, modelo e origem — sem prompt, resposta ou chave', async () => {
    vi.stubGlobal('fetch', fetchOk(150));
    const { usage, llm } = build();
    await ask(llm, 'diagnostico-http');
    const report = usage.getReport('7d');
    expect(report.totals).toMatchObject({ calls: 1, totalTokens: 150, promptTokens: 140, completionTokens: 10 });
    expect(report.bySource[0].key).toBe('diagnostico-http');
    expect(report.byProvider[0].label).toBe('OpenAI Test');
    const raw = fs.readFileSync(path.join(dir, 'ai-usage.json'), 'utf-8');
    expect(raw).not.toContain('confidencial');
    expect(raw).not.toContain('sk-secret-key');
  });

  it('origem desconhecida vira "outros"', async () => {
    vi.stubGlobal('fetch', fetchOk(20));
    const { usage, llm } = build();
    await ask(llm, 'inventada');
    expect(usage.getReport('7d').bySource[0].key).toBe('outros');
  });

  it('não registra nada com a contagem de uso desligada', async () => {
    metricsEnabled = false;
    vi.stubGlobal('fetch', fetchOk(150));
    const { usage, llm } = build();
    await ask(llm);
    expect(usage.getReport('all').totals.totalTokens).toBe(0);
    expect(usage.getReport('all').enabled).toBe(false);
  });

  it('avisa a 80% do teto e bloqueia ao atingir, sem chamar o provedor', async () => {
    provider = makeProvider({ dailyTokenLimit: 1000 });
    const fetchMock = fetchOk(800);
    vi.stubGlobal('fetch', fetchMock);
    const { llm } = build();

    const first = await ask(llm);
    expect(first.usageWarning).toContain('80%');

    vi.stubGlobal('fetch', fetchOk(300));
    const second = await ask(llm);
    expect(second.usageWarning).toContain('Teto diário');

    const blockedFetch = fetchOk(10);
    vi.stubGlobal('fetch', blockedFetch);
    await expect(ask(llm)).rejects.toThrow(/Teto diário de uso de IA atingido.*Como resolver/s);
    expect(blockedFetch).not.toHaveBeenCalled();
  });

  it('bloqueia também pelo teto mensal, somando dias anteriores do mês', async () => {
    provider = makeProvider({ monthlyTokenLimit: 500 });
    vi.stubGlobal('fetch', fetchOk(500));
    const early = new AiUsageService(config, { dir, now: () => new Date(2026, 10, 2) });
    early.record(provider, { text: '', provider: 'x', model: 'm', usage: { totalTokens: 500 } });
    const { llm } = build();
    await expect(ask(llm)).rejects.toThrow(/Teto mensal/);
  });

  it('Anthropic: a recusa 400 de temperature não conta; os tokens da repetição sim', async () => {
    provider = makeProvider({ provider: 'anthropic', model: 'claude-sonnet-5-5' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => JSON.stringify({ error: { message: '`temperature` is deprecated for this model' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ model: 'claude-sonnet-5-5', content: [{ text: 'ok' }], usage: { input_tokens: 30, output_tokens: 12 } })
      });
    vi.stubGlobal('fetch', fetchMock);
    const { usage, llm } = build();
    await ask(llm, 'ia-conduz');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const report = usage.getReport('7d');
    expect(report.totals).toMatchObject({ calls: 1, totalTokens: 42 });
    expect(report.bySource[0].key).toBe('ia-conduz');
  });

  it('sem teto, nunca bloqueia (ex.: Ollama local)', async () => {
    provider = makeProvider({ provider: 'ollama', apiKey: '' });
    vi.stubGlobal('fetch', fetchOk(9_000_000));
    const { llm } = build();
    await ask(llm);
    await expect(ask(llm)).resolves.toBeTruthy();
  });

  it('limpar apaga o histórico', async () => {
    vi.stubGlobal('fetch', fetchOk(50));
    const { usage, llm } = build();
    await ask(llm);
    usage.clear();
    expect(usage.getReport('all').totals.totalTokens).toBe(0);
  });
});
