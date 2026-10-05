import { describe, expect, it } from 'vitest';
import {
  containerCardGaugeTone,
  containerCardGaugeWidth,
  containerCardKinds,
  containerCardParsePercent
} from './containerCardKind';

describe('containerCardKinds', () => {
  it('classifica por nome sem diferenciar maiusculas', () => {
    expect(containerCardKinds('Oracle-XE')).toEqual({ isOracle: true, isWta: false, isWsh: false });
    expect(containerCardKinds('linux-winthor')).toEqual({ isOracle: false, isWta: true, isWsh: false });
    expect(containerCardKinds('wsh-hub')).toEqual({ isOracle: false, isWta: false, isWsh: true });
    expect(containerCardKinds('redis')).toEqual({ isOracle: false, isWta: false, isWsh: false });
  });
});

describe('containerCardParsePercent', () => {
  it('converte e tolera invalidos', () => {
    expect(containerCardParsePercent('12.5%')).toBe(12.5);
    expect(containerCardParsePercent('--')).toBe(0);
    expect(containerCardParsePercent(undefined)).toBe(0);
  });
});

describe('containerCardGauge', () => {
  it('define o tom pelos limites', () => {
    expect(containerCardGaugeTone(81, 50, 80)).toBe('critical');
    expect(containerCardGaugeTone(80, 50, 80)).toBe('warning');
    expect(containerCardGaugeTone(50, 50, 80)).toBe('normal');
  });
  it('limita a largura entre 4% e 100%', () => {
    expect(containerCardGaugeWidth(0)).toBe('4%');
    expect(containerCardGaugeWidth(150)).toBe('100%');
    expect(containerCardGaugeWidth(33)).toBe('33%');
  });
});
