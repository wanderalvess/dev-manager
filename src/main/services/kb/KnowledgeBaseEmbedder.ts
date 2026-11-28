import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { KB_EMBEDDING_DIMS, meanPoolNormalize, padBatch } from './embeddingMath';

const MODEL_REPO = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const MODEL_BASE_URL = `https://huggingface.co/${MODEL_REPO}/resolve/main`;
/** Arquivo (caminho no repositório) → tamanho aproximado em bytes, só para o progresso. */
const MODEL_FILES: Record<string, number> = {
  'onnx/model_quantized.onnx': 118_308_126,
  'tokenizer.json': 17_082_913,
  'tokenizer_config.json': 496,
  'config.json': 673
};
const MAX_TOKENS = 512;
const BATCH_SIZE = 16;

export interface EmbedderProgress {
  phase: 'download' | 'loading';
  file?: string;
  doneBytes?: number;
  totalBytes?: number;
}

/**
 * Gera embeddings com o MESMO modelo que o backend do Agile Space (paraphrase-multilingual-MiniLM-L12-v2, 384 dims,
 * mean pooling normalizado), para que busca híbrida e trechos pendentes usem vetores comparáveis.
 * Roda em onnxruntime-node (já dependência do Hub); o modelo é baixado uma vez para a pasta de dados.
 */
export class KnowledgeBaseEmbedder {
  private session: any = null;
  private tokenizer: any = null;
  private padId = 1;
  private loading: Promise<void> | null = null;

  constructor(private readonly modelDir: string) {}

  isDownloaded(): boolean {
    return Object.keys(MODEL_FILES).every((f) => fs.existsSync(path.join(this.modelDir, f)));
  }

  /** Baixa só os arquivos que faltam; grava em `.part` e renomeia, então uma queda não deixa arquivo pela metade. */
  async download(onProgress?: (p: EmbedderProgress) => void): Promise<void> {
    const total = Object.values(MODEL_FILES).reduce((a, b) => a + b, 0);
    let done = 0;
    for (const [file, size] of Object.entries(MODEL_FILES)) {
      const target = path.join(this.modelDir, file);
      if (fs.existsSync(target)) {
        done += size;
        continue;
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const res = await fetch(`${MODEL_BASE_URL}/${file}`, { signal: AbortSignal.timeout(15 * 60_000) });
      if (!res.ok || !res.body) throw new Error(`Falha ao baixar ${file} do modelo (HTTP ${res.status}).`);
      const part = `${target}.part`;
      const body = Readable.fromWeb(res.body as import('stream/web').ReadableStream);
      const base = done;
      body.on('data', (chunk: Buffer) => {
        done += chunk.length;
        onProgress?.({ phase: 'download', file, doneBytes: done, totalBytes: total });
      });
      try {
        await pipeline(body, fs.createWriteStream(part));
        fs.renameSync(part, target);
      } catch (err) {
        done = base;
        fs.rmSync(part, { force: true });
        throw err;
      }
    }
  }

  private async load(): Promise<void> {
    if (this.session) return;
    this.loading ??= (async () => {
      if (!this.isDownloaded()) throw new Error('O modelo de embeddings ainda não foi baixado.');
      const ort = await import('onnxruntime-node');
      const { Tokenizer } = await import('@anush008/tokenizers');
      const config = JSON.parse(fs.readFileSync(path.join(this.modelDir, 'config.json'), 'utf-8'));
      this.padId = Number.isInteger(config.pad_token_id) ? config.pad_token_id : 1;
      this.tokenizer = Tokenizer.fromFile(path.join(this.modelDir, 'tokenizer.json'));
      this.tokenizer.setTruncation(MAX_TOKENS);
      this.session = await ort.InferenceSession.create(path.join(this.modelDir, 'onnx/model_quantized.onnx'), {
        executionProviders: ['cpu']
      });
    })().catch((err) => {
      this.loading = null;
      throw err;
    });
    await this.loading;
  }

  /** Vetores normalizados (384 posições) na ordem dos textos. */
  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    await this.load();
    const ort = await import('onnxruntime-node');
    const vectors: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const encoded = await Promise.all(batch.map((t) => this.tokenizer.encode(t)));
      const { ids, masks, length } = padBatch(
        encoded.map((e: any) => e.getIds() as number[]),
        this.padId
      );
      const toTensor = (rows: number[][]) =>
        new ort.Tensor('int64', BigInt64Array.from(rows.flat().map(BigInt)), [batch.length, length]);
      const feeds: Record<string, any> = { input_ids: toTensor(ids), attention_mask: toTensor(masks) };
      if ((this.session.inputNames as string[]).includes('token_type_ids')) {
        feeds.token_type_ids = toTensor(masks.map((row) => row.map(() => 0)));
      }
      const output = await this.session.run(feeds);
      const hidden = output[this.session.outputNames[0]];
      for (const v of meanPoolNormalize(hidden.data as Float32Array, hidden.dims, masks)) {
        if (v.length !== KB_EMBEDDING_DIMS) throw new Error(`Modelo gerou ${v.length} dimensões; esperado ${KB_EMBEDDING_DIMS}.`);
        vectors.push(v);
      }
    }
    return vectors;
  }
}
