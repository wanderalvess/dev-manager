import { describe, expect, it } from 'vitest';
import {
  TABLES_RENDER_STEP,
  hasMoreTablesToRender,
  shouldLoadMoreOnScroll
} from './databaseSidebarRender';

describe('databaseSidebarRender', () => {
  it('detecta quando ainda há tabelas a renderizar', () => {
    expect(hasMoreTablesToRender(TABLES_RENDER_STEP + 1, TABLES_RENDER_STEP)).toBe(true);
    expect(hasMoreTablesToRender(TABLES_RENDER_STEP, TABLES_RENDER_STEP)).toBe(false);
  });

  it('carrega mais apenas perto do fim do scroll', () => {
    expect(shouldLoadMoreOnScroll(true, 800, 400, 1400)).toBe(true);
    expect(shouldLoadMoreOnScroll(true, 100, 400, 1400)).toBe(false);
    expect(shouldLoadMoreOnScroll(false, 1000, 400, 1400)).toBe(false);
  });
});
