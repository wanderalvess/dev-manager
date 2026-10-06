import { describe, expect, it } from 'vitest';
import type { TestExecutionResult } from '../../../shared/types';
import {
  applyRunnerResultToItem,
  calculateCategoryBreakdown,
  buildNewValidationItem,
  getCategoryLabel,
  getProgressWidth,
  getReadinessSummary,
  getReadinessVerdict,
  applyRunnerResultToItems,
  generateQualityCsv,
  mapRunnerStatus,
  updateValidationItem,
  getStatusSelectClass,
  migrateLegacyRelease,
  migrateLegacySeedItems,
  sortValidationItems
} from './qualityPageView';
import type { QualityValidationItem } from './qualityPageUtils';

describe('migração dos dados-modelo antigos', () => {
  const seed = (id: string, status: 'passed' | 'in_progress', testerName?: string) => ({
    id,
    title: id,
    category: 'service' as const,
    status,
    targetName: 'x',
    testerName,
    testedVersion: '1.0',
    updatedAt: '2026-10-01T00:00:00.000Z'
  });

  it('volta a pendente só o seed intacto, limpando o testador fictício', () => {
    const [a, b] = migrateLegacySeedItems([seed('val-1', 'passed', 'QA Team'), seed('val-2', 'in_progress', 'QA Team')]);
    expect(a.status).toBe('pending');
    expect(a.testerName).toBeUndefined();
    expect(b.status).toBe('pending');
  });

  it('preserva o que o usuário editou (outro testador) e itens que não são do seed', () => {
    const edited = seed('val-1', 'passed', 'Maria');
    const own = seed('meu-item', 'passed', 'QA Team');
    expect(migrateLegacySeedItems([edited, own])).toEqual([edited, own]);
  });

  it('limpa a release padrão antiga, mas mantém a digitada pelo usuário', () => {
    expect(migrateLegacyRelease('v1.24.0')).toBe('');
    expect(migrateLegacyRelease('v2.0.0')).toBe('v2.0.0');
  });
});

describe('calculateCategoryBreakdown', () => {
  const item = (id: string, category: 'routine' | 'service' | 'api' | 'e2e', status: 'passed' | 'failed' | 'pending') => ({
    id,
    title: id,
    category,
    status,
    targetName: 'x',
    updatedAt: '2026-10-05T00:00:00.000Z'
  });

  it('agrupa por categoria, sempre devolvendo as 4 na mesma ordem', () => {
    const result = calculateCategoryBreakdown([
      item('a', 'service', 'passed'),
      item('b', 'service', 'failed'),
      item('c', 'api', 'pending')
    ]);
    expect(result.map((r) => r.category)).toEqual(['routine', 'service', 'api', 'e2e']);
    expect(result[0].metrics.total).toBe(0);
    expect(result[1].metrics).toMatchObject({ total: 2, passed: 1, failed: 1, passRate: 50 });
    expect(result[2].metrics).toMatchObject({ total: 1, pending: 1 });
  });
});

describe('qualityPageView', () => {
  it('mapeia classes de status e rótulos de categoria', () => {
    expect(getStatusSelectClass('passed')).toContain('emerald');
    expect(getStatusSelectClass('failed')).toContain('rose');
    expect(getStatusSelectClass('pending')).toContain('bg-muted');
    expect(getCategoryLabel('routine')).toBe('Rotina Delphi');
    expect(getCategoryLabel('e2e')).toBe('Fluxo E2E');
  });

  it('calcula veredito de prontidão por faixas', () => {
    expect(getReadinessVerdict(80).title).toContain('Pronta');
    expect(getReadinessVerdict(85, 1).title).toContain('Atenção');
    expect(getReadinessVerdict(50).title).toContain('Atenção');
    expect(getReadinessVerdict(49).title).toContain('Bloqueado');
  });

  it('prioriza falhas, depois pendências no resumo', () => {
    expect(getReadinessSummary(2, 3)).toContain('2 falhas');
    expect(getReadinessSummary(0, 3)).toContain('3 cenários');
    expect(getReadinessSummary(0, 0)).toContain('sucesso');
  });

  it('evita divisão por zero na barra de progresso', () => {
    expect(getProgressWidth(0, 0)).toBe('0%');
    expect(getProgressWidth(1, 4)).toBe('25%');
  });

  it('cria item novo aparado e com notas opcionais', () => {
    const item = buildNewValidationItem({ title: ' A ', target: ' B ', category: 'api', notes: '  ' });
    expect(item.title).toBe('A');
    expect(item.targetName).toBe('B');
    expect(item.notes).toBeUndefined();
    expect(item.status).toBe('pending');
  });

  it('anexa informação do runner às notas existentes', () => {
    const result = {
      runnerName: 'R1',
      executedAt: '2026-01-01T10:00:00.000Z',
      status: 'passed',
      passedCount: 3,
      failedCount: 0
    } as TestExecutionResult;
    const base = { id: 'x', title: 't', targetName: 'a', category: 'api' as const, status: 'pending' as const };
    const withoutNotes = applyRunnerResultToItem(base, result, 'passed');
    expect(withoutNotes.status).toBe('passed');
    expect(withoutNotes.notes).toContain('[Auto-Runner R1]');
    const withNotes = applyRunnerResultToItem({ ...base, notes: 'n' }, result, 'passed');
    expect(withNotes.notes?.startsWith('n\n[Auto-Runner')).toBe(true);
  });
});

describe('sortValidationItems / generateQualityCsv', () => {
  const mk = (id: string, status: QualityValidationItem['status'], title: string, notes?: string): QualityValidationItem => ({
    id,
    title,
    category: 'api',
    status,
    targetName: 'X',
    notes
  });

  it('ordena por status com falhas primeiro e não altera a lista original', () => {
    const items = [mk('1', 'passed', 'A'), mk('2', 'failed', 'B'), mk('3', 'pending', 'C')];
    const sorted = sortValidationItems(items, 'status', 'asc');
    expect(sorted.map((i) => i.id)).toEqual(['2', '3', '1']);
    expect(items.map((i) => i.id)).toEqual(['1', '2', '3']);
  });

  it('ordena por título desc e devolve a lista intacta sem chave', () => {
    const items = [mk('1', 'passed', 'a'), mk('2', 'passed', 'b')];
    expect(sortValidationItems(items, 'title', 'desc').map((i) => i.id)).toEqual(['2', '1']);
    expect(sortValidationItems(items, null, 'asc')).toBe(items);
  });

  it('gera CSV escapando aspas, quebras de linha e fórmulas', () => {
    const csv = generateQualityCsv([mk('1', 'failed', '=SOMA(A1)', 'diz "oi"\nlinha 2')]);
    expect(csv.startsWith('﻿"Cenário"')).toBe(true);
    expect(csv).toContain(`"'=SOMA(A1)"`);
    expect(csv).toContain('"diz ""oi"" linha 2"');
    expect(csv).toContain('"Falha"');
  });
});

describe('sync de runners com a Matriz', () => {
  const mkItem = (id: string, status: QualityValidationItem['status'] = 'pending'): QualityValidationItem => ({
    id,
    title: id,
    category: 'api',
    status,
    targetName: 'X'
  });
  const mkResult = (status: TestExecutionResult['status'], linked?: string[]) =>
    ({
      runnerName: 'R1',
      executedAt: '2026-01-01T10:00:00.000Z',
      status,
      passedCount: 1,
      failedCount: 0,
      linkedValidationItemIds: linked
    }) as TestExecutionResult;

  it('mapeia o status do runner: abortado vira bloqueado, não aprovado nem falha', () => {
    expect(mapRunnerStatus('passed')).toBe('passed');
    expect(mapRunnerStatus('failed')).toBe('failed');
    expect(mapRunnerStatus('aborted')).toBe('blocked');
  });

  it('atualiza só os cenários vinculados e conta quantos foram', () => {
    const items = [mkItem('a'), mkItem('b'), mkItem('c', 'passed')];
    const out = applyRunnerResultToItems(items, mkResult('failed', ['a', 'c', 'inexistente']));
    expect(out.updatedCount).toBe(2);
    expect(out.newStatus).toBe('failed');
    expect(out.items.map((i) => i.status)).toEqual(['failed', 'pending', 'failed']);
    expect(out.items[1]).toBe(items[1]);
    expect(items[0].status).toBe('pending');
  });

  it('runner abortado marca os vinculados como bloqueados', () => {
    const out = applyRunnerResultToItems([mkItem('a')], mkResult('aborted', ['a']));
    expect(out.items[0].status).toBe('blocked');
  });

  it('sem vínculos ou com vínculos inexistentes não altera nada e conta zero', () => {
    const items = [mkItem('a')];
    expect(applyRunnerResultToItems(items, mkResult('passed', undefined)).updatedCount).toBe(0);
    const orphan = applyRunnerResultToItems(items, mkResult('passed', ['zzz']));
    expect(orphan.updatedCount).toBe(0);
    expect(orphan.items[0]).toBe(items[0]);
  });
});

describe('updateValidationItem', () => {
  const base = (id: string): QualityValidationItem => ({
    id,
    title: `t-${id}`,
    category: 'api',
    status: 'passed',
    targetName: 'alvo',
    notes: 'nota',
    updatedAt: '2020-01-01T00:00:00.000Z'
  });

  it('edita somente o cenário escolhido, preserva status e carimba updatedAt', () => {
    const items = [base('a'), base('b')];
    const out = updateValidationItem(items, 'b', {
      title: 'novo',
      targetName: 'novo-alvo',
      category: 'e2e',
      notes: undefined
    });
    expect(out[0]).toBe(items[0]);
    expect(out[1].title).toBe('novo');
    expect(out[1].targetName).toBe('novo-alvo');
    expect(out[1].category).toBe('e2e');
    expect(out[1].notes).toBeUndefined();
    expect(out[1].status).toBe('passed');
    expect(out[1].updatedAt).not.toBe('2020-01-01T00:00:00.000Z');
    expect(items[1].title).toBe('t-b');
  });

  it('id inexistente não altera nenhum cenário', () => {
    const items = [base('a')];
    const out = updateValidationItem(items, 'x', { title: 'n', targetName: 'n', category: 'api' });
    expect(out[0]).toBe(items[0]);
  });
});
