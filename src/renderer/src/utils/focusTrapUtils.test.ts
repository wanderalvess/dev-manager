import { describe, expect, it } from 'vitest';
import { nextFocusIndex } from './focusTrapUtils';

describe('nextFocusIndex', () => {
  it('avança e dá a volta no último item', () => {
    expect(nextFocusIndex(0, 3, false)).toBe(1);
    expect(nextFocusIndex(2, 3, false)).toBe(0);
  });

  it('com Shift+Tab volta e dá a volta no primeiro item', () => {
    expect(nextFocusIndex(2, 3, true)).toBe(1);
    expect(nextFocusIndex(0, 3, true)).toBe(2);
  });

  it('foco fora dos itens entra pelo primeiro (Tab) ou pelo último (Shift+Tab)', () => {
    expect(nextFocusIndex(-1, 4, false)).toBe(0);
    expect(nextFocusIndex(-1, 4, true)).toBe(3);
  });

  it('diálogo sem itens focáveis não tem para onde ir', () => {
    expect(nextFocusIndex(-1, 0, false)).toBe(-1);
    expect(nextFocusIndex(0, 0, true)).toBe(-1);
  });
});
