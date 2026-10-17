import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { UsageDays } from '../../../../../shared/types';
import { computeImpact } from '../../../../../shared/usageImpact';
import type { UsageBaselineOverrides } from '../../../../../shared/usageBaselines';
import { UsageImpactPanel } from './UsageImpactPanel';

const NOW = new Date(2026, 9, 16, 12);
const MIN = 60_000;
const days: UsageDays = {
  '2026-10-16': {
    'database/backup-run/ui': { runs: 3, ok: 3, failed: 0, totalMs: 6 * MIN, okMs: 6 * MIN },
    'qa/taut-run-tests/ui': { runs: 1, ok: 1, failed: 0, totalMs: 2 * MIN, okMs: 2 * MIN }
  }
};

const render = (overrides: UsageBaselineOverrides = {}, extra: { loading?: boolean; error?: string | null; empty?: boolean } = {}) =>
  renderToStaticMarkup(
    <UsageImpactPanel
      impact={extra.empty ? null : computeImpact(days, overrides, NOW)}
      loading={extra.loading ?? false}
      error={extra.error ?? null}
      onChangeBaseline={vi.fn()}
      onResetBaseline={vi.fn()}
      onExport={vi.fn()}
    />
  );

describe('UsageImpactPanel', () => {
  it('explica a conta e mostra as três janelas', () => {
    const html = render();
    expect(html).toContain('Meu impacto (tempo economizado)');
    expect(html).toContain('Falhas não contam');
    expect(html).toContain('Últimos 7 dias');
    expect(html).toContain('Últimos 30 dias');
    expect(html).toContain('Desde o início');
  });

  it('mostra a economia calculada (3 × 15 − 6 + 1 × 10 − 2 = 47 min)', () => {
    expect(render()).toContain('47 min');
  });

  it('avisa que a economia usa tempos padrão enquanto nada foi confirmado', () => {
    const html = render();
    expect(html).toContain('Todo o tempo economizado');
    expect(html).toContain('padrão (estimativas)');
    expect(html).toContain('0 min confirmado');
  });

  it('o aviso diz a porcentagem que ainda é estimada quando parte foi confirmada', () => {
    const html = render({ 'database/backup-run': { minutes: 15, setAt: '2026-10-01' } });
    // backup economiza 39 min confirmados de 47 → 83% confirmado, 17% estimado
    expect(html).toContain('17% do tempo economizado');
  });

  it('com tudo confirmado o aviso some', () => {
    const html = render({
      'database/backup-run': { minutes: 15, setAt: '2026-10-01' },
      'qa/taut-run-tests': { minutes: 10, setAt: '2026-10-01' }
    });
    expect(html).not.toContain('padrão (estimativas)');
  });

  it('a tabela lista as automações, pede confirmação das usadas e mostra a origem', () => {
    const html = render({ 'database/backup-run': { minutes: 20, setAt: '2026-10-01' } });
    expect(html).toContain('Backup de schema');
    expect(html).toContain('Informado em 01/10/2026');
    expect(html).toContain('Padrão: confirme'); // taut foi usada e segue no padrão
    expect(html).toContain('aria-label="Restaurar o tempo padrão: Backup de schema"');
    expect(html).not.toContain('Restaurar o tempo padrão: Rodar testes Cypress'); // só quem tem valor informado
  });

  it('lista por módulo a economia, do maior para o menor', () => {
    const html = render();
    expect(html.indexOf('Database Studio')).toBeGreaterThan(-1);
    expect(html.indexOf('Qualidade (QA)')).toBeGreaterThan(-1);
    expect(html.indexOf('Database Studio')).toBeLessThan(html.indexOf('Qualidade (QA)', html.indexOf('Por módulo')));
  });

  it('sem dados ainda mostra carregamento ou erro e deixa o CSV desabilitado', () => {
    expect(render({}, { empty: true, loading: true })).toContain('Carregando');
    expect(render({}, { empty: true, error: 'falhou' })).toContain('falhou');
    expect(render({}, { empty: true })).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*Exportar CSV/);
  });
});
