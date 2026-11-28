import { describe, expect, it } from 'vitest';
import { applyRelatedMap, parseRelatedMap } from './knowledgeBaseRelated';
import type { KbIngestItem } from './knowledgeBaseTypes';

const YAML = [
  '# comentário',
  '- code: "mod:mapeamento-api-a.md"   # GET /a',
  '  tdn:',
  '    - "docs/Documentações TDN/TDN A.txt"   # alta 0.70 | A',
  '    - "docs/Documentações TDN/TDN B.txt"   # baixa 0.20 | B',
  '- code: "mod:mapeamento-api-b.md"',
  '  tdn: []   # sem candidato',
  ''
].join('\r\n');

const item = (over: Partial<KbIngestItem>): KbIngestItem => ({
  docType: 'api_doc',
  externalId: 'mod:mapeamento-api-a.md',
  title: 't',
  content: 'c',
  ...over
});

describe('parseRelatedMap', () => {
  it('lê os ids do TDN, ignora comentários e itens sem páginas', () => {
    const map = parseRelatedMap(YAML);
    expect([...map.keys()]).toEqual(['mod:mapeamento-api-a.md']);
    expect(map.get('mod:mapeamento-api-a.md')).toEqual([
      'docs/Documentações TDN/TDN A.txt',
      'docs/Documentações TDN/TDN B.txt'
    ]);
  });
});

describe('applyRelatedMap', () => {
  const map = parseRelatedMap(YAML);

  it('liga só páginas que existem e junta com o related do frontmatter', () => {
    const items = [
      item({ related: ['prompt:x'] }),
      item({ docType: 'tdn_page', externalId: 'docs/Documentações TDN/TDN A.txt' })
    ];
    const r = applyRelatedMap(items, map);
    expect(r.linked).toBe(1);
    expect(items[0].related).toEqual(['prompt:x', 'tdn_page:docs/Documentações TDN/TDN A.txt']);
    expect(r.missing).toEqual(['mod:mapeamento-api-a.md → docs/Documentações TDN/TDN B.txt']);
  });

  it('não altera docs que não são de código nem os que não estão no mapa', () => {
    const items = [
      item({ docType: 'prompt', externalId: 'mod:mapeamento-api-a.md' }),
      item({ externalId: 'outro:mapeamento-api-z.md' })
    ];
    expect(applyRelatedMap(items, map).linked).toBe(0);
    expect(items[0].related).toBeUndefined();
  });
});
