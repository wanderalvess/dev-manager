import { describe, expect, it } from 'vitest';
import type { DeployStep } from '../../../shared/types';
import {
  buildInitialEditorState,
  createDeployStep,
  duplicateStepAt,
  parseIntMin,
  parseOptionalInt,
  stepTypeDefaultName
} from './deployEditorUtils';

const makeStep = (id: string, name = id): DeployStep => ({
  id,
  name,
  type: 'command',
  enabled: true,
  cwd: ''
});

describe('deployEditorUtils', () => {
  it('nomeia passos por tipo', () => {
    expect(stepTypeDefaultName('maven-build')).toBe('Build Maven');
    expect(stepTypeDefaultName('wait')).toBe('Aguardar Inicialização');
  });

  it('cria passo com defaults por tipo', () => {
    expect(createDeployStep('maven-build', 'x').skipTests).toBe(true);
    expect(createDeployStep('karaf-command', 'x').command).toBe('');
    expect(createDeployStep('wait', 'x').command).toBeUndefined();
  });

  it('monta estado inicial para perfil novo e existente', () => {
    const fresh = buildInitialEditorState(null, 10);
    expect(fresh.steps[0].id).toBe('deploy-step-10-1');
    expect(fresh.editingStepIndex).toBe(0);

    const existing = buildInitialEditorState(
      { id: 'p', name: 'A', description: 'B', steps: [makeStep('s1')] },
      10
    );
    expect(existing.name).toBe('A');
    expect(existing.editingStepIndex).toBe(0);
    expect(buildInitialEditorState({ id: 'p', name: '', steps: [] }, 1).editingStepIndex).toBeNull();
  });

  it('duplica inserindo logo após o original', () => {
    const result = duplicateStepAt([makeStep('a'), makeStep('b')], 0, 'n');
    expect(result?.map((s) => s.id)).toEqual(['a', 'n', 'b']);
    expect(result?.[1].name).toBe('a (Cópia)');
    expect(duplicateStepAt([], 0, 'n')).toBeNull();
  });

  it('interpreta inteiros dos campos numéricos', () => {
    expect(parseIntMin('', 5)).toBe(5);
    expect(parseIntMin('0', 5)).toBe(5);
    expect(parseIntMin('-3', 1)).toBe(1);
    expect(parseIntMin('30', 5)).toBe(30);
    expect(parseOptionalInt('')).toBeUndefined();
    expect(parseOptionalInt('12')).toBe(12);
  });
});
