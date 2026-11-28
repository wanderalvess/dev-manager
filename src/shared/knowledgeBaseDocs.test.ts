import { describe, expect, it } from 'vitest';
import { buildExternalId, buildIngestItem, chunkBatches, classifyDocPath, parseFrontmatter } from './knowledgeBaseDocs';

describe('parseFrontmatter', () => {
  it('lê chaves, listas inline e listas em linhas', () => {
    const raw = '---\nid: "a:b"\ntags: [x, y]\nrelated:\n  - tdn_page:t1\n  - tdn_page:t2\n---\n# Título\ncorpo';
    const { data, body } = parseFrontmatter(raw);
    expect(data.id).toBe('a:b');
    expect(data.tags).toEqual(['x', 'y']);
    expect(data.related).toEqual(['tdn_page:t1', 'tdn_page:t2']);
    expect(body).toBe('# Título\ncorpo');
  });

  it('sem frontmatter devolve o texto inteiro', () => {
    expect(parseFrontmatter('# oi').body).toBe('# oi');
  });
});

describe('classifyDocPath', () => {
  it('reconhece docs de código com o módulo', () => {
    const c = classifyDocPath('docs/Documentações Código/winthor-produto/mapeamento-api-x.md');
    expect(c).toMatchObject({ docType: 'api_doc', source: 'code', module: 'winthor-produto' });
  });

  it('reconhece TDN mesmo com acentos perdidos no nome da pasta', () => {
    expect(classifyDocPath('docs/Documentações TDN/TDN API - Pedido.txt')?.docType).toBe('tdn_page');
    expect(classifyDocPath('docs/Documentaes TDN/TDN API - Pedido.txt')?.docType).toBe('tdn_page');
  });

  it('reconhece prompts, skills e instruções e ignora o resto', () => {
    expect(classifyDocPath('prompts/p.md')?.docType).toBe('prompt');
    expect(classifyDocPath('skills/map-java-project/SKILL.md')?.docType).toBe('skill');
    expect(classifyDocPath('instructions/criar.md')?.docType).toBe('instruction');
    expect(classifyDocPath('README.md')).toBeNull();
    expect(classifyDocPath('docs/imagem.png')).toBeNull();
  });
});

describe('buildExternalId / buildIngestItem', () => {
  it('usa módulo:arquivo para código', () => {
    const rel = 'docs/Documentações Código/winthor-produto/mapeamento-api-a.md';
    const c = classifyDocPath(rel)!;
    expect(buildExternalId(rel, c)).toBe('winthor-produto:mapeamento-api-a.md');
  });

  it('monta o item com título do H1 e related do frontmatter', () => {
    const rel = 'docs/Documentações Código/mod/mapeamento-api-a.md';
    const item = buildIngestItem(rel, '---\nrelated: [tdn_page:docs/Documentações TDN/x.txt]\n---\n# PUT /a\ntexto', 'v1');
    expect(item).toMatchObject({
      docType: 'api_doc',
      externalId: 'mod:mapeamento-api-a.md',
      title: 'PUT /a',
      source: 'code',
      module: 'mod',
      version: 'v1',
      related: ['tdn_page:docs/Documentações TDN/x.txt']
    });
  });

  it('frontmatter sobrescreve id, título e versão', () => {
    const item = buildIngestItem('prompts/p.md', '---\nid: meu-id\ntitle: Meu\nversion: v9\n---\ncorpo', 'v1');
    expect(item).toMatchObject({ externalId: 'meu-id', title: 'Meu', version: 'v9' });
  });
});

describe('chunkBatches', () => {
  it('divide em lotes de no máximo 50', () => {
    const batches = chunkBatches(Array.from({ length: 120 }, (_, i) => i));
    expect(batches.map((b) => b.length)).toEqual([50, 50, 20]);
    expect(chunkBatches([1, 2, 3], 999)).toHaveLength(1);
  });
});
