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
  navigateCommandHistory
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

  it('monta linhas do resultado de diagnóstico', () => {
    expect(buildDiagnosticResultLines('la', null)).toEqual([]);
    expect(buildDiagnosticResultLines('la', { code: 1, stderr: 'boom' })[0]).toContain('código de saída 1.\r\nboom');
    expect(buildDiagnosticResultLines('log:clear', { code: 0, stdout: '' })[0]).toContain('limpo com sucesso');
    expect(buildDiagnosticResultLines('log:display', { code: 0 })[0]).toContain('vazio');
    expect(buildDiagnosticResultLines('la', { code: 0 })[0]).toContain('nenhuma saída');
    expect(buildDiagnosticResultLines('la', { code: 0, stdout: 'x' })).toEqual([]);
  });

  it('navega no histórico de comandos', () => {
    const h = ['a', 'b'];
    expect(navigateCommandHistory([], -1, 'up')).toBeNull();
    expect(navigateCommandHistory(h, -1, 'up')).toEqual({ index: 1, value: 'b' });
    expect(navigateCommandHistory(h, 0, 'up')).toEqual({ index: 0, value: 'a' });
    expect(navigateCommandHistory(h, -1, 'down')).toBeNull();
    expect(navigateCommandHistory(h, 0, 'down')).toEqual({ index: 1, value: 'b' });
    expect(navigateCommandHistory(h, 1, 'down')).toEqual({ index: -1, value: '' });
  });
});
