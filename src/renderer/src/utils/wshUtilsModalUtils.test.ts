import { describe, expect, it } from 'vitest';
import {
  wshUtilsModalCleanName,
  wshUtilsModalPrereqVisual,
  wshUtilsModalTabClass
} from './wshUtilsModalUtils';

describe('wshUtilsModalUtils', () => {
  it('remove apenas a barra inicial do nome do container', () => {
    expect(wshUtilsModalCleanName('/wsh-winthor')).toBe('wsh-winthor');
    expect(wshUtilsModalCleanName('wsh/local')).toBe('wsh/local');
  });

  it('classifica o pré-requisito conforme existência e obrigatoriedade', () => {
    expect(wshUtilsModalPrereqVisual({ exists: true, required: true }).label).toBe('Presente');
    expect(wshUtilsModalPrereqVisual({ exists: false, required: true }).label).toBe('Obrigatório Ausente');
    expect(wshUtilsModalPrereqVisual({ exists: false, required: false }).label).toBe('Opcional Ausente');
  });

  it('diferencia aba ativa e inativa', () => {
    expect(wshUtilsModalTabClass(true)).toContain('border-violet-500');
    expect(wshUtilsModalTabClass(false)).toContain('border-transparent');
  });
});
