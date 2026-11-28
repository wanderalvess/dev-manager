import { afterEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeBaseClient } from './KnowledgeBaseClient';

function mockFetch(status: number, body: unknown) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body)
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('KnowledgeBaseClient', () => {
  it('recusa URL insegura e chave ausente', () => {
    expect(() => new KnowledgeBaseClient({ baseUrl: 'ftp://x', apiKey: 'k' })).toThrow(/URL/);
    expect(() => new KnowledgeBaseClient({ baseUrl: 'http://localhost:8080', apiKey: '' })).toThrow(/Chave/);
  });

  it('envia a chave no header e o corpo do ingest', async () => {
    const fetchMock = mockFetch(200, { created: 1, updated: 0, unchanged: 0, errors: 0, results: [] });
    const client = new KnowledgeBaseClient({ baseUrl: 'http://localhost:8080/', apiKey: 'segredo' });
    await client.ingest([{ docType: 'prompt', externalId: 'a', title: 'A', content: 'c' }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8080/api/v1/knowledge/ingest');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Api-Key']).toBe('segredo');
    expect(JSON.parse(init.body).items).toHaveLength(1);
  });

  it('não envia lote vazio nem maior que 50', () => {
    const client = new KnowledgeBaseClient({ baseUrl: 'http://localhost:8080', apiKey: 'k' });
    expect(() => client.ingest([])).toThrow(/1 a 50/);
  });

  it('explica a falta de escopo em 401/403 sem vazar a chave', async () => {
    mockFetch(403, {});
    const client = new KnowledgeBaseClient({ baseUrl: 'http://localhost:8080', apiKey: 'segredo' });
    const err = await client.search({ query: 'x' }).catch((e: Error) => e);
    expect((err as Error).message).toMatch(/KNOWLEDGE_READ/);
    expect((err as Error).message).not.toMatch(/segredo/);
  });

  it('ask pede provider none e monta a query de divergências', async () => {
    const fetchMock = mockFetch(200, {});
    const client = new KnowledgeBaseClient({ baseUrl: 'http://localhost:8080', apiKey: 'k' });
    await client.ask({ question: 'como?' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ provider: 'none', question: 'como?' });
    await client.divergences('mod', 10);
    expect(fetchMock.mock.calls[1][0]).toContain('/divergences?module=mod&limit=10');
  });
});
