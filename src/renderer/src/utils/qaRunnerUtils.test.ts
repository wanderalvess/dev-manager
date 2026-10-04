import { describe, it, expect } from 'vitest';
import {
  buildDefaultVariables,
  pickDefaultConnectionId,
  computeInitialExpandedSteps,
  toggleStepId,
  getAssertionBadgeLabel,
  getAssertionRowClass
} from './qaRunnerUtils';

const makeResult = (flags: boolean[]): any => ({
  stepResults: flags.map((success, i) => ({ stepId: `s${i}`, success }))
});

describe('qaRunnerUtils', () => {
  it('converte variáveis padrão em strings', () => {
    expect(buildDefaultVariables({ defaultVariables: { a: 1, b: 'x' } } as any)).toEqual({
      a: '1',
      b: 'x'
    });
    expect(buildDefaultVariables({} as any)).toEqual({});
  });

  it('prefere conexão Oracle, depois a primeira disponível', () => {
    expect(pickDefaultConnectionId([{ id: 'o' }], [{ id: 'p' }, { id: 'o' }])).toBe('o');
    expect(pickDefaultConnectionId([], [{ id: 'p' }])).toBe('p');
    expect(pickDefaultConnectionId([], [])).toBeNull();
  });

  it('expande apenas falhas, ou todos quando não há falhas', () => {
    expect([...computeInitialExpandedSteps(makeResult([true, false]))]).toEqual(['s1']);
    expect([...computeInitialExpandedSteps(makeResult([true, true]))]).toEqual(['s0', 's1']);
  });

  it('alterna id sem mutar o conjunto original', () => {
    const base = new Set(['a']);
    expect([...toggleStepId(base, 'b')]).toEqual(['a', 'b']);
    expect([...toggleStepId(base, 'a')]).toEqual([]);
    expect([...base]).toEqual(['a']);
  });

  it('mapeia status de asserção', () => {
    expect(getAssertionBadgeLabel('passed')).toBe('OK');
    expect(getAssertionBadgeLabel('failed')).toBe('DIVERG');
    expect(getAssertionBadgeLabel('warning')).toBe('ALERTA');
    expect(getAssertionRowClass('failed')).toContain('rose');
  });
});
