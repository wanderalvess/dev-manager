import { describe, it, expect } from 'vitest';
import { moveTargetIndex, removeItemAt, selectionAfterMove, selectionAfterRemove, swapItems } from './stepListUtils';

describe('stepListUtils', () => {
  it('swapItems troca duas posições sem mutar a lista original', () => {
    const original = ['a', 'b', 'c'];
    expect(swapItems(original, 0, 2)).toEqual(['c', 'b', 'a']);
    expect(original).toEqual(['a', 'b', 'c']);
  });

  it('removeItemAt remove só a posição indicada', () => {
    expect(removeItemAt(['a', 'b', 'c'], 1)).toEqual(['a', 'c']);
  });

  it('selectionAfterRemove ajusta a seleção', () => {
    expect(selectionAfterRemove(1, 1)).toBeNull();
    expect(selectionAfterRemove(3, 1)).toBe(2);
    expect(selectionAfterRemove(0, 1)).toBe(0);
    expect(selectionAfterRemove(null, 1)).toBeNull();
  });

  it('selectionAfterMove segue a etapa movida', () => {
    expect(selectionAfterMove(1, 1, 2)).toBe(2);
    expect(selectionAfterMove(2, 1, 2)).toBe(1);
    expect(selectionAfterMove(0, 1, 2)).toBe(0);
    expect(selectionAfterMove(null, 1, 2)).toBeNull();
  });

  it('moveTargetIndex respeita os limites', () => {
    expect(moveTargetIndex(0, 'up', 3)).toBeNull();
    expect(moveTargetIndex(2, 'down', 3)).toBeNull();
    expect(moveTargetIndex(1, 'down', 3)).toBe(2);
    expect(moveTargetIndex(1, 'up', 3)).toBe(0);
  });
});
