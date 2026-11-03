import { describe, expect, it } from 'vitest';
import { countdownSeconds, getSplashTiming } from './splashTiming';
import { SPLASH_BOOT_ITEMS } from './onboardingContent';

const bootDuration = (isNewUser: boolean): number => {
  const { bootStartMs, lineMs } = getSplashTiming(isNewUser);
  return bootStartMs + SPLASH_BOOT_ITEMS.length * lineMs;
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

describe('countdownSeconds', () => {
  it('arredonda para cima e nunca fica negativo', () => {
    expect(countdownSeconds(3000)).toBe(3);
    expect(countdownSeconds(2001)).toBe(3);
    expect(countdownSeconds(1)).toBe(1);
    expect(countdownSeconds(-50)).toBe(0);
  });
});
