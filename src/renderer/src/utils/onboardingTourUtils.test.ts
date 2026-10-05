import { describe, it, expect, beforeEach, vi } from 'vitest';
import { areTourRectsEqual, computeTourTooltipStyle, findValidTourIndex } from './onboardingTourUtils';

const makeRect = (top: number, left: number, width: number, height: number): DOMRect =>
  ({ top, left, width, height, bottom: top + height, right: left + width, x: left, y: top }) as DOMRect;

describe('areTourRectsEqual', () => {
  it('tolera variação sub-pixel', () => {
    expect(areTourRectsEqual(makeRect(10, 10, 100, 50), makeRect(10.3, 10, 100, 50.4))).toBe(true);
    expect(areTourRectsEqual(makeRect(10, 10, 100, 50), makeRect(11, 10, 100, 50))).toBe(false);
  });
});

describe('computeTourTooltipStyle', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { innerWidth: 1000, innerHeight: 800 });
  });

  it('centraliza na tela quando não há alvo', () => {
    const style = computeTourTooltipStyle(null, { width: 300, height: 100 });
    expect(style.top).toBe('50%');
    expect(style.width).toBe(320);
  });

  it('posiciona abaixo quando há espaço', () => {
    const style = computeTourTooltipStyle(makeRect(100, 400, 100, 40), { width: 300, height: 100 });
    expect(style.top).toBe(154);
    expect(style.left).toBe(300);
  });

  it('posiciona acima quando falta espaço abaixo', () => {
    const style = computeTourTooltipStyle(makeRect(700, 400, 100, 40), { width: 300, height: 100 });
    expect(style.top).toBe(586);
  });

  it('respeita a margem horizontal', () => {
    const style = computeTourTooltipStyle(makeRect(100, 0, 20, 20), { width: 300, height: 100 });
    expect(style.left).toBe(16);
  });
});

describe('findValidTourIndex', () => {
  it('aceita passo com alvo nulo sem consultar o DOM', () => {
    const steps = [{ target: null, title: 'b', desc: 'b' }] as Parameters<typeof findValidTourIndex>[0];
    expect(findValidTourIndex(steps, 0, 1)).toBe(0);
    expect(findValidTourIndex(steps, 1, 1)).toBeNull();
  });
});
