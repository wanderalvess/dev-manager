import type {
  UsageDays,
  UsageImpact,
  UsageImpactRow,
  UsageImpactWindow
} from './usageMetricsTypes';
import { addDays, dayKey } from './usageDates';
import { parseUsageKey } from './usageKeys';
import {
  USAGE_BASELINE_DEFINITIONS,
  baselineKeyFor,
  getBaselineDefinition,
  resolveBaseline,
  type UsageBaselineOverrides
} from './usageBaselines';

/** Dias da janela "semana" e "mês", contando hoje (iguais aos períodos de 7 e 30 dias de Meu uso). */
export const IMPACT_WEEK_DAYS = 7;
export const IMPACT_MONTH_DAYS = 30;

const MS_PER_MINUTE = 60_000;

/**
 * Tempo economizado por um conjunto de usos com sucesso:
 *
 *   economia = max(0, usos × tempo manual − tempo real somado)
 *
 * O `max(0, …)` vale por conjunto (um dia, uma ação, uma origem), nunca por uso: um dia com um uso
 * lento compensa parte da economia dos rápidos. Isso é CONSERVADOR — nunca passa do que a conta
 * uso a uso daria — e nunca é negativo. Falhas não entram: não economizaram nada.
 */
export function savedMsFor(okRuns: number, okMs: number, baselineMinutes: number): number {
  if (okRuns <= 0 || baselineMinutes <= 0) return 0;
  return Math.max(0, Math.round(okRuns * baselineMinutes * MS_PER_MINUTE - okMs));
}

const emptyWindow = (): UsageImpactWindow & { modules: Map<string, number> } => ({
  savedMs: 0,
  confirmedMs: 0,
  okRuns: 0,
  byModule: [],
  modules: new Map()
});

function finish(window: ReturnType<typeof emptyWindow>): UsageImpactWindow {
  const byModule = [...window.modules.entries()]
    .map(([module, savedMs]) => ({ module, savedMs }))
    .sort((a, b) => b.savedMs - a.savedMs || a.module.localeCompare(b.module));
  return { savedMs: window.savedMs, confirmedMs: window.confirmedMs, okRuns: window.okRuns, byModule };
}

/**
 * Calcula a economia a partir dos contadores por dia e das linhas de base da pessoa. Função pura,
 * usada no main (tool MCP, REST) e na interface (prévia com valores ainda não salvos).
 */
export function computeImpact(days: UsageDays, overrides: UsageBaselineOverrides, now: Date = new Date()): UsageImpact {
  const today = dayKey(now);
  const weekFrom = addDays(today, -(IMPACT_WEEK_DAYS - 1));
  const monthFrom = addDays(today, -(IMPACT_MONTH_DAYS - 1));

  const windows = { week: emptyWindow(), month: emptyWindow(), total: emptyWindow() };
  const rows = new Map<string, UsageImpactRow>();
  for (const definition of USAGE_BASELINE_DEFINITIONS) {
    const baseline = resolveBaseline(definition.key, overrides);
    if (!baseline) continue;
    rows.set(definition.key, {
      key: definition.key,
      module: definition.module,
      label: definition.label,
      baselineMinutes: baseline.minutes,
      source: baseline.source,
      ...(baseline.setAt ? { setAt: baseline.setAt } : {}),
      okRuns: 0,
      okMs: 0,
      savedMs: 0
    });
  }

  for (const [day, bucket] of Object.entries(days)) {
    for (const [counterKey, counter] of Object.entries(bucket)) {
      const parsed = parseUsageKey(counterKey);
      if (!parsed || counter.ok <= 0) continue;
      const key = baselineKeyFor(parsed.module, parsed.action, parsed.origin);
      const row = key ? rows.get(key) : undefined;
      const definition = key ? getBaselineDefinition(key) : undefined;
      if (!row || !definition) continue;

      const saved = savedMsFor(counter.ok, counter.okMs, row.baselineMinutes);
      row.okRuns += counter.ok;
      row.okMs += counter.okMs;
      row.savedMs += saved;

      const inWindows = [windows.total];
      if (day >= monthFrom && day <= today) inWindows.push(windows.month);
      if (day >= weekFrom && day <= today) inWindows.push(windows.week);
      for (const w of inWindows) {
        w.savedMs += saved;
        if (row.source === 'user') w.confirmedMs += saved;
        w.okRuns += counter.ok;
        w.modules.set(definition.module, (w.modules.get(definition.module) ?? 0) + saved);
      }
    }
  }

  return {
    today,
    week: finish(windows.week),
    month: finish(windows.month),
    total: finish(windows.total),
    rows: [...rows.values()]
  };
}
