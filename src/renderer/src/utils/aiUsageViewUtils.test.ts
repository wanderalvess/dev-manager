import { describe, expect, it } from 'vitest';
import { describeLimits, formatTokens, limitPercent, parseOptionalNumber } from './aiUsageViewUtils';

describe('aiUsageViewUtils', () => {
  it('abrevia tokens grandes', () => {
    expect(formatTokens(950)).toBe('950');
    expect(formatTokens(25_000)).toBe('25 mil');
    expect(formatTokens(100_000)).toBe('100 mil');
    expect(formatTokens(12_500)).toBe('12,5 mil');
    expect(formatTokens(2_500_000)).toBe('2,50 mi');
  });

  it('calcula o percentual do teto, limitado a 100', () => {
    expect(limitPercent(50, 200)).toBe(25);
    expect(limitPercent(500, 200)).toBe(100);
    expect(limitPercent(5, undefined)).toBeNull();
  });

  it('descreve só os tetos definidos', () => {
    expect(describeLimits(undefined)).toBeNull();
    expect(
      describeLimits({ providerId: 'p', providerName: 'P', dayUsed: 10, monthUsed: 20, dayLimit: 100, level: 'ok' })
    ).toBe('hoje 10/100');
  });

  it('campo vazio ou inválido vira undefined', () => {
    expect(parseOptionalNumber('', true)).toBeUndefined();
    expect(parseOptionalNumber('abc', true)).toBeUndefined();
    expect(parseOptionalNumber('-3', true)).toBeUndefined();
    expect(parseOptionalNumber('1500,7', true)).toBe(1500);
    expect(parseOptionalNumber('2,5', false)).toBe(2.5);
  });
});
