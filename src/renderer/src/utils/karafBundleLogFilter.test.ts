import { describe, expect, it } from 'vitest';
import { bundleLogFilter } from './karafBundleLogFilter';

describe('bundleLogFilter', () => {
  it('prefere o nome simbólico', () => {
    expect(bundleLogFilter({ name: 'Meu App', symbolicName: ' com.acme.app ' })).toBe('com.acme.app');
  });

  it('cai para o nome de exibição e tolera vazio', () => {
    expect(bundleLogFilter({ name: 'Meu App' })).toBe('Meu App');
    expect(bundleLogFilter({ name: '' })).toBe('');
  });
});
