import { describe, expect, it } from 'vitest';
import { countChangedSettingsKeys } from './settingsDiff';

describe('countChangedSettingsKeys', () => {
  it('é zero quando nada mudou', () => {
    expect(countChangedSettingsKeys({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2] })).toBe(0);
  });

  it('conta cada chave alterada uma vez, inclusive listas e objetos', () => {
    expect(countChangedSettingsKeys({ a: 1, b: [1], c: { x: 1 } }, { a: 2, b: [1, 2], c: { x: 2 } })).toBe(3);
  });

  it('conta chave nova e chave removida', () => {
    expect(countChangedSettingsKeys({ a: 1 }, { b: 1 })).toBe(2);
  });

  it('ignora chave ausente de um lado e undefined do outro', () => {
    expect(countChangedSettingsKeys({ a: 1 }, { a: 1, b: undefined })).toBe(0);
  });
});
