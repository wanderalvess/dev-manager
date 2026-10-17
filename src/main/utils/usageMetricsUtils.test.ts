import { describe, expect, it } from 'vitest';
import type { UsageDays, UsageEvent } from '../../shared/usageMetricsTypes';
import {
  MAX_EVENT_DURATION_MS,
  addEventToDays,
  buildUsageKey,
  dayKey,
  isDayKey,
  mergeDays,
  normalizeDuration,
  normalizeStore,
  parseUsageKey,
  pruneDays,
  resultIndicatesFailure,
  summarizeUsage,
  weekStartOf
} from './usageMetricsUtils';

const INSTALL_ID = '7f3c2a10-5b1e-4c7a-9d2e-0a1b2c3d4e5f';
const at = (iso: string) => new Date(`${iso}T12:00:00`);
const ev = (partial: Partial<UsageEvent> = {}): UsageEvent => ({
  module: 'database',
  action: 'backup-run',
  origin: 'ui',
  ok: true,
  durationMs: 1000,
  ...partial
});

describe('usageMetricsUtils', () => {
  describe('privacidade das chaves', () => {
    const sensiveis = [
      'SELECT * FROM clientes',
      'C:\\Users\\fulano\\projetos',
      '/home/fulano/projeto',
      'fulano@empresa.com.br',
      'schema.tabela',
      'minha senha 123',
      'Backup',
      '',
      'a'.repeat(49)
    ];

    it.each(sensiveis)('descarta módulo e ação com conteúdo: %s', (valor) => {
      const days: UsageDays = {};
      expect(addEventToDays(days, ev({ module: valor }))).toBe(false);
      expect(addEventToDays(days, ev({ action: valor }))).toBe(false);
      expect(days).toEqual({});
    });

    it('descarta origem desconhecida', () => {
      const days: UsageDays = {};
      expect(addEventToDays(days, ev({ origin: 'web' as never }))).toBe(false);
      expect(days).toEqual({});
    });

    it('aceita nomes de tools MCP e ações do mapa', () => {
      const days: UsageDays = {};
      expect(addEventToDays(days, ev({ module: 'karaf', action: 'karaf_list_bundles', origin: 'mcp' }))).toBe(true);
      expect(addEventToDays(days, ev({ module: 'qa', action: 'taut-run-tests' }))).toBe(true);
    });

    it('o evento só grava contadores: nada além de runs, ok, failed, totalMs e risk', () => {
      const days: UsageDays = {};
      addEventToDays(days, ev({ risk: 'destructive' }), at('2026-10-16'));
      const counter = days['2026-10-16']['database/backup-run/ui'];
      expect(Object.keys(counter).sort()).toEqual(['failed', 'ok', 'risk', 'runs', 'totalMs']);
    });
  });

  describe('chaves e datas', () => {
    it('monta e lê a chave', () => {
      const key = buildUsageKey('database', 'backup-run', 'mcp');
      expect(key).toBe('database/backup-run/mcp');
      expect(parseUsageKey(key)).toEqual({ module: 'database', action: 'backup-run', origin: 'mcp' });
    });

    it('rejeita chave malformada', () => {
      expect(parseUsageKey('a/b')).toBeNull();
      expect(parseUsageKey('a/b/c/d')).toBeNull();
      expect(parseUsageKey('a/b/web')).toBeNull();
      expect(parseUsageKey('A/b/ui')).toBeNull();
    });

    it('dayKey usa o dia local', () => {
      expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    });

    it('isDayKey recusa datas impossíveis', () => {
      expect(isDayKey('2026-10-16')).toBe(true);
      expect(isDayKey('2026-02-30')).toBe(false);
      expect(isDayKey('16/10/2026')).toBe(false);
      expect(isDayKey(20261016)).toBe(false);
    });

    it('weekStartOf devolve a segunda-feira', () => {
      expect(weekStartOf('2026-10-14')).toBe('2026-10-12'); // quarta
      expect(weekStartOf('2026-10-12')).toBe('2026-10-12'); // segunda
      expect(weekStartOf('2026-10-18')).toBe('2026-10-12'); // domingo
      expect(weekStartOf('2026-01-01')).toBe('2025-12-29'); // cruza o ano
    });
  });

  describe('duração', () => {
    it('arredonda, zera o inválido e limita a 24 h', () => {
      expect(normalizeDuration(1234.6)).toBe(1235);
      expect(normalizeDuration(-5)).toBe(0);
      expect(normalizeDuration(Number.NaN)).toBe(0);
      expect(normalizeDuration(Infinity)).toBe(0);
      expect(normalizeDuration('10')).toBe(0);
      expect(normalizeDuration(MAX_EVENT_DURATION_MS * 3)).toBe(MAX_EVENT_DURATION_MS);
    });
  });

  describe('addEventToDays e mergeDays', () => {
    it('acumula execuções, sucessos, falhas e duração no mesmo dia', () => {
      const days: UsageDays = {};
      const now = at('2026-10-16');
      addEventToDays(days, ev({ durationMs: 1000 }), now);
      addEventToDays(days, ev({ durationMs: 3000, ok: false }), now);
      expect(days['2026-10-16']['database/backup-run/ui']).toEqual({ runs: 2, ok: 1, failed: 1, totalMs: 4000 });
    });

    it('separa dias e origens', () => {
      const days: UsageDays = {};
      addEventToDays(days, ev(), at('2026-10-16'));
      addEventToDays(days, ev(), at('2026-10-17'));
      addEventToDays(days, ev({ origin: 'mcp' }), at('2026-10-17'));
      expect(Object.keys(days)).toEqual(['2026-10-16', '2026-10-17']);
      expect(Object.keys(days['2026-10-17']).sort()).toEqual(['database/backup-run/mcp', 'database/backup-run/ui']);
    });

    it('mergeDays soma sem depender da ordem (dois processos escrevendo)', () => {
      const a: UsageDays = {};
      const b: UsageDays = {};
      addEventToDays(a, ev({ durationMs: 100 }), at('2026-10-16'));
      addEventToDays(b, ev({ durationMs: 300, ok: false }), at('2026-10-16'));
      addEventToDays(b, ev({ module: 'qa', action: 'taut-run-tests' }), at('2026-10-17'));

      const ab: UsageDays = {};
      mergeDays(ab, a);
      mergeDays(ab, b);
      const ba: UsageDays = {};
      mergeDays(ba, b);
      mergeDays(ba, a);

      expect(ab).toEqual(ba);
      expect(ab['2026-10-16']['database/backup-run/ui']).toEqual({ runs: 2, ok: 1, failed: 1, totalMs: 400 });
    });

    it('mergeDays não altera a origem', () => {
      const source: UsageDays = {};
      addEventToDays(source, ev(), at('2026-10-16'));
      const snapshot = JSON.parse(JSON.stringify(source));
      mergeDays({}, source);
      expect(source).toEqual(snapshot);
    });

    it('guarda o risco da tool MCP', () => {
      const days: UsageDays = {};
      addEventToDays(
        days,
        ev({ module: 'env', action: 'env_reset_environment', origin: 'mcp', risk: 'destructive' }),
        at('2026-10-16')
      );
      expect(days['2026-10-16']['env/env_reset_environment/mcp'].risk).toBe('destructive');
    });
  });

  describe('resultIndicatesFailure', () => {
    it('reconhece os formatos de falha sem exceção', () => {
      expect(resultIndicatesFailure({ success: false, message: 'x' })).toBe(true);
      expect(resultIndicatesFailure({ ok: false })).toBe(true);
      expect(resultIndicatesFailure({ isError: true, content: [] })).toBe(true);
    });

    it('trata o resto como sucesso', () => {
      expect(resultIndicatesFailure({ success: true })).toBe(false);
      expect(resultIndicatesFailure({ rows: [] })).toBe(false);
      expect(resultIndicatesFailure('texto')).toBe(false);
      expect(resultIndicatesFailure(undefined)).toBe(false);
      expect(resultIndicatesFailure(null)).toBe(false);
    });
  });

  describe('pruneDays', () => {
    it('remove só o que passou da retenção', () => {
      const days: UsageDays = {};
      addEventToDays(days, ev(), at('2025-01-01'));
      addEventToDays(days, ev(), at('2026-10-01'));
      pruneDays(days, at('2026-10-16'), 400);
      expect(Object.keys(days)).toEqual(['2026-10-01']);
    });
  });

  describe('normalizeStore', () => {
    const valido = () => ({
      schemaVersion: 1,
      installId: INSTALL_ID,
      createdAt: '2026-10-16T10:00:00.000Z',
      days: { '2026-10-16': { 'database/backup-run/ui': { runs: 2, ok: 1, failed: 1, totalMs: 400 } } }
    });

    it('aceita um arquivo válido', () => {
      expect(normalizeStore(valido())?.days['2026-10-16']['database/backup-run/ui'].runs).toBe(2);
    });

    it('recusa arquivo sem cabeçalho confiável', () => {
      expect(normalizeStore(null)).toBeNull();
      expect(normalizeStore('texto')).toBeNull();
      expect(normalizeStore({ ...valido(), schemaVersion: 2 })).toBeNull();
      expect(normalizeStore({ ...valido(), installId: 'x' })).toBeNull();
    });

    it('descarta dia, chave e contador inválidos sem perder o resto', () => {
      const raw = valido();
      Object.assign(raw.days, {
        '99-99-99': { 'a/b/ui': { runs: 1, ok: 1, failed: 0, totalMs: 1 } },
        '2026-10-17': {
          'SELECT * FROM x/y/ui': { runs: 1, ok: 1, failed: 0, totalMs: 1 },
          'a/b/ui': { runs: -1, ok: 0, failed: 0, totalMs: 0 },
          'qa/taut-run-tests/ui': { runs: 3, ok: 3, failed: 0, totalMs: 9 }
        }
      });
      const store = normalizeStore(raw);
      expect(Object.keys(store?.days ?? {}).sort()).toEqual(['2026-10-16', '2026-10-17']);
      expect(Object.keys(store?.days['2026-10-17'] ?? {})).toEqual(['qa/taut-run-tests/ui']);
    });
  });

  describe('summarizeUsage', () => {
    const store = (() => {
      const days: UsageDays = {};
      addEventToDays(days, ev({ durationMs: 1000 }), at('2026-10-12'));
      addEventToDays(days, ev({ durationMs: 3000, ok: false }), at('2026-10-14'));
      addEventToDays(days, ev({ module: 'qa', action: 'taut-run-tests', durationMs: 500 }), at('2026-10-14'));
      addEventToDays(days, ev({ origin: 'mcp', durationMs: 200 }), at('2026-10-20'));
      return { installId: INSTALL_ID, days };
    })();

    it('totaliza por módulo, semana e linha', () => {
      const s = summarizeUsage(store);
      expect(s.totalRuns).toBe(4);
      expect(s.totalOk).toBe(3);
      expect(s.totalFailed).toBe(1);
      expect(s.firstDay).toBe('2026-10-12');
      expect(s.lastDay).toBe('2026-10-20');
      expect(s.byModule[0]).toMatchObject({ module: 'database', runs: 3, failed: 1, totalMs: 4200 });
      expect(s.byWeek).toEqual([
        { weekStart: '2026-10-12', runs: 3 },
        { weekStart: '2026-10-19', runs: 1 }
      ]);
      const ui = s.rows.find((r) => r.origin === 'ui' && r.action === 'backup-run');
      expect(ui).toMatchObject({ runs: 2, avgMs: 2000 });
    });

    it('respeita o período, inclusive nos dois extremos', () => {
      const s = summarizeUsage(store, { from: '2026-10-14', to: '2026-10-14' });
      expect(s.totalRuns).toBe(2);
      expect(s.firstDay).toBe('2026-10-14');
      expect(s.lastDay).toBe('2026-10-14');
    });

    it('ignora período malformado em vez de esconder dados', () => {
      expect(summarizeUsage(store, { from: 'ontem', to: '2026-13-45' }).totalRuns).toBe(4);
    });

    it('sem dados devolve zeros e datas nulas', () => {
      const s = summarizeUsage({ installId: INSTALL_ID, days: {} });
      expect(s).toMatchObject({ totalRuns: 0, firstDay: null, lastDay: null, rows: [], byModule: [], byWeek: [] });
    });

    it('repassa o estado ligado/desligado', () => {
      expect(summarizeUsage(store, {}, false).enabled).toBe(false);
    });
  });
});
