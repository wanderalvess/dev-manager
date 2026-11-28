import { describe, expect, it, vi } from 'vitest';
import { syncPendingEmbeddings } from './KnowledgeBaseEmbeddingSync';
import type { KnowledgeBaseClient } from './KnowledgeBaseClient';

const chunk = (n: number) => ({ chunkId: `c${n}`, documentId: 'd', input: `texto ${n}` });

function fakeClient(pages: ReturnType<typeof chunk>[][], fill = (items: unknown[]) => ({ updated: items.length, rejected: [] as string[] })) {
  const queue = [...pages];
  return {
    pendingChunks: vi.fn(async () => queue.shift() ?? []),
    fillEmbeddings: vi.fn(async (items: unknown[]) => fill(items))
  } as unknown as KnowledgeBaseClient & { fillEmbeddings: ReturnType<typeof vi.fn> };
}

const embedder = { embed: vi.fn(async (texts: string[]) => texts.map(() => [0.1, 0.2])) };

describe('syncPendingEmbeddings', () => {
  it('repete até não haver pendentes e envia os vetores na ordem', async () => {
    const client = fakeClient([[chunk(1), chunk(2)], [chunk(3)]]);
    const onProgress = vi.fn();
    const result = await syncPendingEmbeddings(client, embedder, onProgress);

    expect(result).toEqual({ updated: 3, rejected: [], incomplete: false });
    expect(embedder.embed).toHaveBeenCalledWith(['texto 1', 'texto 2']);
    expect(client.fillEmbeddings.mock.calls[0][0].map((i: { chunkId: string }) => i.chunkId)).toEqual(['c1', 'c2']);
    expect(onProgress).toHaveBeenLastCalledWith({ done: 3, rejected: 0 });
  });

  it('não entra em laço quando o servidor recusa tudo', async () => {
    const client = fakeClient([[chunk(1)], [chunk(1)], [chunk(1)]], () => ({ updated: 0, rejected: ['c1'] }));
    const result = await syncPendingEmbeddings(client, embedder);
    expect(result).toEqual({ updated: 0, rejected: ['c1'], incomplete: true });
    expect(client.fillEmbeddings).toHaveBeenCalledTimes(1);
  });

  it('sem pendentes não calcula nada', async () => {
    const e = { embed: vi.fn() };
    const result = await syncPendingEmbeddings(fakeClient([]), e);
    expect(result.updated).toBe(0);
    expect(e.embed).not.toHaveBeenCalled();
  });
});
