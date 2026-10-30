import { describe, expect, it } from 'vitest';
import { VALIDATION_SCENARIOS, resolveScenarioId } from './validationScenarios';

describe('validationScenarios', () => {
  it('ids únicos e com rótulo e descrição', () => {
    const ids = VALIDATION_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of VALIDATION_SCENARIOS) {
      expect(s.label).not.toBe('');
      expect(s.description.length).toBeGreaterThan(20);
    }
  });

  it('aba lembrada desconhecida ou vazia volta para o primeiro cenário', () => {
    expect(resolveScenarioId('auth-lockout')).toBe('auth-lockout');
    expect(resolveScenarioId('cenario-removido')).toBe(VALIDATION_SCENARIOS[0].id);
    expect(resolveScenarioId(null)).toBe(VALIDATION_SCENARIOS[0].id);
  });
});
