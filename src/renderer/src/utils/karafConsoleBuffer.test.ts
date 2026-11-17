import { describe, expect, it } from 'vitest';
import {
  DOCK_DEFAULT_WIDTH,
  DOCK_MAX_WIDTH,
  DOCK_MIN_WIDTH,
  clampConsoleWidth
} from './karafConsoleBuffer';

describe('karafConsoleBuffer', () => {
  it('clamps console panel width between min and max bounds', () => {
    expect(clampConsoleWidth(120)).toBe(DOCK_MIN_WIDTH);
    expect(clampConsoleWidth(1500)).toBe(DOCK_MAX_WIDTH);
    expect(clampConsoleWidth(480.4)).toBe(480);
  });

  it('falls back to default width for non-finite values', () => {
    expect(clampConsoleWidth(Number.NaN)).toBe(DOCK_DEFAULT_WIDTH);
    expect(clampConsoleWidth(Number.POSITIVE_INFINITY)).toBe(DOCK_DEFAULT_WIDTH);
  });
});
