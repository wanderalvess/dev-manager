import { describe, expect, it } from 'vitest';
import {
  barPercent,
  formatDuration,
  formatWeekLabel,
  hasUsage,
  lastWeeks,
  rangeToQuery,
  shortInstallId,
  successRate
} from './usageViewUtils';

const NOW = new Date(2026, 9, 16, 15, 0, 0); // sex 2026-10-16

describe('usageViewUtils', () => {
  describe('rangeToQuery', () => {
    it('7 dias inclui hoje e os 6 anteriores', () => {
      expect(rangeToQuery('7d', NOW)).toEqual({ from: '2026-10-10', to: '2026-10-16' });
    });

    it('30 dias cruza o mês', () => {
      expect(rangeToQuery('30d', NOW)).toEqual({ from: '2026-09-17', to: '2026-10-16' });
    });

    it('"tudo" não filtra', () => {
      expect(rangeToQuery('all', NOW)).toEqual({});
    });
  });

  describe('successRate', () => {
    it('arredonda e protege contra divisão por zero', () => {
      expect(successRate(2, 3)).toBe(67);
      expect(successRate(0, 0)).toBeNull();
      expect(successRate(5, 5)).toBe(100);
    });
  });

  describe('formatDuration', () => {
    it.each([
      [0, '0 s'],
      [-5, '0 s'],
      [Number.NaN, '0 s'],
      [850, '850 ms'],
      [12_300, '12,3 s'],
      [245_000, '4 min 05 s'],
      [4_800_000, '1 h 20 min']
    ])('%s ms → %s', (ms, esperado) => {
      expect(formatDuration(ms)).toBe(esperado);
    });
  });

  describe('lastWeeks', () => {
    it('devolve N semanas até a atual e preenche buracos com 0', () => {
      const weeks = lastWeeks(
        [
          { weekStart: '2026-10-12', runs: 5 },
          { weekStart: '2026-09-28', runs: 2 }
        ],
        4,
        NOW
      );
      expect(weeks).toEqual([
        { weekStart: '2026-09-21', runs: 0 },
        { weekStart: '2026-09-28', runs: 2 },
        { weekStart: '2026-10-05', runs: 0 },
        { weekStart: '2026-10-12', runs: 5 }
      ]);
    });

    it('semana fora da janela é ignorada', () => {
      expect(lastWeeks([{ weekStart: '2025-01-06', runs: 9 }], 2, NOW).every((w) => w.runs === 0)).toBe(true);
    });
  });

  it('formatWeekLabel mostra dia/mês', () => {
    expect(formatWeekLabel('2026-10-12')).toBe('12/10');
  });

  it('shortInstallId mostra 8 caracteres ou traço', () => {
    expect(shortInstallId('7f3c2a10-5b1e-4c7a-9d2e-0a1b2c3d4e5f')).toBe('7f3c2a10');
    expect(shortInstallId('')).toBe('—');
  });

  describe('barPercent', () => {
    it('proporcional ao maior, com mínimo visível para valores pequenos', () => {
      expect(barPercent(50, 100)).toBe(50);
      expect(barPercent(100, 100)).toBe(100);
      expect(barPercent(1, 1000)).toBe(3);
      expect(barPercent(0, 100)).toBe(0);
      expect(barPercent(5, 0)).toBe(0);
    });
  });

  it('hasUsage só é verdadeiro com execuções', () => {
    expect(hasUsage(null)).toBe(false);
    expect(hasUsage({ totalRuns: 0 } as never)).toBe(false);
    expect(hasUsage({ totalRuns: 3 } as never)).toBe(true);
  });
});
