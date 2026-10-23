import { describe, it, expect } from 'vitest';
import { filterTextLines } from './textLineFilter';

describe('filterTextLines', () => {
  const text = 'linha 1: iniciando\nlinha 2: ERRO ao conectar\nlinha 3: finalizado';

  it('retorna o texto original quando não há termo de busca', () => {
    expect(filterTextLines(text, '')).toBe(text);
    expect(filterTextLines(text, '   ')).toBe(text);
  });

  it('filtra só as linhas que contêm o termo, case-insensitive', () => {
    expect(filterTextLines(text, 'erro')).toBe('linha 2: ERRO ao conectar');
  });

  it('retorna string vazia quando nenhuma linha bate', () => {
    expect(filterTextLines(text, 'inexistente')).toBe('');
  });
});
