import { describe, it, expect } from 'vitest';
import { HELP_OVERVIEW_STEPS } from './helpOverviewSteps';
import { HELP_OVERVIEW_MODULES } from './helpOverviewModules';

describe('helpOverview data', () => {
  it('mantém 5 passos numerados em sequência', () => {
    expect(HELP_OVERVIEW_STEPS.map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('injeta a porta de debug no chip do passo 1', () => {
    expect(HELP_OVERVIEW_STEPS[0].chips(5005)[0]).toBe(':5005 JDWP');
  });

  it('não repete atalhos de teclado entre módulos', () => {
    const shortcuts = HELP_OVERVIEW_MODULES.map((m) => m.shortcut).filter(Boolean);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
  });

  it('não repete destinos de navegação entre módulos', () => {
    const targets = HELP_OVERVIEW_MODULES.map((m) => m.navTarget);
    expect(new Set(targets).size).toBe(targets.length);
  });
});
