import { describe, it, expect } from 'vitest';
import { NAV_THEME_GROUPS } from './headerNavConfig';

describe('headerNavConfig', () => {
  it('contém exatamente os 4 grupos principais do cockpit', () => {
    expect(NAV_THEME_GROUPS.map((g) => g.id)).toEqual(['infra', 'data', 'dev', 'qa']);
  });

  it('todos os grupos possuem títulos compactos menores ou iguais aos títulos curtos', () => {
    for (const group of NAV_THEME_GROUPS) {
      expect(group.compactTitle).toBeDefined();
      expect(group.compactTitle.length).toBeLessThanOrEqual(group.shortTitle.length);
      expect(group.compactTitle.length).toBeGreaterThan(0);
    }
  });

  it('todos os itens de navegação possuem IDs únicos e atalhos válidos', () => {
    const itemIds = new Set<string>();
    const shortcuts = new Set<string>();

    for (const group of NAV_THEME_GROUPS) {
      expect(group.items.length).toBeGreaterThan(0);
      for (const item of group.items) {
        expect(itemIds.has(item.id)).toBe(false);
        itemIds.add(item.id);

        // Atalho é opcional (subpáginas como as de Qualidade não têm Alt+N); quando existe, é único
        if (item.shortcut) {
          expect(shortcuts.has(item.shortcut)).toBe(false);
          shortcuts.add(item.shortcut);
          expect(item.shortcut).toMatch(/^Alt\+[0-9Q]$/);
        }

        expect(item.label).toBeDefined();
        expect(item.shortLabel).toBeDefined();
        expect(item.description).toBeDefined();
      }
    }
  });
});
