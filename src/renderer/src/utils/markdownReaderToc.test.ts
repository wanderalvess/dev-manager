import { describe, expect, it } from 'vitest';
import { computeReadingStats, extractHeadings } from './markdownReaderToc';
import { buildSearchRegex } from './markdownReaderSearch';

describe('extractHeadings', () => {
  it('ignora títulos dentro de blocos de código e limpa marcações', () => {
    const content = '# **Título**\n```\n# fora\n```\n## Seção `x`';
    expect(extractHeadings(content)).toEqual([
      { id: 'heading-0-t-tulo', level: 1, text: 'Título' },
      { id: 'heading-4-se-o-x', level: 2, text: 'Seção x' }
    ]);
  });

  it('retorna vazio sem conteúdo', () => {
    expect(extractHeadings('')).toEqual([]);
  });
});

describe('computeReadingStats', () => {
  it('garante no mínimo 1 minuto de leitura', () => {
    expect(computeReadingStats('uma duas três')).toMatchObject({ words: 3, readTimeMinutes: 1 });
  });

  it('calcula minutos por 200 palavras', () => {
    expect(computeReadingStats('a '.repeat(401)).readTimeMinutes).toBe(3);
  });
});

describe('buildSearchRegex', () => {
  it('inativa para termos curtos', () => {
    expect(buildSearchRegex(' a ')).toBeNull();
  });

  it('escapa metacaracteres', () => {
    const regex = buildSearchRegex('a.b');
    expect(regex?.source).toBe('(a\\.b)');
    expect('axb a.b'.split(regex as RegExp)).toEqual(['axb ', 'a.b', '']);
  });
});
