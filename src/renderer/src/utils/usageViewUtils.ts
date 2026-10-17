import type { UsageSummary, UsageSummaryQuery, UsageWeekTotal } from '../../../shared/types';
import { addDays, dayKey, weekStartOf } from '../../../shared/usageDates';

export type UsageRange = '7d' | '30d' | 'all';

export const USAGE_RANGES: { id: UsageRange; label: string }[] = [
  { id: '7d', label: 'Últimos 7 dias' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: 'all', label: 'Tudo' }
];

/** Período escolhido na tela → filtro do resumo. "Tudo" não manda datas. */
export function rangeToQuery(range: UsageRange, now: Date = new Date()): UsageSummaryQuery {
  if (range === 'all') return {};
  const today = dayKey(now);
  return { from: addDays(today, range === '7d' ? -6 : -29), to: today };
}

/** Taxa de sucesso (0 a 100, inteiro) ou `null` quando ainda não há execuções. */
export function successRate(ok: number, runs: number): number | null {
  return runs > 0 ? Math.round((ok / runs) * 100) : null;
}

/** Duração legível: 850 ms, 12,3 s, 4 min 05 s, 1 h 20 min. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 s';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1).replace('.', ',')} s`;
  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min ${String(totalSeconds % 60).padStart(2, '0')} s`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/**
 * Últimas `count` semanas terminando na semana de `now`, preenchendo com 0 as semanas sem uso.
 * Assim o gráfico mostra o buraco em vez de juntar semanas distantes lado a lado.
 */
export function lastWeeks(byWeek: UsageWeekTotal[], count: number, now: Date = new Date()): UsageWeekTotal[] {
  const known = new Map(byWeek.map((w) => [w.weekStart, w.runs]));
  const current = weekStartOf(dayKey(now));
  return Array.from({ length: count }, (_, i) => {
    const weekStart = addDays(current, -7 * (count - 1 - i));
    return { weekStart, runs: known.get(weekStart) ?? 0 };
  });
}

/** "2026-10-12" → "12/10". */
export function formatWeekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split('-');
  return `${d}/${m}`;
}

/** Primeiros 8 caracteres do ID da instalação, para exibir sem ocupar a tela. */
export function shortInstallId(installId: string): string {
  return installId ? installId.slice(0, 8) : '—';
}

/** Largura (0 a 100) de uma barra proporcional ao maior valor da lista. */
export function barPercent(value: number, max: number): number {
  return max > 0 ? Math.max(value > 0 ? 3 : 0, Math.round((value / max) * 100)) : 0;
}

export function hasUsage(summary: UsageSummary | null): boolean {
  return Boolean(summary && summary.totalRuns > 0);
}
