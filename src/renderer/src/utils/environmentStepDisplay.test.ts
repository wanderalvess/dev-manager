import { describe, it, expect } from 'vitest';
import type { AutomationStep } from '../../../shared/types';
import { getLaunchModeLabel, isStepDone, appendCapped } from './environmentStepDisplay';

const makeStep = (type: string): AutomationStep => ({ id: 's', name: 'n', type }) as unknown as AutomationStep;

const base = { stepNumber: 1, isRunningProfile: false, activeStepIndex: 0, isPortUp: false };

describe('getLaunchModeLabel', () => {
  it('diferencia o modo padrão por tipo', () => {
    expect(getLaunchModeLabel('karaf', 'wt')).toBe('WT Abas');
    expect(getLaunchModeLabel('command', 'cmd')).toBe('CMD');
    expect(getLaunchModeLabel('karaf', 'x')).toBe('Console');
    expect(getLaunchModeLabel('command', 'x')).toBe('Background');
  });
});

describe('isStepDone', () => {
  it('considera etapas já ultrapassadas durante a execução', () => {
    expect(isStepDone({ ...base, step: makeStep('command'), isRunningProfile: true, activeStepIndex: 2 })).toBe(true);
    expect(isStepDone({ ...base, step: makeStep('command'), activeStepIndex: 2 })).toBe(false);
  });

  it('considera porta ativa', () => {
    expect(isStepDone({ ...base, step: makeStep('command'), isPortUp: true })).toBe(true);
  });

  it('avalia estado do serviço e do processo', () => {
    expect(isStepDone({ ...base, step: makeStep('service-start'), serviceState: 'RUNNING' })).toBe(true);
    expect(isStepDone({ ...base, step: makeStep('service-stop'), serviceState: 'RUNNING' })).toBe(false);
    expect(isStepDone({ ...base, step: makeStep('kill-process'), processIsRunning: false })).toBe(true);
    expect(isStepDone({ ...base, step: makeStep('kill-process') })).toBe(false);
  });
});

describe('appendCapped', () => {
  it('descarta as entradas mais antigas acima do limite', () => {
    expect(appendCapped([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
    expect(appendCapped([1], 2)).toEqual([1, 2]);
  });
});
