import { describe, expect, it } from 'vitest';
import type { UsageCounter, UsageDays } from '../../../shared/usageMetricsTypes';
import { computeImpact } from '../../../shared/usageImpact';
import { USAGE_BASELINE_DEFINITIONS } from '../../../shared/usageBaselines';
import {
  IMPACT_CSV_COLUMNS,
  buildImpactCsv,
  confirmedShare,
  formatBaselineDate,
  formatSavedTime,
  impactCsvFilename,
  needsConfirmation,
  parseMinutesInput,
  resetBaselineOverride,
  setBaselineOverride
} from './usageImpactViewUtils';

const NOW = new Date(2026, 9, 16, 12);
const counter = (partial: Partial<UsageCounter>): UsageCounter => ({ runs: 0, ok: 0, failed: 0, totalMs: 0, okMs: 0, ...partial });

describe('formatSavedTime', () => {
  it.each([
    [0, '0 min'],
    [-1, '0 min'],
    [Number.NaN, '0 min'],
    [20_000, '< 1 min'],
    [35 * 60_000, '35 min'],
    [59 * 60_000 + 40_000, '1 h 00 min'],
    [125 * 60_000, '2 h 05 min'],
    [10 * 60 * 60_000, '10 h 00 min']
  ])('%s ms → %s', (ms, esperado) => {
    expect(formatSavedTime(ms)).toBe(esperado);
  });
});

describe('confirmedShare', () => {
  it('é a fração da economia baseada em tempo informado', () => {
    expect(confirmedShare({ savedMs: 200, confirmedMs: 50 })).toBe(25);
    expect(confirmedShare({ savedMs: 100, confirmedMs: 100 })).toBe(100);
  });

  it('sem economia não há fração', () => {
    expect(confirmedShare({ savedMs: 0, confirmedMs: 0 })).toBeNull();
  });
});

describe('needsConfirmation', () => {
  it('só quando já foi usada e o tempo ainda é o padrão', () => {
    expect(needsConfirmation({ source: 'default', okRuns: 3 })).toBe(true);
    expect(needsConfirmation({ source: 'default', okRuns: 0 })).toBe(false);
    expect(needsConfirmation({ source: 'user', okRuns: 3 })).toBe(false);
  });
});

describe('parseMinutesInput', () => {
  it.each([
    ['12', 12],
    ['12,5', 12.5],
    ['12.5', 12.5],
    [' 7 ', 7],
    ['0', 0],
    ['1440', 1440]
  ])('"%s" → %s', (text, esperado) => {
    expect(parseMinutesInput(text)).toBe(esperado);
  });

  it.each(['', '  ', 'abc', '-5', '1e3', '12,5,3', '1441', '10 min'])('recusa "%s"', (text) => {
    expect(parseMinutesInput(text)).toBeNull();
  });
});

describe('setBaselineOverride / resetBaselineOverride', () => {
  it('grava minutos e a data de hoje sem mexer nas outras chaves', () => {
    const before = { 'qa/taut-run-tests': { minutes: 12 } };
    const after = setBaselineOverride(before, 'database/backup-run', 25, '2026-10-16');
    expect(after).toEqual({ 'qa/taut-run-tests': { minutes: 12 }, 'database/backup-run': { minutes: 25, setAt: '2026-10-16' } });
    expect(before).toEqual({ 'qa/taut-run-tests': { minutes: 12 } }); // não muta
  });

  it('funciona a partir de nada e aceita zero', () => {
    expect(setBaselineOverride(undefined, 'database/backup-run', 0, '2026-10-16')).toEqual({
      'database/backup-run': { minutes: 0, setAt: '2026-10-16' }
    });
  });

  it('valor inválido não muda nada', () => {
    const before = { 'qa/taut-run-tests': { minutes: 12 } };
    expect(setBaselineOverride(before, 'qa/taut-run-tests', -4, '2026-10-16')).toBe(before);
    expect(setBaselineOverride(undefined, 'qa/taut-run-tests', Number.NaN, '2026-10-16')).toEqual({});
  });

  it('restaurar o padrão remove só aquela chave', () => {
    const before = { 'qa/taut-run-tests': { minutes: 12 }, 'database/backup-run': { minutes: 25 } };
    expect(resetBaselineOverride(before, 'database/backup-run')).toEqual({ 'qa/taut-run-tests': { minutes: 12 } });
    expect(before['database/backup-run']).toBeDefined(); // não muta
    expect(resetBaselineOverride(undefined, 'x')).toEqual({});
  });
});

it('formatBaselineDate vira dd/mm/aaaa', () => {
  expect(formatBaselineDate('2026-10-16')).toBe('16/10/2026');
  expect(formatBaselineDate(undefined)).toBe('');
});

it('impactCsvFilename leva a data', () => {
  expect(impactCsvFilename('2026-10-16')).toBe('meu-impacto-2026-10-16.csv');
});

describe('buildImpactCsv', () => {
  const days: UsageDays = {
    '2026-10-16': { 'database/backup-run/ui': counter({ runs: 3, ok: 3, okMs: 6 * 60_000, totalMs: 6 * 60_000 }) }
  };
  const csv = (overrides = {}) => buildImpactCsv(computeImpact(days, overrides, NOW));
  // sem o BOM (testado à parte); String.fromCharCode evita um caractere invisível no código-fonte
  const lines = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text).split('\r\n');

  it('começa com BOM (Excel abre os acentos certo) e usa ; como separador', () => {
    const text = csv();
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(lines(text)[0]).toBe(IMPACT_CSV_COLUMNS.join(';'));
  });

  it('uma linha por automação com linha de base, mais o total', () => {
    const out = lines(csv());
    expect(out.length).toBe(1 + USAGE_BASELINE_DEFINITIONS.length + 1); // cabeçalho + uma linha por automação + total
    expect(out[out.length - 1]).toContain('"TOTAL"');
  });

  it('a linha usada traz usos, tempo manual, origem e economia com vírgula decimal', () => {
    const backup = lines(csv()).find((l) => l.includes('Backup de schema'))!;
    expect(backup).toContain('"Database Studio"');
    expect(backup).toContain('"3"'); // usos com sucesso
    expect(backup).toContain('"15"'); // tempo manual padrão
    expect(backup).toContain('"Padrão (estimativa)"');
    expect(backup).toContain('"6"'); // tempo real somado
    expect(backup).toContain('"39"'); // 3 × 15 − 6
  });

  it('marca o tempo informado pela pessoa, com a data', () => {
    const backup = lines(csv({ 'database/backup-run': { minutes: 22.5, setAt: '2026-10-01' } })).find((l) =>
      l.includes('Backup de schema')
    )!;
    expect(backup).toContain('"Informado pela pessoa"');
    expect(backup).toContain('"01/10/2026"');
    expect(backup).toContain('"22,5"'); // vírgula decimal
    expect(backup).toContain('"61,5"'); // 3 × 22,5 − 6
  });

  it('o total bate com a soma das linhas', () => {
    const total = lines(csv()).pop()!;
    expect(total).toContain('"39"');
  });
});
