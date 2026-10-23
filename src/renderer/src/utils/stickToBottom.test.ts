import { describe, it, expect } from 'vitest';
import { BOTTOM_THRESHOLD_PX, isNearBottom } from './stickToBottom';

describe('isNearBottom', () => {
  it('é verdadeiro quando está exatamente no fim', () => {
    expect(isNearBottom(1000, 600, 400)).toBe(true);
  });

  it('tolera uma folga pequena até o fim', () => {
    expect(isNearBottom(1000, 600 - BOTTOM_THRESHOLD_PX, 400)).toBe(true);
  });

  it('é falso quando o usuário rolou para cima além da folga', () => {
    expect(isNearBottom(1000, 600 - BOTTOM_THRESHOLD_PX - 1, 400)).toBe(false);
    expect(isNearBottom(1000, 0, 400)).toBe(false);
  });

  it('é verdadeiro quando o conteúdo cabe sem rolagem', () => {
    expect(isNearBottom(200, 0, 400)).toBe(true);
  });

  it('aceita uma folga personalizada', () => {
    expect(isNearBottom(1000, 550, 400, 50)).toBe(true);
    expect(isNearBottom(1000, 549, 400, 50)).toBe(false);
  });
});
