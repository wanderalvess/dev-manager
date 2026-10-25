import { describe, expect, it } from 'vitest';
import { getSplashTiming } from './splashTiming';
import { SPLASH_BOOT_LINES } from './onboardingContent';

const bootDuration = (isNewUser: boolean): number => {
  const { bootStartMs, lineMs } = getSplashTiming(isNewUser);
  return bootStartMs + SPLASH_BOOT_LINES.length * lineMs;
};

describe('getSplashTiming', () => {
  it('mantém a abertura completa para quem é novo', () => {
    expect(getSplashTiming(true)).toEqual({ bootStartMs: 1500, lineMs: 380 });
  });

  it('abre bem mais rápido para quem já usa o app', () => {
    expect(bootDuration(false)).toBeLessThan(bootDuration(true) / 2);
    expect(bootDuration(false)).toBeLessThanOrEqual(1500);
  });
});
