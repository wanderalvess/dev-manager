import { describe, expect, it } from 'vitest';
import {
  appendConsoleEntries,
  capConsoleEntries,
  clampDockHeight,
  DOCK_DEFAULT_HEIGHT,
  DOCK_MIN_HEIGHT
} from './karafConsoleBuffer';

describe('karafConsoleBuffer', () => {
  it('mantém só as entradas mais recentes', () => {
    expect(capConsoleEntries([1, 2, 3, 4], 2)).toEqual([3, 4]);
    expect(capConsoleEntries([1, 2], 5)).toEqual([1, 2]);
  });

  it('acrescenta respeitando o limite', () => {
    expect(appendConsoleEntries(['a', 'b'], ['c', 'd'], 3)).toEqual(['b', 'c', 'd']);
  });

  it('limita a altura do dock', () => {
    expect(clampDockHeight(50, 1000)).toBe(DOCK_MIN_HEIGHT);
    expect(clampDockHeight(900, 1000)).toBe(700);
    expect(clampDockHeight(300, 1000)).toBe(300);
    expect(clampDockHeight(Number.NaN, 1000)).toBe(DOCK_DEFAULT_HEIGHT);
  });
});
