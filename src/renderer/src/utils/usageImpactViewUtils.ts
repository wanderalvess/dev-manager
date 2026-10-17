import type { UsageImpact, UsageImpactRow, UsageImpactWindow } from '../../../shared/types';
import {
  normalizeBaselineMinutes,
  type UsageBaselineOverrides
} from '../../../shared/usageBaselines';
import { usageModuleLabel } from '../../../shared/usageActions';
import { buildCsvContent } from './databaseExportUtils';

const MS_PER_MINUTE = 60_000;

/** Tempo economizado: `35 min`, `2 h 05 min`. Abaixo de 1 min aparece `< 1 min` (e `0 min` só quando é zero). */
export function formatSavedTime(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0 min';
  const minutes = Math.round(ms / MS_PER_MINUTE);
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** Parte da economia (0 a 100) que usa tempo informado pela pessoa. `null` quando não há economia. */
export function confirmedShare(window: Pick<UsageImpactWindow, 'savedMs' | 'confirmedMs'>): number | null {
  return window.savedMs > 0 ? Math.round((window.confirmedMs / window.savedMs) * 100) : null;
}

/** Automação já usada cujo tempo manual ainda é o padrão: vale pedir à pessoa que confirme o dela. */
export function needsConfirmation(row: Pick<UsageImpactRow, 'source' | 'okRuns'>): boolean {
  return row.source === 'default' && row.okRuns > 0;
}

/** Texto digitado → minutos válidos. Aceita `12`, `12,5` e `12.5`; vazio ou inválido devolve `null`. */
export function parseMinutesInput(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (cleaned === '' || !/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return normalizeBaselineMinutes(Number(cleaned));
}

/** Registra o tempo manual da pessoa para uma automação (com a data de hoje). Valor inválido não muda nada. */
export function setBaselineOverride(
  overrides: UsageBaselineOverrides | undefined,
  key: string,
  minutes: number,
  today: string
): UsageBaselineOverrides {
  const normalized = normalizeBaselineMinutes(minutes);
  if (normalized === null) return overrides ?? {};
  return { ...(overrides ?? {}), [key]: { minutes: normalized, setAt: today } };
}

/** Volta uma automação ao tempo padrão (remove a sobrescrita). */
export function resetBaselineOverride(overrides: UsageBaselineOverrides | undefined, key: string): UsageBaselineOverrides {
  return Object.fromEntries(Object.entries(overrides ?? {}).filter(([k]) => k !== key));
}

/** `2026-10-16` → `16/10/2026`. */
export function formatBaselineDate(day: string | undefined): string {
  if (!day) return '';
  const [y, m, d] = day.split('-');
  return `${d}/${m}/${y}`;
}

const minutesOf = (ms: number) => Math.round((ms / MS_PER_MINUTE) * 10) / 10;

export const IMPACT_CSV_COLUMNS = [
  'Módulo',
  'Automação',
  'Usos com sucesso',
  'Tempo manual (min)',
  'Origem do tempo manual',
  'Informado em',
  'Tempo real somado (min)',
  'Economia (min)'
] as const;

const DECIMAL_COMMA_COLUMNS = new Set<string>(['Tempo manual (min)', 'Tempo real somado (min)', 'Economia (min)']);

/**
 * CSV "para Excel (Brasil)" da economia por automação, com a origem do tempo manual em cada
 * linha, para quem recebe o arquivo saber o que é medido e o que é estimativa padrão.
 */
export function buildImpactCsv(impact: UsageImpact): string {
  const rows = impact.rows.map((row) => ({
    Módulo: usageModuleLabel(row.module),
    Automação: row.label,
    'Usos com sucesso': row.okRuns,
    'Tempo manual (min)': row.baselineMinutes,
    'Origem do tempo manual': row.source === 'user' ? 'Informado pela pessoa' : 'Padrão (estimativa)',
    'Informado em': formatBaselineDate(row.setAt),
    'Tempo real somado (min)': minutesOf(row.okMs),
    'Economia (min)': minutesOf(row.savedMs)
  }));
  rows.push({
    Módulo: 'TOTAL',
    Automação: '',
    'Usos com sucesso': impact.total.okRuns,
    'Tempo manual (min)': '' as never,
    'Origem do tempo manual': '',
    'Informado em': '',
    'Tempo real somado (min)': minutesOf(impact.rows.reduce((sum, r) => sum + r.okMs, 0)),
    'Economia (min)': minutesOf(impact.total.savedMs)
  });
  return buildCsvContent([...IMPACT_CSV_COLUMNS], rows, {
    delimiter: ';',
    bom: true,
    decimalCommaColumns: DECIMAL_COMMA_COLUMNS
  });
}

export function impactCsvFilename(today: string): string {
  return `meu-impacto-${today}.csv`;
}
