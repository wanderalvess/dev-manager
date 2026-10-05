import { describe, it, expect } from 'vitest';
import type { AutomationProfile } from '../../../shared/types';
import {
  buildProfileExportData,
  buildExportFileName,
  buildDuplicatedProfile,
  buildImportedProfile,
  upsertProfile,
  setStepEnabled
} from './environmentProfileTransfer';

const makeProfile = (id: string, stepIds: string[] = ['s1', 's2']): AutomationProfile =>
  ({
    id,
    name: `Perfil ${id}`,
    description: 'desc',
    isDefault: true,
    steps: stepIds.map((sid) => ({ id: sid, name: `Etapa ${sid}`, type: 'command', enabled: true }))
  }) as unknown as AutomationProfile;

describe('buildProfileExportData', () => {
  it('aplica defaults e remove ids', () => {
    const data = buildProfileExportData(makeProfile('a'), new Date('2026-01-01T00:00:00Z'));
    expect(data.type).toBe('dev-manager-automation-profile');
    expect(data.exportedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(data.profile.steps[0]).toMatchObject({ launchMode: 'wt', delayAfterSeconds: 2, waitForPort: false });
    expect(data.profile.steps[0]).not.toHaveProperty('id');
  });
});

describe('buildExportFileName', () => {
  it('remove acentos e caracteres especiais', () => {
    expect(buildExportFileName('Preparação Ágil!')).toBe('perfil-preparacao_agil_.json');
  });
});

describe('buildDuplicatedProfile', () => {
  it('gera novos ids e marca como cópia', () => {
    const src = makeProfile('a');
    const dup = buildDuplicatedProfile(src);
    expect(dup.id).not.toBe(src.id);
    expect(dup.name).toBe('Perfil a (Cópia)');
    expect(dup.isDefault).toBe(false);
    expect(dup.steps.every((s) => s.id.startsWith('step-'))).toBe(true);
  });
});

describe('buildImportedProfile', () => {
  it('aceita formato exportado e formato direto', () => {
    expect(buildImportedProfile({ profile: { name: 'X', steps: [{}] } })?.name).toBe('X (Importado)');
    const direct = buildImportedProfile({ steps: [{ name: 'A' }] });
    expect(direct?.name).toBe('Perfil Importado');
    expect(direct?.steps[0]).toMatchObject({ name: 'A', type: 'command', launchMode: 'wt' });
  });

  it('rejeita JSON sem lista de etapas', () => {
    expect(buildImportedProfile({ foo: 1 })).toBeNull();
    expect(buildImportedProfile({ profile: { steps: 'x' } })).toBeNull();
  });
});

describe('upsertProfile', () => {
  it('substitui existente e anexa novo', () => {
    const list = [makeProfile('a'), makeProfile('b')];
    const renamed = { ...list[0], name: 'Novo' };
    expect(upsertProfile(list, renamed)[0].name).toBe('Novo');
    expect(upsertProfile(list, makeProfile('c'))).toHaveLength(3);
  });
});

describe('setStepEnabled', () => {
  it('altera apenas o passo indicado', () => {
    const list = [makeProfile('a'), makeProfile('b')];
    const { profiles, activeId } = setStepEnabled(list, list[0], 's1', false);
    expect(activeId).toBe('a');
    expect(profiles[0].steps[0].enabled).toBe(false);
    expect(profiles[0].steps[1].enabled).toBe(true);
    expect(profiles[1]).toBe(list[1]);
  });
});
