import type {
  UsageCounter,
  UsageDays,
  UsageEvent,
  UsageMetricsStore,
  UsageModuleTotal,
  UsageOrigin,
  UsageRisk,
  UsageSummary,
  UsageSummaryQuery,
  UsageSummaryRow,
  UsageWeekTotal
} from '../../shared/usageMetricsTypes';
import { dayKey, isDayKey, weekStartOf } from '../../shared/usageDates';

// Reexporta: quem já importava daqui continua funcionando.
export { dayKey, isDayKey, weekStartOf };

/**
 * Lógica pura das métricas de uso (épico #11, issue #12): validação, agregação e resumo.
 * O arquivo e o lock ficam no UsageMetricsService; aqui nada toca disco.
 *
 * Privacidade: módulo e ação precisam bater com SEGMENT_PATTERN (minúsculas, números, `-` e
 * `_`). Qualquer outra coisa é DESCARTADA, não "limpa" — um caminho, SQL ou e-mail passado por
 * engano não tem como virar chave.
 */

export const USAGE_SCHEMA_VERSION = 1 as const;

const SEGMENT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const ORIGINS: readonly UsageOrigin[] = ['ui', 'rest', 'mcp'];
const RISKS: readonly UsageRisk[] = ['read', 'write', 'destructive'];

/** Duração máxima aceita por evento (24 h). Evita um relógio quebrado distorcer a soma. */
export const MAX_EVENT_DURATION_MS = 24 * 60 * 60 * 1000;
/** Quantos dias o arquivo guarda. Acima disso os dias mais antigos são apagados. */
export const USAGE_RETENTION_DAYS = 400;

export function isUsageSegment(value: unknown): value is string {
  return typeof value === 'string' && SEGMENT_PATTERN.test(value);
}

export function isUsageOrigin(value: unknown): value is UsageOrigin {
  return typeof value === 'string' && (ORIGINS as readonly string[]).includes(value);
}

export function isUsageRisk(value: unknown): value is UsageRisk {
  return typeof value === 'string' && (RISKS as readonly string[]).includes(value);
}

export function buildUsageKey(module: string, action: string, origin: UsageOrigin): string {
  return `${module}/${action}/${origin}`;
}

export function parseUsageKey(key: string): { module: string; action: string; origin: UsageOrigin } | null {
  const parts = key.split('/');
  if (parts.length !== 3) return null;
  const [module, action, origin] = parts;
  if (!isUsageSegment(module) || !isUsageSegment(action) || !isUsageOrigin(origin)) return null;
  return { module, action, origin };
}

export function normalizeDuration(durationMs: unknown): number {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs < 0) return 0;
  return Math.min(Math.round(durationMs), MAX_EVENT_DURATION_MS);
}

export function emptyCounter(): UsageCounter {
  return { runs: 0, ok: 0, failed: 0, totalMs: 0 };
}

/**
 * Soma um evento em `days` (muta o objeto). Devolve `false` e não grava nada se o evento for
 * inválido (módulo/ação fora do padrão ou origem desconhecida).
 */
export function addEventToDays(days: UsageDays, event: UsageEvent, now: Date = new Date()): boolean {
  if (!isUsageSegment(event.module) || !isUsageSegment(event.action) || !isUsageOrigin(event.origin)) {
    return false;
  }
  const day = dayKey(now);
  const key = buildUsageKey(event.module, event.action, event.origin);
  const bucket = (days[day] ??= {});
  const counter = (bucket[key] ??= emptyCounter());
  counter.runs += 1;
  if (event.ok) counter.ok += 1;
  else counter.failed += 1;
  counter.totalMs += normalizeDuration(event.durationMs);
  if (isUsageRisk(event.risk)) counter.risk = event.risk;
  return true;
}

/** Soma `source` em `target` (muta `target`). A soma é comutativa: a ordem dos merges não importa. */
export function mergeDays(target: UsageDays, source: UsageDays): void {
  for (const [day, bucket] of Object.entries(source)) {
    const targetBucket = (target[day] ??= {});
    for (const [key, counter] of Object.entries(bucket)) {
      const existing = (targetBucket[key] ??= emptyCounter());
      existing.runs += counter.runs;
      existing.ok += counter.ok;
      existing.failed += counter.failed;
      existing.totalMs += counter.totalMs;
      if (counter.risk) existing.risk = counter.risk;
    }
  }
}

/**
 * Decide se o retorno de uma ação conta como falha sem lançar erro. Vários handlers respondem
 * `{ success: false }` ou `{ ok: false }` em vez de lançar; tratar isso como sucesso inflaria o
 * "ok" das métricas.
 */
export function resultIndicatesFailure(result: unknown): boolean {
  if (!result || typeof result !== 'object') return false;
  const r = result as Record<string, unknown>;
  return r.success === false || r.ok === false || r.isError === true;
}

export function hasAnyDay(days: UsageDays): boolean {
  return Object.keys(days).length > 0;
}

/** Remove dias mais antigos que `retentionDays` (muta `days`). */
export function pruneDays(days: UsageDays, now: Date = new Date(), retentionDays = USAGE_RETENTION_DAYS): void {
  const limit = new Date(now);
  limit.setDate(limit.getDate() - retentionDays);
  const oldest = dayKey(limit);
  for (const day of Object.keys(days)) {
    if (day < oldest) delete days[day];
  }
}

function toCount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

/**
 * Valida o conteúdo lido do disco. Descarta o que estiver fora do padrão (arquivo editado à mão,
 * versão futura, corrupção parcial) em vez de quebrar. Devolve `null` se nem o cabeçalho serve.
 */
export function normalizeStore(raw: unknown): UsageMetricsStore | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== USAGE_SCHEMA_VERSION) return null;
  if (typeof obj.installId !== 'string' || !/^[0-9a-f-]{16,64}$/i.test(obj.installId)) return null;

  const days: UsageDays = {};
  const rawDays = obj.days && typeof obj.days === 'object' ? (obj.days as Record<string, unknown>) : {};
  for (const [day, bucket] of Object.entries(rawDays)) {
    if (!isDayKey(day) || !bucket || typeof bucket !== 'object') continue;
    for (const [key, value] of Object.entries(bucket as Record<string, unknown>)) {
      if (!parseUsageKey(key) || !value || typeof value !== 'object') continue;
      const c = value as Record<string, unknown>;
      const runs = toCount(c.runs);
      const ok = toCount(c.ok);
      const failed = toCount(c.failed);
      const totalMs = toCount(c.totalMs);
      if (runs === null || ok === null || failed === null || totalMs === null) continue;
      const counter: UsageCounter = { runs, ok, failed, totalMs };
      if (isUsageRisk(c.risk)) counter.risk = c.risk;
      (days[day] ??= {})[key] = counter;
    }
  }

  return {
    schemaVersion: USAGE_SCHEMA_VERSION,
    installId: obj.installId,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date(0).toISOString(),
    days
  };
}

/** Resume o que está em `store` dentro do período (dias inclusivos). */
export function summarizeUsage(
  store: Pick<UsageMetricsStore, 'installId' | 'days'>,
  query: UsageSummaryQuery = {},
  enabled = true
): UsageSummary {
  const from = isDayKey(query.from) ? query.from : null;
  const to = isDayKey(query.to) ? query.to : null;

  const rowsByKey = new Map<string, UsageSummaryRow>();
  const modules = new Map<string, UsageModuleTotal>();
  const weeks = new Map<string, number>();
  let firstDay: string | null = null;
  let lastDay: string | null = null;
  let totalRuns = 0;
  let totalOk = 0;
  let totalFailed = 0;

  for (const day of Object.keys(store.days).sort()) {
    if ((from && day < from) || (to && day > to)) continue;
    let dayHasData = false;
    for (const [key, counter] of Object.entries(store.days[day])) {
      const parsed = parseUsageKey(key);
      if (!parsed) continue;
      dayHasData = true;

      const row =
        rowsByKey.get(key) ??
        ({ ...parsed, runs: 0, ok: 0, failed: 0, totalMs: 0, avgMs: 0 } as UsageSummaryRow);
      row.runs += counter.runs;
      row.ok += counter.ok;
      row.failed += counter.failed;
      row.totalMs += counter.totalMs;
      if (counter.risk) row.risk = counter.risk;
      rowsByKey.set(key, row);

      const mod = modules.get(parsed.module) ?? { module: parsed.module, runs: 0, ok: 0, failed: 0, totalMs: 0 };
      mod.runs += counter.runs;
      mod.ok += counter.ok;
      mod.failed += counter.failed;
      mod.totalMs += counter.totalMs;
      modules.set(parsed.module, mod);

      const week = weekStartOf(day);
      weeks.set(week, (weeks.get(week) ?? 0) + counter.runs);

      totalRuns += counter.runs;
      totalOk += counter.ok;
      totalFailed += counter.failed;
    }
    if (dayHasData) {
      firstDay ??= day;
      lastDay = day;
    }
  }

  const rows = [...rowsByKey.values()]
    .map((r) => ({ ...r, avgMs: r.runs > 0 ? Math.round(r.totalMs / r.runs) : 0 }))
    .sort((a, b) => b.runs - a.runs || a.module.localeCompare(b.module) || a.action.localeCompare(b.action));
  const byModule = [...modules.values()].sort((a, b) => b.runs - a.runs || a.module.localeCompare(b.module));
  const byWeek: UsageWeekTotal[] = [...weeks.entries()]
    .map(([weekStart, runs]) => ({ weekStart, runs }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  return {
    enabled,
    installId: store.installId,
    firstDay,
    lastDay,
    totalRuns,
    totalOk,
    totalFailed,
    byModule,
    byWeek,
    rows
  };
}
