import { describe, it, expect } from 'vitest';
import type { DeployProfile } from '../../../shared/types';
import {
  MAX_TERMINAL_LOG_LINES,
  appendCappedLogLines,
  splitStreamChunk,
  profileNeedsKaraf,
  duplicateDeployProfile,
  buildProfileExportFileName,
  buildImportedProfile,
  buildDiagnosticResultLines,
  countEnabledSteps,
  toggleProfileStep,
  toggleAllProfileSteps,
  failedStepContextPath,
  pickProfileSteps,
  sliceProfileFromStep
} from './deployProfileUtils';

const makeProfile = (steps: any[] = []): DeployProfile =>
  ({ id: 'p1', name: 'Meu Perfil', steps } as unknown as DeployProfile);

describe('deployProfileUtils', () => {
  it('limita as linhas do console', () => {
    const prev = Array.from({ length: MAX_TERMINAL_LOG_LINES }, (_, i) => `l${i}`);
    const next = appendCappedLogLines(prev, ['novo']);
    expect(next).toHaveLength(MAX_TERMINAL_LOG_LINES);
    expect(next[next.length - 1]).toBe('novo');
    expect(next[0]).toBe('l1');
  });

  it('separa chunk preservando linha parcial', () => {
    expect(splitStreamChunk('ab', 'c\r\nd\ne')).toEqual({ lines: ['abc', 'd'], remainder: 'e' });
  });

  it('detecta necessidade do Karaf', () => {
    expect(profileNeedsKaraf(null)).toBe(false);
    expect(profileNeedsKaraf(makeProfile([{ type: 'karaf-command' }]))).toBe(true);
    expect(profileNeedsKaraf(makeProfile([{ type: 'karaf-bundle', enabled: false }]))).toBe(false);
    expect(
      profileNeedsKaraf(makeProfile([{ type: 'karaf-command' }, { type: 'command', command: 'start karaf.bat' }]))
    ).toBe(false);
    expect(
      profileNeedsKaraf(makeProfile([{ type: 'karaf-bundle' }, { type: 'service-action', serviceAction: 'start' }]))
    ).toBe(false);
  });

  it('duplica perfil com novos ids', () => {
    const dup = duplicateDeployProfile(makeProfile([{ id: 's1', name: 'a' }]), 123);
    expect(dup.id).toBe('deploy-profile-123');
    expect(dup.name).toBe('Meu Perfil (Cópia)');
    expect(dup.steps[0].id).not.toBe('s1');
  });

  it('gera nome de arquivo de exportação', () => {
    expect(buildProfileExportFileName('Meu Perfil!')).toBe('perfil-deploy-meu-perfil-.json');
  });

  it('valida perfil importado', () => {
    expect(buildImportedProfile({ name: 'x' })).toBeNull();
    expect(buildImportedProfile(null)).toBeNull();
    const imp = buildImportedProfile({ name: 'x', steps: [] }, 5);
    expect(imp?.id).toBe('deploy-profile-5');
    expect(imp?.name).toBe('x (Importado)');
  });

  it('importação gera ids de etapa novos e rejeita etapas inválidas', () => {
    const file = { name: 'x', steps: [{ id: 's1', type: 'command' }, { id: 's2', type: 'command' }] };
    const first = buildImportedProfile(file, 1);
    const second = buildImportedProfile(file, 2);
    const ids = [...(first?.steps || []), ...(second?.steps || [])].map((s) => s.id);
    expect(new Set(ids).size).toBe(4);
    expect(ids).not.toContain('s1');
    expect(buildImportedProfile({ name: 'x', steps: [null] })).toBeNull();
    expect(buildImportedProfile({ name: 'x', steps: [{ id: 'a' }] })).toBeNull();
  });

  it('monta linhas do resultado de diagnóstico', () => {
    expect(buildDiagnosticResultLines('la', null)).toEqual([]);
    expect(buildDiagnosticResultLines('la', { code: 1, stderr: 'boom' })[0]).toContain('código de saída 1.\r\nboom');
    expect(buildDiagnosticResultLines('log:clear', { code: 0, stdout: '' })[0]).toContain('limpo com sucesso');
    expect(buildDiagnosticResultLines('log:display', { code: 0 })[0]).toContain('vazio');
    expect(buildDiagnosticResultLines('la', { code: 0 })[0]).toContain('nenhuma saída');
    expect(buildDiagnosticResultLines('la', { code: 0, stdout: 'x' })).toEqual([]);
  });

  it('conta etapas habilitadas e detecta estado indeterminado', () => {
    expect(countEnabledSteps(null)).toEqual({ enabledCount: 0, totalCount: 0, allEnabled: false, isIndeterminate: false });
    const p1 = makeProfile([{ id: 's1', enabled: true }, { id: 's2', enabled: false }]);
    expect(countEnabledSteps(p1)).toEqual({ enabledCount: 1, totalCount: 2, allEnabled: false, isIndeterminate: true });
    const p2 = makeProfile([{ id: 's1' }, { id: 's2', enabled: true }]);
    expect(countEnabledSteps(p2)).toEqual({ enabledCount: 2, totalCount: 2, allEnabled: true, isIndeterminate: false });
  });

  it('inverte estado enabled de uma etapa específica', () => {
    const p = makeProfile([{ id: 's1', enabled: true }, { id: 's2', enabled: false }]);
    const toggled1 = toggleProfileStep(p, 's1');
    expect(toggled1.steps[0].enabled).toBe(false);
    expect(toggled1.steps[1].enabled).toBe(false);
    const toggled2 = toggleProfileStep(p, 's2');
    expect(toggled2.steps[1].enabled).toBe(true);
  });

  it('habilita e desabilita todas as etapas', () => {
    const p = makeProfile([{ id: 's1', enabled: true }, { id: 's2', enabled: false }]);
    const allOn = toggleAllProfileSteps(p, true);
    expect(allOn.steps.every((s) => s.enabled === true)).toBe(true);
    const allOff = toggleAllProfileSteps(p, false);
    expect(allOff.steps.every((s) => s.enabled === false)).toBe(true);
  });

  it('fatia o perfil para executar a partir de um índice', () => {
    const p = makeProfile([
      { id: 's1', enabled: true },
      { id: 's2', enabled: true },
      { id: 's3', enabled: true }
    ]);
    const sliced = sliceProfileFromStep(p, 1);
    expect(sliced.steps[0].enabled).toBe(false);
    expect(sliced.steps[1].enabled).toBe(true);
    expect(sliced.steps[2].enabled).toBe(true);
    expect(sliced.name).toContain('etapa 2 em diante');
  });

  it('mantém o projeto de contexto herdado ao rodar só algumas etapas', () => {
    const p = makeProfile([
      { id: 's1', enabled: true, projectPath: '/ws/matcon' },
      { id: 's2', enabled: true },
      { id: 's3', enabled: true }
    ]);
    const picked = pickProfileSteps(p, ['s3']);
    expect(picked.steps.map((s) => s.enabled)).toEqual([false, false, true]);
    expect(picked.steps[2].projectPath).toBe('/ws/matcon');
    expect(picked.name).toContain('etapas selecionadas');
    expect(sliceProfileFromStep(p, 1).steps[1].projectPath).toBe('/ws/matcon');
  });

  it('acha o projeto de contexto da etapa que falhou', () => {
    const p = makeProfile([
      { id: 's1', enabled: true, projectPath: '/ws/varejo' },
      { id: 's2', enabled: true },
      { id: 's3', enabled: true }
    ]);
    expect(failedStepContextPath(p, { s3: { status: 'failed' } })).toBe('/ws/varejo');
    expect(failedStepContextPath(p, {})).toBe('/ws/varejo');
    expect(failedStepContextPath(null, {})).toBe('');
  });

  it('permite escolher etapa que estava desmarcada no perfil', () => {
    const p = makeProfile([
      { id: 's1', enabled: true },
      { id: 's2', enabled: false }
    ]);
    expect(pickProfileSteps(p, ['s2']).steps.map((s) => s.enabled)).toEqual([false, true]);
  });
});
