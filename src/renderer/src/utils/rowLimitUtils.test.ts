import { describe, expect, it } from 'vitest';
import { ROW_LIMIT_STEPS, nextRowLimit } from './rowLimitUtils';

describe('nextRowLimit', () => {
  it('sobe para o próximo degrau', () => {
    expect(nextRowLimit(100)).toBe(250);
    expect(nextRowLimit(1000)).toBe(5000);
    expect(nextRowLimit(5000)).toBe(10000);
  });

  it('valor fora dos degraus vai para o seguinte maior', () => {
    expect(nextRowLimit(120)).toBe(250);
    expect(nextRowLimit(1)).toBe(50);
  });

  it('no máximo devolve null', () => {
    expect(nextRowLimit(10000)).toBeNull();
    expect(nextRowLimit(99999)).toBeNull();
    expect(ROW_LIMIT_STEPS[ROW_LIMIT_STEPS.length - 1]).toBe(10000);
  });
});
