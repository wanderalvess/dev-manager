import { describe, expect, it } from 'vitest';
import {
  getBundleRowClass,
  getBundleStateBadgeClass,
  getBundleStateDotClass,
  getSelectAllTitle,
  isAllVisibleSelected,
  resolveKarafBundleTableView,
  shouldShowSymbolicName
} from './karafBundleTableView';

describe('resolveKarafBundleTableView', () => {
  const base = { isLoading: false, filteredCount: 0, totalCount: 0, karafStatus: 'ONLINE' as const };

  it('prioriza loading', () => {
    expect(resolveKarafBundleTableView({ ...base, isLoading: true, filteredCount: 3 })).toBe('loading');
  });
  it('mostra tabela quando há itens filtrados', () => {
    expect(resolveKarafBundleTableView({ ...base, filteredCount: 2, totalCount: 5 })).toBe('table');
  });
  it('distingue offline, starting e vazio', () => {
    expect(resolveKarafBundleTableView({ ...base, karafStatus: 'OFFLINE' })).toBe('offline');
    expect(resolveKarafBundleTableView({ ...base, karafStatus: 'STARTING' })).toBe('starting');
    expect(resolveKarafBundleTableView({ ...base, karafStatus: 'OFFLINE', totalCount: 4 })).toBe('empty');
    expect(resolveKarafBundleTableView(base)).toBe('empty');
  });
});

describe('seleção', () => {
  it('detecta todos selecionados', () => {
    expect(isAllVisibleSelected(0, 0)).toBe(false);
    expect(isAllVisibleSelected(3, 3)).toBe(true);
    expect(isAllVisibleSelected(3, 1)).toBe(false);
  });
  it('gera título do checkbox', () => {
    expect(getSelectAllTitle(3, 3)).toBe('Desmarcar todos');
    expect(getSelectAllTitle(3, 1)).toBe('Selecionar todos os bundles visíveis');
  });
});

describe('estilos de estado', () => {
  it('mapeia badge e ponto', () => {
    expect(getBundleStateBadgeClass('Active')).toContain('emerald');
    expect(getBundleStateBadgeClass('Resolved')).toContain('amber');
    expect(getBundleStateBadgeClass('Installed')).toContain('sky');
    expect(getBundleStateBadgeClass('Unknown')).toContain('bg-muted');
    expect(getBundleStateDotClass('Active')).toBe('bg-emerald-500');
    expect(getBundleStateDotClass('Resolved')).toBe('bg-amber-500');
    expect(getBundleStateDotClass('Unknown')).toBe('bg-sky-500');
  });
  it('classe da linha', () => {
    expect(getBundleRowClass(true)).toContain('bg-primary/5');
    expect(getBundleRowClass(false)).toContain('hover:bg-muted/40');
  });
});

describe('shouldShowSymbolicName', () => {
  it('oculta quando vazio ou igual ao nome', () => {
    expect(shouldShowSymbolicName({ name: 'a', symbolicName: undefined })).toBe(false);
    expect(shouldShowSymbolicName({ name: 'a', symbolicName: 'a' })).toBe(false);
    expect(shouldShowSymbolicName({ name: 'a', symbolicName: 'b' })).toBe(true);
  });
});
