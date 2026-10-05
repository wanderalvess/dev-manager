import { describe, expect, it } from 'vitest';
import type { TestExecutionResult } from '../../../shared/types';
import {
  applyRunnerResultToItem,
  buildNewValidationItem,
  getCategoryLabel,
  getProgressWidth,
  getReadinessSummary,
  getReadinessVerdict,
  getStatusSelectClass
} from './qualityPageView';

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
