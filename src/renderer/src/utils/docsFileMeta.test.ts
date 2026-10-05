import { describe, expect, it } from 'vitest';
import { deriveDocFolderLabel, getDocFileDisplayMeta, upsertById } from './docsFileMeta';

describe('getDocFileDisplayMeta', () => {
  it('extrai nome, extensão e pasta pai', () => {
    expect(getDocFileDisplayMeta('proj/docs/README.md')).toEqual({
      fileName: 'README.md',
      ext: 'MD',
      parentFolder: 'docs'
    });
  });

  it('aceita separador de Windows', () => {
    expect(getDocFileDisplayMeta('proj\\guia.txt').parentFolder).toBe('proj');
  });

  it('usa DOC e sem pasta quando não há extensão nem separador', () => {
    expect(getDocFileDisplayMeta('LEIAME')).toEqual({ fileName: 'LEIAME', ext: 'DOC', parentFolder: null });
  });
});

describe('deriveDocFolderLabel', () => {
  it('usa o último segmento', () => {
    expect(deriveDocFolderLabel('C:\\work\\meu-projeto')).toBe('meu-projeto');
  });

  it('usa o pai quando o nome é genérico', () => {
    expect(deriveDocFolderLabel('C:\\work\\meu-projeto\\docs\\')).toBe('meu-projeto');
  });

  it('mantém o nome genérico se o pai é a raiz do drive', () => {
    expect(deriveDocFolderLabel('C:\\docs')).toBe('docs');
  });
});

describe('upsertById', () => {
  it('substitui existente', () => {
    expect(upsertById([{ id: 'a', v: 1 }], { id: 'a', v: 2 })).toEqual([{ id: 'a', v: 2 }]);
  });

  it('acrescenta novo', () => {
    expect(upsertById([{ id: 'a' }], { id: 'b' })).toEqual([{ id: 'a' }, { id: 'b' }]);
  });
});
