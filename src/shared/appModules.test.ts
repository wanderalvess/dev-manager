import { describe, expect, it } from 'vitest';
import { APP_MODULE_IDS, getEnabledModuleIds, isModuleEnabled, normalizeDisabledModules } from './appModules';

describe('normalizeDisabledModules', () => {
  it('descarta valores que não são lista, ids desconhecidos e repetidos, na ordem da navegação', () => {
    expect(normalizeDisabledModules(undefined)).toEqual([]);
    expect(normalizeDisabledModules('apm')).toEqual([]);
    expect(normalizeDisabledModules(['git', 'help', 'apm', 'git', 42])).toEqual(['apm', 'git']);
  });

  it('religa o primeiro módulo quando todos chegam desligados', () => {
    const result = normalizeDisabledModules([...APP_MODULE_IDS]);
    expect(result).toHaveLength(APP_MODULE_IDS.length - 1);
    expect(result).not.toContain(APP_MODULE_IDS[0]);
  });
});

describe('isModuleEnabled / getEnabledModuleIds', () => {
  it('Ajuda e Configurações nunca são desligáveis', () => {
    expect(isModuleEnabled('help', ['help'])).toBe(true);
    expect(isModuleEnabled('settings', ['settings'])).toBe(true);
  });

  it('respeita a lista de desligados e trata ausência como tudo ligado', () => {
    expect(isModuleEnabled('apm', ['apm'])).toBe(false);
    expect(isModuleEnabled('apm', undefined)).toBe(true);
    expect(getEnabledModuleIds(['env', 'apm'])).toEqual(APP_MODULE_IDS.filter((id) => id !== 'env' && id !== 'apm'));
  });
});
