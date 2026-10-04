import { describe, it, expect } from 'vitest';
import {
  clampActiveIndex,
  countAssertions,
  createBlankTemplate,
  createNewAssertion,
  createNewStep,
  duplicateTemplate,
  isValidImportedTemplate,
  replaceAssertionAt,
  replaceStepAt
} from './qaTemplatesManagerUtils';

describe('qaTemplatesManagerUtils', () => {
  it('createBlankTemplate gera ids derivados do timestamp', () => {
    const t = createBlankTemplate(1000);
    expect(t.id).toBe('template-1000');
    expect(t.steps[0].id).toBe('step-1000');
    expect(t.steps[0].assertions[0].id).toBe('ass-1000');
  });

  it('duplicateTemplate preserva passos e ajusta id/nome', () => {
    const base = createBlankTemplate(1);
    const dup = duplicateTemplate(base, 2);
    expect(dup.id).toBe('template-1-copia-2');
    expect(dup.name).toBe(`${base.name} (Cópia)`);
    expect(dup.steps).toBe(base.steps);
  });

  it('createNewStep numera pelo total existente', () => {
    expect(createNewStep(2, 5).title).toBe('Novo Passo 3');
    expect(createNewAssertion(7).id).toBe('ass-7');
  });

  it('replaceStepAt e replaceAssertionAt não mutam o original', () => {
    const base = createBlankTemplate(1);
    const step = { ...base.steps[0], title: 'X' };
    const next = replaceStepAt(base, 0, step);
    expect(next.steps[0].title).toBe('X');
    expect(base.steps[0].title).not.toBe('X');

    const ass = { ...base.steps[0].assertions[0], column: 'Y' };
    const next2 = replaceAssertionAt(base, 0, 0, ass);
    expect(next2.steps[0].assertions[0].column).toBe('Y');
    expect(base.steps[0].assertions[0].column).toBe('CODFILIAL');
  });

  it('clampActiveIndex ajusta para o último índice válido', () => {
    expect(clampActiveIndex(2, 2)).toBe(1);
    expect(clampActiveIndex(0, 0)).toBe(0);
    expect(clampActiveIndex(0, 3)).toBe(0);
  });

  it('isValidImportedTemplate exige id, name e steps array', () => {
    expect(isValidImportedTemplate({ id: 'a', name: 'b', steps: [] })).toBe(true);
    expect(isValidImportedTemplate({ id: 'a', name: 'b' })).toBe(false);
    expect(isValidImportedTemplate({ name: 'b', steps: [] })).toBe(false);
  });

  it('countAssertions soma asserções de todos os passos', () => {
    expect(countAssertions(createBlankTemplate(1))).toBe(1);
  });
});
