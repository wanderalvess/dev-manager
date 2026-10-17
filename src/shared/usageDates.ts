/**
 * Datas das métricas de uso. Ficam em `shared` porque a interface (renderer) e o armazenamento
 * (main) precisam concordar exatamente sobre o que é "dia" e "semana": dia local no formato
 * AAAA-MM-DD, semana começando na segunda-feira.
 */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Dia no fuso local (AAAA-MM-DD). */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isDayKey(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

/** Segunda-feira (AAAA-MM-DD) da semana do dia informado. */
export function weekStartOf(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const sinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - sinceMonday);
  return date.toISOString().slice(0, 10);
}

/** Soma `days` ao dia informado (pode ser negativo). */
export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
