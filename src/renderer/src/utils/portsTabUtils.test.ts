import { describe, expect, it } from 'vitest';
import { QUICK_PORT_PRESETS, normalizeWebPath, parsePortInput, webPathToInput } from './portsTabUtils';

describe('portsTabUtils', () => {
  it('parsePortInput converte texto e zera inválidos', () => {
    expect(parsePortInput('8101')).toBe(8101);
    expect(parsePortInput('')).toBe(0);
    expect(parsePortInput('abc')).toBe(0);
  });

  it('normalizeWebPath garante uma única barra inicial', () => {
    expect(normalizeWebPath('web')).toBe('/web');
    expect(normalizeWebPath('/web')).toBe('/web');
    expect(normalizeWebPath('')).toBe('');
  });

  it('webPathToInput remove a barra inicial', () => {
    expect(webPathToInput('/web')).toBe('web');
    expect(webPathToInput(undefined)).toBe('');
  });

  it('QUICK_PORT_PRESETS mantém os 8 atalhos originais', () => {
    expect(QUICK_PORT_PRESETS.map((p) => p.port)).toEqual([8889, 8181, 8101, 8080, 5005, 1521, 6379, 8085]);
  });
});
