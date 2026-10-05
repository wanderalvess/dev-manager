import { describe, expect, it } from 'vitest';
import {
  buildAnchoredTautKeyRegex,
  buildTautKeyRegex,
  describeTautKeyPattern,
  normalizeTautKeyPrefix
} from './tautKeyUtils';

describe('tautKeyUtils', () => {
  it('sem prefixo aceita qualquer projeto no formato ABC-T123', () => {
    const regex = buildTautKeyRegex(undefined, 'g');
    expect('ABC-T12 e XYZ9-T7 mas não abc-T1 nem T12'.match(regex)).toEqual(['ABC-T12', 'XYZ9-T7']);
  });

  it('com prefixo restringe às chaves daquele projeto', () => {
    const regex = buildTautKeyRegex('PROJ-T', 'g');
    expect('PROJ-T10 OUTRO-T20'.match(regex)).toEqual(['PROJ-T10']);
  });

  it('descarta prefixo com caracteres inválidos (evita injeção em regex)', () => {
    expect(normalizeTautKeyPrefix('PROJ-T')).toBe('PROJ-T');
    expect(normalizeTautKeyPrefix('.*')).toBe('');
    expect(normalizeTautKeyPrefix('  ')).toBe('');
  });

  it('versão ancorada só casa no início da linha', () => {
    const regex = buildAnchoredTautKeyRegex('PROJ-T');
    expect(regex.test('PROJ-T5,nome')).toBe(true);
    expect(regex.test('x PROJ-T5')).toBe(false);
  });

  it('descreve o padrão para mensagens ao usuário', () => {
    expect(describeTautKeyPattern('PROJ-T')).toBe('PROJ-TXXXX');
    expect(describeTautKeyPattern()).toBe('PROJ-TXXXX');
  });
});
