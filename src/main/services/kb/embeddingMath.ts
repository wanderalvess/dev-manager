/** Dimensão do modelo paraphrase-multilingual-MiniLM-L12-v2 (a mesma que o backend do Agile Space exige). */
export const KB_EMBEDDING_DIMS = 384;

/**
 * Mean pooling sobre os tokens com máscara 1, seguido de normalização L2 — o mesmo cálculo do pipeline
 * `feature-extraction` do transformers.js usado pelo Agile Space, para que os vetores sejam comparáveis.
 * `hidden` é o `last_hidden_state` achatado com formato [lote, tokens, dimensão].
 */
export function meanPoolNormalize(
  hidden: ArrayLike<number>,
  dims: readonly number[],
  masks: readonly (readonly number[])[]
): number[][] {
  const [batch, tokens, size] = dims;
  const out: number[][] = [];
  for (let b = 0; b < batch; b++) {
    const vec = new Array<number>(size).fill(0);
    let count = 0;
    for (let t = 0; t < tokens; t++) {
      if (!masks[b][t]) continue;
      count += 1;
      const base = (b * tokens + t) * size;
      for (let d = 0; d < size; d++) vec[d] += hidden[base + d];
    }
    const divisor = Math.max(count, 1);
    let norm = 0;
    for (let d = 0; d < size; d++) {
      vec[d] /= divisor;
      norm += vec[d] * vec[d];
    }
    norm = Math.sqrt(norm) || 1;
    out.push(vec.map((v) => v / norm));
  }
  return out;
}

/** Completa cada sequência com `padId` até o tamanho da maior e devolve também a máscara de atenção. */
export function padBatch(
  sequences: readonly (readonly number[])[],
  padId: number
): { ids: number[][]; masks: number[][]; length: number } {
  const length = Math.max(1, ...sequences.map((s) => s.length));
  const ids = sequences.map((s) => [...s, ...new Array<number>(length - s.length).fill(padId)]);
  const masks = sequences.map((s) => [...new Array<number>(s.length).fill(1), ...new Array<number>(length - s.length).fill(0)]);
  return { ids, masks, length };
}
