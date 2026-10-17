import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { UsageSummary } from '../../../../../shared/types';
import { UsageControlsPanel } from './UsageControlsPanel';
import { UsageSummaryPanel } from './UsageSummaryPanel';

const summary = (partial: Partial<UsageSummary> = {}): UsageSummary => ({
  enabled: true,
  installId: '7f3c2a10-5b1e-4c7a-9d2e-0a1b2c3d4e5f',
  firstDay: '2026-10-12',
  lastDay: '2026-10-16',
  totalRuns: 6,
  totalOk: 5,
  totalFailed: 1,
  byModule: [
    { module: 'database', runs: 4, ok: 3, failed: 1, totalMs: 245_000 },
    { module: 'qa', runs: 2, ok: 2, failed: 0, totalMs: 12_300 }
  ],
  byWeek: [{ weekStart: '2026-10-12', runs: 6 }],
  rows: [
    { module: 'database', action: 'backup-run', origin: 'ui', runs: 4, ok: 3, failed: 1, totalMs: 245_000, avgMs: 61_250 },
    { module: 'qa', action: 'taut-run-tests', origin: 'mcp', runs: 2, ok: 2, failed: 0, totalMs: 12_300, avgMs: 6150 }
  ],
  ...partial
});

const renderSummary = (value: UsageSummary | null, extra: { loading?: boolean; error?: string | null } = {}) =>
  renderToStaticMarkup(
    <UsageSummaryPanel summary={value} loading={extra.loading ?? false} error={extra.error ?? null} range="30d" onRangeChange={vi.fn()} />
  );

describe('UsageSummaryPanel', () => {
  it('mostra totais, taxa de sucesso, módulos com rótulo e ações com origem', () => {
    const html = renderSummary(summary());
    expect(html).toContain('Meu uso');
    expect(html).toContain('>6<'); // execuções
    expect(html).toContain('83%'); // 5 de 6
    expect(html).toContain('1 com falha');
    expect(html).toContain('Database Studio');
    expect(html).toContain('Qualidade (QA)');
    expect(html).toContain('backup-run');
    expect(html).toContain('Interface');
    expect(html).toContain('IA (MCP)');
  });

  it('sem uso e com a contagem ligada orienta o usuário', () => {
    const html = renderSummary(summary({ totalRuns: 0, totalOk: 0, totalFailed: 0, byModule: [], rows: [], byWeek: [] }));
    expect(html).toContain('Nenhum uso registrado neste período');
  });

  it('sem uso e com a contagem desligada explica o motivo', () => {
    const html = renderSummary(summary({ enabled: false, totalRuns: 0, byModule: [], rows: [], byWeek: [] }));
    expect(html).toContain('A contagem está desligada');
  });

  it('mostra erro e carregamento sem quebrar com resumo nulo', () => {
    expect(renderSummary(null, { error: 'falhou ao ler' })).toContain('falhou ao ler');
    expect(renderSummary(null, { loading: true })).toContain('Carregando');
  });

  it('marca o período escolhido', () => {
    const html = renderSummary(summary());
    expect(html).toMatch(/aria-pressed="true"[^>]*>Últimos 30 dias/);
    expect(html).toMatch(/aria-pressed="false"[^>]*>Últimos 7 dias/);
  });
});

describe('UsageControlsPanel', () => {
  const render = (partial: Partial<React.ComponentProps<typeof UsageControlsPanel>> = {}) =>
    renderToStaticMarkup(
      <UsageControlsPanel enabled installId="7f3c2a10-5b1e-4c7a-9d2e-0a1b2c3d4e5f" hasHistory onToggle={vi.fn()} onClear={vi.fn()} {...partial} />
    );

  it('explica o que é e o que nunca é contado', () => {
    const html = render();
    expect(html).toContain('O que é contado');
    expect(html).toContain('O que nunca é contado');
    expect(html).toContain('SQL, nomes de banco, schema ou tabela');
    expect(html).toContain('Nada sai daqui');
  });

  it('interruptor reflete o estado; o identificador aparece cortado e o completo só no tooltip', () => {
    const on = render({ enabled: true });
    expect(on).toContain('aria-checked="true"');
    expect(on).toContain('Contagem ligada.');
    expect(on).toContain('>7f3c2a10<'); // texto visível: só os 8 primeiros caracteres
    expect(on).toContain('title="7f3c2a10-5b1e-4c7a-9d2e-0a1b2c3d4e5f"'); // completo apenas ao passar o mouse

    const off = render({ enabled: false });
    expect(off).toContain('aria-checked="false"');
    expect(off).toContain('nada é registrado');
  });

  it('apagar histórico fica desabilitado quando não há histórico', () => {
    expect(render({ hasHistory: false })).toMatch(/<button[^>]*disabled=""[^>]*>[\s\S]*Apagar histórico/);
    expect(render({ hasHistory: true })).not.toMatch(/disabled=""/);
  });
});
