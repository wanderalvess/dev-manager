import { describe, expect, it } from 'vitest';
import { fuzzyMatch, fuzzyMatchBest } from './fuzzyMatch';

describe('fuzzyMatch', () => {
  it('retorna score 0 e nenhum índice para query vazia', () => {
    expect(fuzzyMatch('', 'Ambiente Dev')).toEqual({ score: 0, matchedIndices: [] });
  });

  it('não casa quando o alvo está vazio', () => {
    expect(fuzzyMatch('abc', '')).toEqual({ score: -1, matchedIndices: [] });
  });

  it('casa substring contígua no início com bônus máximo', () => {
    const result = fuzzyMatch('amb', 'Ambiente Dev');
    expect(result.matchedIndices).toEqual([0, 1, 2]);
    expect(result.score).toBeGreaterThan(200);
  });

  it('casa substring contígua no meio com bônus menor que no início', () => {
    const atStart = fuzzyMatch('dev', 'Dev Ambiente');
    const inMiddle = fuzzyMatch('amb', 'Dev Ambiente');
    expect(atStart.score).toBeGreaterThan(inMiddle.score);
  });

  it('casa caracteres fora de ordem contígua via subsequence', () => {
    const result = fuzzyMatch('dbg', 'Deploy Backup Git');
    expect(result.score).toBeGreaterThan(0);
    expect(result.matchedIndices).toHaveLength(3);
    expect(result.matchedIndices).toEqual([...result.matchedIndices].sort((a, b) => a - b));
  });

  it('não casa quando faltam caracteres da query', () => {
    expect(fuzzyMatch('xyz', 'Ambiente Dev')).toEqual({ score: 0, matchedIndices: [] });
  });

  it('é case-insensitive', () => {
    const lower = fuzzyMatch('rout', 'Rotinas');
    const upper = fuzzyMatch('ROUT', 'rotinas');
    expect(lower.score).toBe(upper.score);
  });

  it('dá bônus extra para casamento em início de palavra', () => {
    const wordStart = fuzzyMatch('gc', 'Git Console'); // G(0) + C(início de "Console")
    const noWordStart = fuzzyMatch('it', 'Git Console'); // i,t dentro da mesma palavra, sem boundary bonus
    expect(wordStart.score).toBeGreaterThan(0);
    expect(noWordStart.score).toBeGreaterThan(0);
  });

  it('prioriza sequências contíguas sobre espalhadas com mesmo tamanho de query', () => {
    const contiguous = fuzzyMatch('git', 'Git Hub Integration Tool');
    const scattered = fuzzyMatch('git', 'Go Install Test');
    expect(contiguous.score).toBeGreaterThan(scattered.score);
  });

  it('penaliza levemente alvos muito mais longos que a query em fuzzy match', () => {
    const short = fuzzyMatch('rn', 'Rotina');
    const long = fuzzyMatch('rn', 'Rotina de Backup Automatizado Completo XYZ');
    expect(short.score).toBeGreaterThan(long.score);
  });
});

describe('fuzzyMatchBest', () => {
  it('retorna fieldIndex -1 para query vazia', () => {
    expect(fuzzyMatchBest('', ['Ambiente', 'Cockpit'])).toEqual({
      score: 0,
      matchedIndices: [],
      fieldIndex: -1
    });
  });

  it('escolhe o campo com melhor score entre vários', () => {
    const result = fuzzyMatchBest('git', ['Configurações do Sistema', 'Git & Azure DevOps Hub']);
    expect(result.fieldIndex).toBe(1);
    expect(result.score).toBeGreaterThan(0);
  });

  it('retorna fieldIndex -1 quando nenhum campo casa', () => {
    const result = fuzzyMatchBest('zzz', ['Ambiente', 'Database']);
    expect(result.fieldIndex).toBe(-1);
    expect(result.matchedIndices).toEqual([]);
  });
});
