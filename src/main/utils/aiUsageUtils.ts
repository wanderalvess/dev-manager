import type {
  AiLimitStatus,
  AiUsageDays,
  AiUsageGroup,
  AiUsagePeriod,
  AiUsageReport,
  AiUsageRow,
  AiUsageStore,
  AiUsageTotals,
  LlmProviderConfig
} from '../../shared/types';
import { AI_USAGE_SOURCE_LABELS, normalizeAiUsageSource } from '../../shared/aiUsageTypes';
import { addDays, dayKey, isDayKey } from '../../shared/usageDates';
import { evaluateLimit } from './aiUsageLimits';

/** Dias guardados: o suficiente para "tudo" cobrir mais de um ano sem o arquivo crescer sem fim. */
export const AI_USAGE_RETENTION_DAYS = 400;

const emptyTotals = (): AiUsageTotals => ({ calls: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0 });

const toCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

export function newAiUsageStore(): AiUsageStore {
  return { schemaVersion: 1, days: {} };
}

/** Aceita só o que tem o formato esperado; qualquer outro campo (inclusive texto) é descartado. */
export function normalizeAiUsageStore(raw: unknown): AiUsageStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as { schemaVersion?: unknown; days?: unknown };
  if (input.schemaVersion !== 1 || !input.days || typeof input.days !== 'object') return null;
  const days: AiUsageDays = {};
  for (const [day, rows] of Object.entries(input.days as Record<string, unknown>)) {
    if (!isDayKey(day) || !Array.isArray(rows)) continue;
    const clean: AiUsageRow[] = [];
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (typeof r.providerId !== 'string' || typeof r.model !== 'string') continue;
      mergeRow(clean, {
        providerId: r.providerId,
        provider: typeof r.provider === 'string' ? r.provider : r.providerId,
        model: r.model,
        source: normalizeAiUsageSource(r.source),
        calls: toCount(r.calls),
        promptTokens: toCount(r.promptTokens),
        completionTokens: toCount(r.completionTokens),
        totalTokens: toCount(r.totalTokens)
      });
    }
    if (clean.length) days[day] = clean;
  }
  return { schemaVersion: 1, days };
}

/** Soma `row` na linha de mesma chave (provedor + modelo + origem), ou acrescenta. */
export function mergeRow(rows: AiUsageRow[], row: AiUsageRow): void {
  const found = rows.find((r) => r.providerId === row.providerId && r.model === row.model && r.source === row.source);
  if (!found) {
    rows.push({ ...row });
    return;
  }
  found.provider = row.provider;
  found.calls += row.calls;
  found.promptTokens += row.promptTokens;
  found.completionTokens += row.completionTokens;
  found.totalTokens += row.totalTokens;
}

export function mergeAiUsageDays(target: AiUsageDays, delta: AiUsageDays): void {
  for (const [day, rows] of Object.entries(delta)) {
    const list = (target[day] ??= []);
    rows.forEach((row) => mergeRow(list, row));
  }
}

export function pruneAiUsageDays(days: AiUsageDays, now: Date): void {
  const oldest = addDays(dayKey(now), -AI_USAGE_RETENTION_DAYS);
  Object.keys(days).forEach((day) => {
    if (day < oldest) delete days[day];
  });
}

/** Tokens de uma chamada. Quando o provedor só informa o total, ele fica no total. */
export function tokensOf(usage: { promptTokens?: number; completionTokens?: number; totalTokens?: number } | undefined) {
  const promptTokens = toCount(usage?.promptTokens);
  const completionTokens = toCount(usage?.completionTokens);
  const totalTokens = toCount(usage?.totalTokens) || promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

function sumRows(rows: AiUsageRow[], into: AiUsageTotals): void {
  for (const r of rows) {
    into.calls += r.calls;
    into.promptTokens += r.promptTokens;
    into.completionTokens += r.completionTokens;
    into.totalTokens += r.totalTokens;
  }
}

/** Soma de um provedor num dia (`prefix` = AAAA-MM-DD) ou num mês (`prefix` = AAAA-MM). */
export function tokensForProvider(days: AiUsageDays, providerId: string, prefix: string): number {
  let total = 0;
  for (const [day, rows] of Object.entries(days)) {
    if (!day.startsWith(prefix)) continue;
    for (const r of rows) if (r.providerId === providerId) total += r.totalTokens;
  }
  return total;
}

export function periodStart(period: AiUsagePeriod, now: Date): string | null {
  if (period === 'all') return null;
  return addDays(dayKey(now), period === '7d' ? -6 : -29);
}

/** Custo estimado com o preço informado pelo usuário; sem preço, não há estimativa. */
export function estimateCost(row: AiUsageTotals, provider: LlmProviderConfig | undefined): number | undefined {
  const priceIn = provider?.priceInPerMillion;
  const priceOut = provider?.priceOutPerMillion;
  if (!(priceIn! >= 0) && !(priceOut! >= 0)) return undefined;
  return ((priceIn ?? 0) * row.promptTokens + (priceOut ?? 0) * row.completionTokens) / 1_000_000;
}

type GroupAcc = AiUsageGroup & { cost: number; hasCost: boolean };

export function buildAiUsageReport(
  days: AiUsageDays,
  period: AiUsagePeriod,
  now: Date,
  providers: LlmProviderConfig[],
  enabled: boolean
): AiUsageReport {
  const from = periodStart(period, now);
  const byId = new Map(providers.map((p) => [p.id, p]));
  const totals = emptyTotals();
  const groups = { provider: new Map<string, GroupAcc>(), model: new Map<string, GroupAcc>(), source: new Map<string, GroupAcc>() };
  let cost = 0;
  let hasCost = false;

  const add = (map: Map<string, GroupAcc>, key: string, label: string, row: AiUsageRow, rowCost: number | undefined) => {
    const g = map.get(key) ?? { key, label, ...emptyTotals(), cost: 0, hasCost: false };
    sumRows([row], g);
    if (rowCost !== undefined) {
      g.cost += rowCost;
      g.hasCost = true;
    }
    map.set(key, g);
  };

  for (const [day, rows] of Object.entries(days)) {
    if (from && day < from) continue;
    sumRows(rows, totals);
    for (const row of rows) {
      const rowCost = estimateCost(row, byId.get(row.providerId));
      if (rowCost !== undefined) {
        cost += rowCost;
        hasCost = true;
      }
      add(groups.provider, row.providerId, byId.get(row.providerId)?.name ?? row.provider, row, rowCost);
      add(groups.model, `${row.providerId}|${row.model}`, `${row.model} (${row.provider})`, row, rowCost);
      add(groups.source, row.source, AI_USAGE_SOURCE_LABELS[row.source] ?? row.source, row, rowCost);
    }
  }

  const finish = (map: Map<string, GroupAcc>): AiUsageGroup[] =>
    [...map.values()]
      .sort((a, b) => b.totalTokens - a.totalTokens)
      .map(({ cost: c, hasCost: h, ...g }) => (h ? { ...g, costEstimate: c } : g));

  return {
    enabled,
    period,
    totals,
    ...(hasCost ? { costEstimate: cost } : {}),
    byProvider: finish(groups.provider),
    byModel: finish(groups.model),
    bySource: finish(groups.source),
    limits: providers.map((p) => limitStatusFor(days, p, now)).filter((s) => s.dayLimit || s.monthLimit)
  };
}

export function limitStatusFor(days: AiUsageDays, provider: LlmProviderConfig, now: Date): AiLimitStatus {
  const today = dayKey(now);
  return evaluateLimit(
    provider,
    tokensForProvider(days, provider.id, today),
    tokensForProvider(days, provider.id, today.slice(0, 7))
  );
}
