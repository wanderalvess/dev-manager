import { describe, expect, it } from 'vitest';
import type { DeployStep } from './types';
import { resolveContextProjectPath } from './deployContext';

const makeStep = (id: string, projectPath?: string): DeployStep =>
  ({ id, name: id, type: 'karaf-bundle', projectPath }) as DeployStep;

describe('resolveContextProjectPath', () => {
  it('prefere o projeto da própria etapa', () => {
    const steps = [makeStep('a', 'p1'), makeStep('b', 'p2')];
    expect(resolveContextProjectPath(steps, 1)).toBe('p2');
  });

  it('herda da etapa anterior mais próxima, não do primeiro projeto do perfil', () => {
    const steps = [makeStep('a', 'p1'), makeStep('b', 'p2'), makeStep('c')];
    expect(resolveContextProjectPath(steps, 2)).toBe('p2');
  });

  it('usa o primeiro projeto do perfil quando nenhuma etapa anterior tem projeto', () => {
    const steps = [makeStep('a'), makeStep('b', 'p2')];
    expect(resolveContextProjectPath(steps, 0)).toBe('p2');
  });

  it('devolve undefined quando nenhuma etapa tem projeto', () => {
    expect(resolveContextProjectPath([makeStep('a')], 0)).toBeUndefined();
  });
});
