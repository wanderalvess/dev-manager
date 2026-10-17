import { describe, expect, it } from 'vitest';
import type { UsageCounter, UsageDays } from './usageMetricsTypes';
import { USAGE_BASELINE_DEFINITIONS } from './usageBaselines';
import { computeImpact, savedMsFor } from './usageImpact';

const NOW = new Date(2026, 9, 16, 12, 0, 0); // 2026-10-16
const MIN = 60_000;
const counter = (partial: Partial<UsageCounter>): UsageCounter => ({
  runs: 0,
  ok: 0,
  failed: 0,
  totalMs: 0,
  okMs: 0,
  ...partial
});
const BACKUP = 'database/backup-run/ui';

describe('savedMsFor', () => {
  it('usos × tempo manual − tempo real', () => {
    expect(savedMsFor(3, 6 * MIN, 10)).toBe(24 * MIN);
  });

  it('nunca é negativo', () => {
    expect(savedMsFor(2, 40 * MIN, 10)).toBe(0);
  });

  it('sem usos, ou com linha de base zerada, não economiza', () => {
    expect(savedMsFor(0, 0, 10)).toBe(0);
    expect(savedMsFor(5, 1000, 0)).toBe(0);
  });
});

describe('computeImpact', () => {
  it('calcula a economia de um dia com a linha de base padrão', () => {
    const impact = computeImpact({ '2026-10-16': { [BACKUP]: counter({ runs: 3, ok: 3, okMs: 6 * MIN, totalMs: 6 * MIN }) } }, {}, NOW);
    const row = impact.rows.find((r) => r.key === 'database/backup-run')!;
    expect(row).toMatchObject({ okRuns: 3, source: 'default', baselineMinutes: 15 });
    expect(row.savedMs).toBe((3 * 15 - 6) * MIN);
    expect(impact.total.savedMs).toBe(row.savedMs);
    expect(impact.total.okRuns).toBe(3);
  });

  describe('o que não conta como economia', () => {
    it('falhas não economizam', () => {
      const impact = computeImpact({ '2026-10-16': { [BACKUP]: counter({ runs: 5, failed: 5, totalMs: 10 * MIN }) } }, {}, NOW);
      expect(impact.total).toMatchObject({ savedMs: 0, okRuns: 0 });
    });

    it('no mesmo dia com sucessos e falhas, só os sucessos entram (usos e tempo)', () => {
      // 3 sucessos de 1 min cada e 1 falha de 7 min: a falha não economiza e o tempo dela não abate nada.
      const impact = computeImpact(
        { '2026-10-16': { [BACKUP]: counter({ runs: 4, ok: 3, failed: 1, okMs: 3 * MIN, totalMs: 10 * MIN }) } },
        {},
        NOW
      );
      expect(impact.total.okRuns).toBe(3);
      expect(impact.total.savedMs).toBe((3 * 15 - 3) * MIN); // 42 min; com `runs` seriam 57, com `totalMs` seriam 35
    });

    it('uso mais lento que o manual não vira economia negativa', () => {
      const impact = computeImpact({ '2026-10-16': { [BACKUP]: counter({ runs: 1, ok: 1, okMs: 60 * MIN, totalMs: 60 * MIN }) } }, {}, NOW);
      expect(impact.total.savedMs).toBe(0);
    });

    it('ação sem equivalente manual (consulta à documentação) é ignorada', () => {
      const impact = computeImpact({ '2026-10-16': { 'docs/search/ui': counter({ runs: 9, ok: 9, okMs: 90 }) } }, {}, NOW);
      expect(impact.total).toMatchObject({ savedMs: 0, okRuns: 0 });
    });

    it('chave corrompida é ignorada sem quebrar o resto', () => {
      const impact = computeImpact(
        { '2026-10-16': { 'SELECT * FROM x/y/ui': counter({ runs: 1, ok: 1 }), [BACKUP]: counter({ runs: 1, ok: 1, okMs: 0 }) } },
        {},
        NOW
      );
      expect(impact.total.okRuns).toBe(1);
    });
  });

  describe('conservadorismo', () => {
    it('um uso lento compensa parte da economia dos rápidos no mesmo dia', () => {
      // 2 usos de 1 min e 1 de 30 min; manual de 15 min. Uso a uso daria 14 + 14 + 0 = 28 min.
      const day = { [BACKUP]: counter({ runs: 3, ok: 3, okMs: 32 * MIN, totalMs: 32 * MIN }) };
      const perRun = 14 + 14 + 0;
      const bucket = computeImpact({ '2026-10-16': day }, {}, NOW).total.savedMs / MIN;
      expect(bucket).toBe(13); // 3 × 15 − 32
      expect(bucket).toBeLessThanOrEqual(perRun);
    });
  });

  describe('janelas de tempo', () => {
    const days: UsageDays = {
      '2026-10-16': { [BACKUP]: counter({ runs: 1, ok: 1 }) }, // hoje
      '2026-10-10': { [BACKUP]: counter({ runs: 1, ok: 1 }) }, // 6 dias atrás: limite da semana
      '2026-10-09': { [BACKUP]: counter({ runs: 1, ok: 1 }) }, // 7 dias atrás: já fora da semana
      '2026-09-17': { [BACKUP]: counter({ runs: 1, ok: 1 }) }, // 29 dias atrás: limite do mês
      '2026-09-16': { [BACKUP]: counter({ runs: 1, ok: 1 }) } // 30 dias atrás: fora do mês
    };
    const impact = computeImpact(days, {}, NOW);
    const one = 15 * MIN;

    it('semana são os últimos 7 dias, contando hoje', () => expect(impact.week.savedMs).toBe(2 * one));
    it('mês são os últimos 30 dias, contando hoje', () => expect(impact.month.savedMs).toBe(4 * one));
    it('total é tudo', () => expect(impact.total.savedMs).toBe(5 * one));

    it('dia no futuro (relógio errado) só entra no total', () => {
      const future = computeImpact({ '2026-10-20': { [BACKUP]: counter({ runs: 1, ok: 1 }) } }, {}, NOW);
      expect(future.week.savedMs).toBe(0);
      expect(future.month.savedMs).toBe(0);
      expect(future.total.savedMs).toBe(one);
    });
  });

  describe('linha de base da pessoa', () => {
    const days: UsageDays = { '2026-10-16': { [BACKUP]: counter({ runs: 2, ok: 2, okMs: 0 }) } };

    it('usa o tempo informado e separa a economia confirmada da estimada', () => {
      const own = computeImpact(days, { 'database/backup-run': { minutes: 40, setAt: '2026-10-01' } }, NOW);
      expect(own.total.savedMs).toBe(80 * MIN);
      expect(own.total.confirmedMs).toBe(80 * MIN);
      expect(own.rows.find((r) => r.key === 'database/backup-run')).toMatchObject({ source: 'user', setAt: '2026-10-01' });

      const standard = computeImpact(days, {}, NOW);
      expect(standard.total.savedMs).toBe(30 * MIN);
      expect(standard.total.confirmedMs).toBe(0);
    });

    it('zerar a linha de base zera a economia daquela ação', () => {
      const zeroed = computeImpact(days, { 'database/backup-run': { minutes: 0 } }, NOW);
      expect(zeroed.total.savedMs).toBe(0);
      expect(zeroed.rows.find((r) => r.key === 'database/backup-run')?.source).toBe('user');
    });

    it('a confirmada soma só as ações com tempo informado', () => {
      const mixed = computeImpact(
        { '2026-10-16': { [BACKUP]: counter({ runs: 1, ok: 1 }), 'database/restore/ui': counter({ runs: 1, ok: 1 }) } },
        { 'database/backup-run': { minutes: 20 } },
        NOW
      );
      expect(mixed.total.savedMs).toBe((20 + 20) * MIN); // restore usa o padrão de 20
      expect(mixed.total.confirmedMs).toBe(20 * MIN);
    });
  });

  describe('origens somam na mesma automação', () => {
    it('interface, REST e MCP caem na mesma linha', () => {
      const impact = computeImpact(
        {
          '2026-10-16': {
            'database/backup-run/ui': counter({ runs: 1, ok: 1 }),
            'database/backup-run/rest': counter({ runs: 1, ok: 1 }),
            'database/db_run_backup/mcp': counter({ runs: 2, ok: 2 })
          }
        },
        {},
        NOW
      );
      const row = impact.rows.find((r) => r.key === 'database/backup-run')!;
      expect(row.okRuns).toBe(4);
      expect(row.savedMs).toBe(4 * 15 * MIN);
    });
  });

  describe('por módulo', () => {
    it('agrupa e ordena do que mais economizou para o que menos', () => {
      const impact = computeImpact(
        {
          '2026-10-16': {
            [BACKUP]: counter({ runs: 1, ok: 1 }), // database 15
            'qa/regression-execute/ui': counter({ runs: 1, ok: 1 }), // qa 30
            'git/create-task-branch/ui': counter({ runs: 1, ok: 1 }) // git 3
          }
        },
        {},
        NOW
      );
      expect(impact.total.byModule).toEqual([
        { module: 'qa', savedMs: 30 * MIN },
        { module: 'database', savedMs: 15 * MIN },
        { module: 'git', savedMs: 3 * MIN }
      ]);
    });
  });

  it('lista todas as automações com linha de base, mesmo sem uso', () => {
    const impact = computeImpact({}, {}, NOW);
    expect(impact.rows.map((r) => r.key)).toEqual(USAGE_BASELINE_DEFINITIONS.map((d) => d.key));
    expect(impact.rows.every((r) => r.okRuns === 0 && r.savedMs === 0)).toBe(true);
    expect(impact.total).toEqual({ savedMs: 0, confirmedMs: 0, okRuns: 0, byModule: [] });
    expect(impact.today).toBe('2026-10-16');
  });
});
