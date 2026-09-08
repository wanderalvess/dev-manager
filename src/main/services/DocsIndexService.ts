import fs from 'fs';
import path from 'path';
import { DocChunk, DocSearchResult, DocsIndexProgress, DocsIndexStatus } from '../../shared/types';
import { ConfigService, getAppDataDir } from './ConfigService';
import { GitAzureService } from './GitAzureService';
import { DocSource } from './docSources/DocSource';
import { LocalFolderSource } from './docSources/LocalFolderSource';

const CHUNK_MAX_CHARS = 800;
const CHUNK_OVERLAP_CHARS = 100;
// v2: chunk passou de projectName/projectPath/filePath para sourceId/sourceLabel/entryId/entryTitle
// (suporte a múltiplas fontes de documentação, não só projetos git). Índices v1 são descartados.
const INDEX_VERSION = 2;

interface StoredChunk extends DocChunk {
  vector: number[];
}

interface DocsIndexFile {
  version: number;
  updatedAt: string;
  chunks: StoredChunk[];
}

export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > CHUNK_MAX_CHARS && current) {
      chunks.push(current.trim());
      const tail = current.slice(-CHUNK_OVERLAP_CHARS);
      current = `${tail}\n\n${paragraph}`;
    } else {
      current = candidate;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Parágrafo isolado maior que o dobro do limite: quebra em janelas fixas
  return chunks.flatMap((chunk) => {
    if (chunk.length <= CHUNK_MAX_CHARS * 2) return [chunk];
    const parts: string[] = [];
    let i = 0;
    while (i < chunk.length) {
      parts.push(chunk.slice(i, i + CHUNK_MAX_CHARS));
      i += CHUNK_MAX_CHARS - CHUNK_OVERLAP_CHARS;
    }
    return parts;
  });
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}

function stripVector(chunk: StoredChunk): DocChunk {
  return {
    id: chunk.id,
    sourceId: chunk.sourceId,
    sourceLabel: chunk.sourceLabel,
    entryId: chunk.entryId,
    entryTitle: chunk.entryTitle,
    chunkIndex: chunk.chunkIndex,
    text: chunk.text,
    mtimeMs: chunk.mtimeMs
  };
}

export class DocsIndexService {
  private configService: ConfigService;
  private gitAzureService: GitAzureService;
  private indexPath: string;
  private modelsDir: string;
  private embedderPromise: Promise<any> | null = null;

  constructor(configService: ConfigService, gitAzureService: GitAzureService) {
    this.configService = configService;
    this.gitAzureService = gitAzureService;
    const dataDir = getAppDataDir();
    this.indexPath = path.join(dataDir, 'docs-index.json');
    this.modelsDir = path.join(dataDir, 'models');
  }

  private loadIndex(): DocsIndexFile {
    try {
      if (fs.existsSync(this.indexPath)) {
        const raw = fs.readFileSync(this.indexPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.chunks) && parsed.version === INDEX_VERSION) return parsed;
      }
    } catch (err) {
      console.error('[DocsIndexService] Erro ao ler índice de documentação:', err);
    }
    return { version: INDEX_VERSION, updatedAt: '', chunks: [] };
  }

  private saveIndex(index: DocsIndexFile) {
    try {
      fs.writeFileSync(this.indexPath, JSON.stringify(index), 'utf-8');
    } catch (err) {
      console.error('[DocsIndexService] Erro ao salvar índice de documentação:', err);
    }
  }

  public isModelDownloaded(): boolean {
    if (!fs.existsSync(this.modelsDir)) return false;
    const hasOnnxFile = (dir: string, depth: number): boolean => {
      if (depth > 6) return false;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return false;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory() && hasOnnxFile(full, depth + 1)) return true;
        if (entry.isFile() && entry.name.endsWith('.onnx')) return true;
      }
      return false;
    };
    return hasOnnxFile(this.modelsDir, 0);
  }

  private async getEmbedder(): Promise<any> {
    if (!this.embedderPromise) {
      this.embedderPromise = (async () => {
        const { FlagEmbedding, EmbeddingModel } = await import('fastembed');
        return FlagEmbedding.init({
          model: EmbeddingModel.AllMiniLML6V2,
          cacheDir: this.modelsDir,
          showDownloadProgress: true
        });
      })();
    }
    return this.embedderPromise;
  }

  /** Embedding de documento (chunk indexado) — usa o encoder assimétrico "passage" do modelo. */
  private async embedPassage(text: string): Promise<number[]> {
    const [vector] = await this.embedPassages([text]);
    return vector || [];
  }

  /**
   * Embedding em lote de vários chunks de uma vez, na ordem de entrada. fastembed
   * já suporta lote nativamente — chamar um texto por vez (como antes) serializa
   * round-trips que poderiam ser um único lote por arquivo durante a reindexação.
   */
  private async embedPassages(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const embedder = await this.getEmbedder();
    const vectors: number[][] = [];
    for await (const batch of embedder.passageEmbed(texts, Math.min(texts.length, 32))) {
      vectors.push(...batch);
    }
    return vectors;
  }

  /** Embedding de consulta de busca — usa o encoder assimétrico "query" do modelo. */
  private async embedQuery(text: string): Promise<number[]> {
    const embedder = await this.getEmbedder();
    return embedder.queryEmbed(text);
  }

  /** Monta a lista de fontes a indexar: um projeto git = uma fonte, mais as pastas avulsas configuradas. */
  private async buildSources(): Promise<DocSource[]> {
    const settings = this.configService.getSettings();
    const sources: DocSource[] = [];

    if (settings.projectsPath) {
      const projects = await this.gitAzureService.listProjects();
      for (const project of projects) {
        sources.push(new LocalFolderSource(project.path, project.name));
      }
    }

    for (const folder of settings.docFolders || []) {
      if (!folder.path) continue;
      sources.push(new LocalFolderSource(folder.path, folder.label));
    }

    return sources;
  }

  public async reindex(onProgress?: (progress: DocsIndexProgress) => void): Promise<DocsIndexStatus> {
    const existingIndex = this.loadIndex();
    const existingByEntry = new Map<string, StoredChunk[]>();
    for (const chunk of existingIndex.chunks) {
      const key = `${chunk.sourceId}::${chunk.entryId}`;
      const list = existingByEntry.get(key) || [];
      list.push(chunk);
      existingByEntry.set(key, list);
    }

    onProgress?.({ phase: 'scanning', current: 0, total: 0 });
    const sources = await this.buildSources();

    const entriesBySource = new Map<DocSource, { title: string; id: string; mtimeMs: number }[]>();
    for (const source of sources) {
      entriesBySource.set(source, await source.listEntries());
    }
    const totalEntries = Array.from(entriesBySource.values()).reduce((sum, entries) => sum + entries.length, 0);

    onProgress?.({ phase: 'loading-model', current: 0, total: totalEntries });

    const newChunks: StoredChunk[] = [];
    try {
      if (totalEntries > 0) {
        await this.getEmbedder();
      }

      let processed = 0;
      for (const [source, entries] of entriesBySource) {
        for (const entry of entries) {
          processed++;
          onProgress?.({ phase: 'embedding', current: processed, total: totalEntries, currentFile: entry.id });

          const key = `${source.id}::${entry.id}`;
          const cached = existingByEntry.get(key);
          if (cached && cached.length > 0 && cached[0].mtimeMs === entry.mtimeMs) {
            newChunks.push(...cached);
            continue;
          }

          let content: string;
          try {
            content = await source.readContent(entry);
          } catch {
            continue;
          }

          const pieces = chunkText(content);
          const vectors = await this.embedPassages(pieces);
          for (let i = 0; i < pieces.length; i++) {
            newChunks.push({
              id: `${key}#${i}`,
              sourceId: source.id,
              sourceLabel: source.label,
              entryId: entry.id,
              entryTitle: entry.title,
              chunkIndex: i,
              text: pieces[i],
              mtimeMs: entry.mtimeMs,
              vector: vectors[i] || []
            });
          }
        }
      }
    } catch (err) {
      // Modelo indisponível (falha de rede/proxy no download, cache corrompido, etc).
      // Preserva os chunks já processados nesta rodada em vez de derrubar o processo.
      console.error('[DocsIndexService] Falha ao gerar embeddings, indexação interrompida:', err);
    }

    onProgress?.({ phase: 'saving', current: totalEntries, total: totalEntries });
    const updatedIndex: DocsIndexFile = {
      version: INDEX_VERSION,
      updatedAt: new Date().toISOString(),
      chunks: newChunks
    };
    this.saveIndex(updatedIndex);
    onProgress?.({ phase: 'done', current: totalEntries, total: totalEntries });

    return this.buildStatus(updatedIndex);
  }

  public async search(
    query: string,
    options?: { sourceLabel?: string; topK?: number }
  ): Promise<DocSearchResult[]> {
    const index = this.loadIndex();
    if (index.chunks.length === 0 || !query.trim()) return [];

    const candidates = options?.sourceLabel
      ? index.chunks.filter((c) => c.sourceLabel === options.sourceLabel)
      : index.chunks;
    if (candidates.length === 0) return [];

    let queryVector: number[];
    try {
      queryVector = await this.embedQuery(query);
    } catch (err) {
      console.error('[DocsIndexService] Falha ao gerar embedding da busca:', err);
      return [];
    }
    const topK = options?.topK && options.topK > 0 ? options.topK : 8;

    return candidates
      .map((chunk) => ({ chunk: stripVector(chunk), score: cosineSimilarity(queryVector, chunk.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  public getStatus(): DocsIndexStatus {
    const index = this.loadIndex();
    return this.buildStatus(index);
  }

  private buildStatus(index: DocsIndexFile): DocsIndexStatus {
    const files = new Set(index.chunks.map((c) => c.entryId));
    const sourceLabels = Array.from(new Set(index.chunks.map((c) => c.sourceLabel))).sort();
    return {
      totalChunks: index.chunks.length,
      totalFiles: files.size,
      totalSources: sourceLabels.length,
      sourceLabels,
      lastIndexedAt: index.updatedAt || undefined,
      modelDownloaded: this.isModelDownloaded()
    };
  }
}
