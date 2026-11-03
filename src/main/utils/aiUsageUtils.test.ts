import { describe, expect, it } from 'vitest';
import type { AiUsageRow, LlmProviderConfig } from '../../shared/types';
import { evaluateLimit, sanitizeLimit } from '../../shared/aiUsageLimits';
import {
  buildAiUsageReport,
  estimateCost,
  mergeAiUsageDays,
  normalizeAiUsageStore,
  pruneAiUsageDays,
  tokensOf
} from './aiUsageUtils';

const makeProvider = (over: Partial<LlmProviderConfig> = {}): LlmProviderConfig => ({
  id: 'p1',
  name: 'OpenAI',
  provider: 'openai',
  model: 'gpt-4o-mini',
  enabled: true,
  ...over
});

const makeRow = (over: Partial<AiUsageRow> = {}): AiUsageRow => ({
  providerId: 'p1',
  provider: 'OpenAI',
  model: 'gpt-4o-mini',
  source: 'perguntar-ia',
  calls: 1,
  promptTokens: 100,
  completionTokens: 50,
  totalTokens: 150,
  ...over
});

const NOW = new Date(2026, 10, 15, 12, 0, 0); // 15/11/2026

describe('tokensOf', () => {
  it('usa o total informado, ou soma entrada e saída', () => {
    expect(tokensOf({ promptTokens: 10, completionTokens: 5, totalTokens: 20 }).totalTokens).toBe(20);
    expect(tokensOf({ promptTokens: 10, completionTokens: 5 }).totalTokens).toBe(15);
    expect(tokensOf(undefined)).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 });
  });
});

describe('normalizeAiUsageStore', () => {
  it('descarta campos extras (conteúdo) e normaliza a origem', () => {
    const store = normalizeAiUsageStore({
      schemaVersion: 1,
      days: { '2026-11-15': [{ ...makeRow({ source: 'qualquer-coisa' }), prompt: 'segredo', apiKey: 'sk-x' }] }
    });
    const row = store!.days['2026-11-15'][0];
    expect(row.source).toBe('outros');
    expect(JSON.stringify(store)).not.toContain('segredo');
    expect(JSON.stringify(store)).not.toContain('sk-x');
  });

  it('rejeita versão desconhecida e ignora dias inválidos', () => {
    expect(normalizeAiUsageStore({ schemaVersion: 2, days: {} })).toBeNull();
    expect(normalizeAiUsageStore({ schemaVersion: 1, days: { ontem: [makeRow()] } })!.days).toEqual({});
  });
});

describe('mergeAiUsageDays / pruneAiUsageDays', () => {
  it('soma linhas de mesma chave e mantém as diferentes separadas', () => {
    const target = { '2026-11-15': [makeRow()] };
    mergeAiUsageDays(target, { '2026-11-15': [makeRow(), makeRow({ source: 'mcp' })] });
    expect(target['2026-11-15']).toHaveLength(2);
    expect(target['2026-11-15'][0]).toMatchObject({ calls: 2, totalTokens: 300 });
  });

  it('apaga dias além da retenção', () => {
    const days = { '2024-01-01': [makeRow()], '2026-11-15': [makeRow()] };
    pruneAiUsageDays(days, NOW);
    expect(Object.keys(days)).toEqual(['2026-11-15']);
  });
});

describe('buildAiUsageReport', () => {
  const days = {
    '2026-11-15': [makeRow(), makeRow({ model: 'gpt-4o', source: 'mcp', totalTokens: 1000, promptTokens: 600, completionTokens: 400 })],
    '2026-11-01': [makeRow({ totalTokens: 500 })],
    '2026-08-01': [makeRow({ totalTokens: 9000 })]
  };

  it('filtra por período e agrupa por provedor, modelo e origem', () => {
    const r7 = buildAiUsageReport(days, '7d', NOW, [makeProvider()], true);
    expect(r7.totals.totalTokens).toBe(1150);
    expect(r7.bySource.map((g) => g.key)).toEqual(['mcp', 'perguntar-ia']);
    expect(r7.byModel).toHaveLength(2);
    const r30 = buildAiUsageReport(days, '30d', NOW, [makeProvider()], true);
    expect(r30.totals.totalTokens).toBe(1650);
    expect(buildAiUsageReport(days, 'all', NOW, [makeProvider()], true).totals.totalTokens).toBe(10650);
  });

  it('só estima custo quando o usuário informou o preço', () => {
    expect(buildAiUsageReport(days, '7d', NOW, [makeProvider()], true).costEstimate).toBeUndefined();
    const priced = makeProvider({ priceInPerMillion: 2, priceOutPerMillion: 10 });
    expect(estimateCost({ calls: 1, promptTokens: 1_000_000, completionTokens: 500_000, totalTokens: 1_500_000 }, priced)).toBe(7);
    const report = buildAiUsageReport(days, '7d', NOW, [priced], true);
    expect(report.costEstimate).toBeCloseTo((2 * 700 + 10 * 450) / 1_000_000, 8);
  });

  it('traz o uso do dia e do mês de todos os provedores, com ou sem teto', () => {
    const report = buildAiUsageReport(days, '7d', NOW, [makeProvider({ dailyTokenLimit: 1000 }), makeProvider({ id: 'p2' })], true);
    expect(report.limits).toHaveLength(2);
    expect(report.limits[0]).toMatchObject({ dayUsed: 1150, level: 'blocked' });
    expect(report.limits[1]).toMatchObject({ dayUsed: 0, level: 'ok' });
  });
});

describe('evaluateLimit', () => {
  it('sem teto (vazio, zero ou lixo) nunca avisa nem bloqueia', () => {
    expect(sanitizeLimit(0)).toBeUndefined();
    expect(sanitizeLimit(Number.NaN)).toBeUndefined();
    expect(evaluateLimit(makeProvider({ dailyTokenLimit: 0 }), 9e9, 9e9).level).toBe('ok');
  });

  it('avisa a 80% e bloqueia a 100%, dizendo qual teto', () => {
    const p = makeProvider({ dailyTokenLimit: 1000, monthlyTokenLimit: 10000 });
    expect(evaluateLimit(p, 799, 799).level).toBe('ok');
    const warn = evaluateLimit(p, 800, 800);
    expect(warn.level).toBe('warning');
    expect(warn.message).toContain('diário');
    const blocked = evaluateLimit(p, 1000, 1000);
    expect(blocked.level).toBe('blocked');
    expect(blocked.message).toContain('Teto diário');
    expect(blocked.message).toContain('Como resolver');
    const month = evaluateLimit(p, 10, 10000);
    expect(month.level).toBe('blocked');
    expect(month.message).toContain('Teto mensal');
  });
});
