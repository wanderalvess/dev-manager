import type { KnowledgeBaseClient } from './KnowledgeBaseClient';
import type { KnowledgeBaseEmbedder } from './KnowledgeBaseEmbedder';

export interface EmbeddingSyncProgress {
  done: number;
  rejected: number;
}

export interface EmbeddingSyncResult {
  updated: number;
  rejected: string[];
  /** true se parou por atingir o limite de rodadas com ainda haver pendentes. */
  incomplete: boolean;
}

const PAGE = 100;
const MAX_ROUNDS = 200;

/**
 * Busca os trechos sem embedding no servidor, calcula aqui (o servidor não tem o modelo) e devolve.
 * Repete até acabar os pendentes. Trechos que o servidor recusa não voltam como pendentes ao mesmo tempo, então
 * uma rodada que só recusou para de repetir (evita laço infinito).
 */
export async function syncPendingEmbeddings(
  client: KnowledgeBaseClient,
  embedder: Pick<KnowledgeBaseEmbedder, 'embed'>,
  onProgress?: (p: EmbeddingSyncProgress) => void
): Promise<EmbeddingSyncResult> {
  let updated = 0;
  const rejected: string[] = [];
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const pending = await client.pendingChunks(PAGE);
    if (pending.length === 0) return { updated, rejected, incomplete: false };

    const vectors = await embedder.embed(pending.map((c) => c.input));
    const res = await client.fillEmbeddings(pending.map((c, i) => ({ chunkId: c.chunkId, embedding: vectors[i] })));
    updated += res.updated;
    rejected.push(...res.rejected);
    onProgress?.({ done: updated, rejected: rejected.length });
    if (res.updated === 0) return { updated, rejected, incomplete: true };
  }
  return { updated, rejected, incomplete: true };
}
