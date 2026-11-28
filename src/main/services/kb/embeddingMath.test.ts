import { describe, expect, it } from 'vitest';
import { meanPoolNormalize, padBatch } from './embeddingMath';

describe('meanPoolNormalize', () => {
  it('faz a média só dos tokens com máscara 1 e normaliza (norma 1)', () => {
    // 1 texto, 3 tokens, 2 dimensões; o 3º token é padding e não entra na média
    const hidden = [3, 0, 3, 4, 100, 100];
    const [v] = meanPoolNormalize(hidden, [1, 3, 2], [[1, 1, 0]]);
    // média = [3, 2] → norma sqrt(13)
    expect(v[0]).toBeCloseTo(3 / Math.sqrt(13), 6);
    expect(v[1]).toBeCloseTo(2 / Math.sqrt(13), 6);
    expect(Math.hypot(...v)).toBeCloseTo(1, 6);
  });

  it('trata cada texto do lote separadamente', () => {
    const hidden = [1, 0, 0, 1];
    const out = meanPoolNormalize(hidden, [2, 1, 2], [[1], [1]]);
    expect(out[0]).toEqual([1, 0]);
    expect(out[1]).toEqual([0, 1]);
  });

  it('não divide por zero com texto sem tokens válidos', () => {
    const [v] = meanPoolNormalize([5, 5], [1, 1, 2], [[0]]);
    expect(v).toEqual([0, 0]);
  });
});

describe('padBatch', () => {
  it('completa com o id de padding e gera a máscara', () => {
    const { ids, masks, length } = padBatch([[7, 8, 9], [4]], 1);
    expect(length).toBe(3);
    expect(ids).toEqual([[7, 8, 9], [4, 1, 1]]);
    expect(masks).toEqual([[1, 1, 1], [1, 0, 0]]);
  });
});
