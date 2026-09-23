import { describe, expect, it } from 'vitest';
import { filterDocFiles, ALL_SOURCES_FILTER } from './docsPageUtils';
import type { DocFileInfo } from '../../../shared/types';

function makeFile(overrides: Partial<DocFileInfo>): DocFileInfo {
  return { id: 'f1', title: 'Manual do Usuário', sourceLabel: 'Confluence', chunkCount: 3, ...overrides };
}

describe('filterDocFiles', () => {
  const files: DocFileInfo[] = [
    makeFile({ id: '1', title: 'Manual de Faturamento', sourceLabel: 'Confluence' }),
    makeFile({ id: '2', title: 'API de Pagamentos', sourceLabel: 'Jira' }),
    makeFile({ id: '3', title: 'README Backend', sourceLabel: 'Git' })
  ];

  it(`com sourceFilter "${ALL_SOURCES_FILTER}" e sem termo, devolve todos os arquivos`, () => {
    expect(filterDocFiles(files, ALL_SOURCES_FILTER, '')).toEqual(files);
  });

  it('filtra por fonte quando sourceFilter é diferente de TODOS', () => {
    const result = filterDocFiles(files, 'Jira', '');
    expect(result.map((f) => f.id)).toEqual(['2']);
  });

  it('filtra por título, case-insensitive', () => {
    const result = filterDocFiles(files, ALL_SOURCES_FILTER, 'faturamento');
    expect(result.map((f) => f.id)).toEqual(['1']);
  });

  it('combina fonte e título (E lógico)', () => {
    const result = filterDocFiles(files, 'Git', 'readme');
    expect(result.map((f) => f.id)).toEqual(['3']);
    expect(filterDocFiles(files, 'Confluence', 'readme')).toEqual([]);
  });

  it('termo com espaços em branco não filtra nada', () => {
    expect(filterDocFiles(files, ALL_SOURCES_FILTER, '   ')).toEqual(files);
  });
});
