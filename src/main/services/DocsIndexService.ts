import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http from 'http';
import https from 'https';
import {
  DocChunk,
  DocFileInfo,
  DocSearchResult,
  DocsIndexProgress,
  DocsIndexStatus,
  DocSyncProgress,
  DocSyncResult,
  DocSyncTargetConfig
} from '../../shared/types';
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

/**
 * Calcula relevância textual entre a query e o conteúdo do documento.
 * Utilizado como busca principal quando o modelo de embeddings não estiver baixado
 * ou como fallback/boost de correspondência exata de termos.
 */
export function textRelevanceScore(query: string, text: string, title: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  const t = text.toLowerCase();
  const titleLower = title.toLowerCase();

  // Match exato no título confere alta relevância
  if (titleLower.includes(q)) return 0.95;
  // Match exato no corpo do texto
  if (t.includes(q)) return 0.85;

  const terms = q.split(/\s+/).filter((term) => term.length > 1);
  if (terms.length === 0) return 0;

  let matched = 0;
  let titleMatches = 0;
  for (const term of terms) {
    if (titleLower.includes(term)) titleMatches++;
    if (t.includes(term)) matched++;
  }

  if (matched === 0 && titleMatches === 0) return 0;

  const ratio = (matched + titleMatches * 1.5) / (terms.length * 2.5);
  return Math.min(0.8, Math.max(0.2, ratio));
}

export function sanitizeDocPathInfo(rawSourceLabel: string, rawEntryTitle: string): {
  cleanSourceLabel: string;
  cleanProjectName: string;
  cleanTitle: string;
  category: string;
  fullPath: string;
  tags: string[];
} {
  // 1. Normaliza barras no entryTitle
  const normalizedTitle = (rawEntryTitle || '').replace(/\\/g, '/').replace(/^\/+/, '');

  // 2. Extrai nome limpo da pasta/fonte a partir do sourceLabel
  let baseFolder = (rawSourceLabel || '').replace(/\\/g, '/').replace(/\/+$/, '');
  let folderName = baseFolder.split('/').pop() || 'DevManager';

  if (['docs', 'doc', 'documentacao', 'documentation', 'wiki'].includes(folderName.toLowerCase())) {
    const parent = baseFolder.split('/').slice(-2, -1)[0];
    if (parent && !parent.includes(':')) {
      folderName = parent;
    }
  }

  // 3. Se o arquivo estiver dentro de um subdiretório (ex: hub-carga-dados/diagnostico.md),
  // o primeiro segmento é o módulo/projeto específico
  const parts = normalizedTitle.split('/');
  let projectName = folderName;
  if (parts.length > 1 && parts[0] && parts[0].trim()) {
    projectName = parts[0].trim();
  }

  // Garante que projectName não contenha caminhos locais ou dois pontos
  if (projectName.includes(':') || projectName.includes('/') || projectName.includes('\\')) {
    projectName = projectName.split(/[/\\\\]/).pop() || 'DevManager';
  }

  // Tags seguras: estritamente sem nenhum caractere de caminho de disco
  const tags = Array.from(new Set(['DevManager', projectName, 'WinThor'])).filter(
    (t) => t && !t.includes(':') && !t.includes('/') && !t.includes('\\')
  );

  const category = `WinThor / ${projectName}`;
  const fullPath = `Documentação / ${projectName} / ${normalizedTitle}`;

  return {
    cleanSourceLabel: folderName,
    cleanProjectName: projectName,
    cleanTitle: normalizedTitle,
    category,
    fullPath,
    tags
  };
}

export function computeArticleId(sourceId: string, entryTitle: string): string {
  const normalizedTitle = (entryTitle || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const hash = crypto.createHash('sha256').update(`${sourceId}:${normalizedTitle}`).digest('hex').slice(0, 24);
  return `doc_${hash}`;
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
        if (parsed && Array.isArray(parsed.chunks) && parsed.version === INDEX_VERSION) {
          // Normaliza vetores se foram persistidos como objetos com chaves numéricas ("0", "1"...)
          for (const chunk of parsed.chunks) {
            if (chunk.vector && !Array.isArray(chunk.vector)) {
              chunk.vector = Object.values(chunk.vector);
            }
          }
          return parsed;
        }
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
        try {
          const { FlagEmbedding, EmbeddingModel } = await import('fastembed');
          return await FlagEmbedding.init({
            model: EmbeddingModel.AllMiniLML6V2,
            cacheDir: this.modelsDir,
            showDownloadProgress: true
          });
        } catch (err) {
          this.embedderPromise = null;
          throw err;
        }
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
      for (const v of batch) {
        vectors.push(Array.from(v));
      }
    }
    return vectors;
  }

  /** Embedding de consulta de busca — usa o encoder assimétrico "query" do modelo. */
  private async embedQuery(text: string): Promise<number[]> {
    const embedder = await this.getEmbedder();
    const result = await embedder.queryEmbed(text);
    return Array.from(result);
  }

  /** Monta a lista de fontes a indexar: um projeto git = uma fonte, mais as pastas avulsas configuradas. */
  private async buildSources(): Promise<DocSource[]> {
    const settings = this.configService.getSettings();
    const sources: DocSource[] = [];

    // Varre os projetos Git da pasta de projetos somente se a opção estiver explicitamente ligada
    if (settings.indexProjectsDocs && settings.projectsPath) {
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

    let hasModel = false;
    if (totalEntries > 0) {
      try {
        await this.getEmbedder();
        hasModel = true;
      } catch (err) {
        console.warn(
          '[DocsIndexService] Modelo de embeddings indisponível (offline/proxy/rede). Prosseguindo em modo de busca textual:',
          (err as Error).message
        );
        this.embedderPromise = null;
      }
    }

    const newChunks: StoredChunk[] = [];
    let processed = 0;

    for (const [source, entries] of entriesBySource) {
      for (const entry of entries) {
        processed++;
        onProgress?.({ phase: 'embedding', current: processed, total: totalEntries, currentFile: entry.id });

        const key = `${source.id}::${entry.id}`;
        const cached = existingByEntry.get(key);
        // Se já temos em cache com vetor (ou se não temos modelo e o cache já existe com mtime igual)
        if (
          cached &&
          cached.length > 0 &&
          cached[0].mtimeMs === entry.mtimeMs &&
          (!hasModel || (cached[0].vector && cached[0].vector.length > 0))
        ) {
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
        let vectors: number[][] = [];
        if (hasModel) {
          try {
            vectors = await this.embedPassages(pieces);
          } catch (embedErr) {
            console.warn('[DocsIndexService] Falha ao vetorizar arquivo:', entry.id, embedErr);
            vectors = pieces.map(() => []);
          }
        } else {
          vectors = pieces.map(() => []);
        }

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

    const topK = options?.topK && options.topK > 0 ? options.topK : 8;

    let queryVector: number[] | null = null;
    if (this.isModelDownloaded()) {
      try {
        queryVector = await this.embedQuery(query);
      } catch (err) {
        console.warn('[DocsIndexService] Falha ao gerar embedding da busca, usando busca textual:', err);
        queryVector = null;
      }
    }

    const scored = candidates
      .map((chunk) => {
        let score = 0;
        if (queryVector && chunk.vector && chunk.vector.length > 0) {
          score = cosineSimilarity(queryVector, chunk.vector);
          const textScore = textRelevanceScore(query, chunk.text, chunk.entryTitle);
          if (textScore > 0.5) {
            score = Math.max(score, textScore);
          }
        } else {
          score = textRelevanceScore(query, chunk.text, chunk.entryTitle);
        }
        return { chunk: stripVector(chunk), score };
      })
      .filter((item) => item.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return scored;
  }

  public getStatus(): DocsIndexStatus {
    const index = this.loadIndex();
    return this.buildStatus(index);
  }

  public getIndexChunks(): StoredChunk[] {
    const index = this.loadIndex();
    return index.chunks;
  }

  private buildStatus(index: DocsIndexFile): DocsIndexStatus {
    const filesMap = new Map<string, DocFileInfo>();
    for (const chunk of index.chunks) {
      const existing = filesMap.get(chunk.entryId);
      if (existing) {
        existing.chunkCount++;
      } else {
        filesMap.set(chunk.entryId, {
          id: chunk.entryId,
          title: chunk.entryTitle,
          sourceLabel: chunk.sourceLabel,
          chunkCount: 1
        });
      }
    }
    const filesList = Array.from(filesMap.values()).sort((a, b) => a.title.localeCompare(b.title));
    const sourceLabels = Array.from(new Set(index.chunks.map((c) => c.sourceLabel))).sort();
    const hasAnyVector = index.chunks.some((c) => {
      if (!c.vector) return false;
      return Array.isArray(c.vector) ? c.vector.length > 0 : Object.keys(c.vector).length > 0;
    });

    return {
      totalChunks: index.chunks.length,
      totalFiles: filesList.length,
      totalSources: sourceLabels.length,
      sourceLabels,
      lastIndexedAt: index.updatedAt || undefined,
      modelDownloaded: this.isModelDownloaded(),
      isTextOnly: index.chunks.length > 0 && !hasAnyVector,
      files: filesList
    };
  }
}

export interface SyncPayloadChunk {
  id: string;
  articleId: string; // Vínculo explícito com o artigo pai (KnowledgeDocument)
  sourceId: string;
  sourceLabel: string;
  entryId: string;
  entryTitle: string;
  chunkIndex: number;
  content: string;
  vector: number[];
  mtimeMs: number;
}

export interface SyncPayloadArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  fullPath: string;
  sourceLabel: string;
  tags: string[];
  byteSize: number;
  chunkCount: number;
  mtimeMs: number;
}

export interface SyncBatchPayload {
  source: 'winthor-dev-manager';
  syncId: string;
  timestamp: string;
  targetId: string;
  syncMode?: 'all' | 'articles' | 'chunks';
  batchIndex: number;
  totalBatches: number;
  totalChunks: number;
  totalArticles?: number;
  articles?: SyncPayloadArticle[];
  chunks?: SyncPayloadChunk[];
}

export class DocSyncService {
  private configService: ConfigService;
  private docsIndexService: DocsIndexService;

  constructor(configService: ConfigService, docsIndexService: DocsIndexService) {
    this.configService = configService;
    this.docsIndexService = docsIndexService;
  }

  /**
   * Sincroniza o índice de documentação vetorizada com um ou todos os destinos configurados.
   */
  public async syncToTarget(
    targetId?: string,
    onProgress?: (progress: DocSyncProgress) => void
  ): Promise<DocSyncResult[]> {
    const settings = this.configService.getSettings();
    const allTargets = settings.docSyncTargets || [];
    const targetsToSync = targetId
      ? allTargets.filter((t) => t.id === targetId)
      : allTargets.filter((t) => t.enabled);

    if (targetsToSync.length === 0) {
      return [
        {
          success: false,
          targetId: targetId || 'none',
          targetName: 'Nenhum destino configurado',
          totalChunksSent: 0,
          totalBatches: 0,
          error: targetId
            ? `Destino com id "${targetId}" não encontrado.`
            : 'Nenhum destino de sincronização habilitado.'
        }
      ];
    }

    const rawChunks = this.docsIndexService.getIndexChunks();
    if (!rawChunks || rawChunks.length === 0) {
      return targetsToSync.map((t) => ({
        success: false,
        targetId: t.id,
        targetName: t.name,
        totalChunksSent: 0,
        totalBatches: 0,
        error: 'Nenhum documento indexado encontrado. Execute uma indexação primeiro.'
      }));
    }

    // Agrupa por arquivo/artigo para montar a lista de artigos consolidados
    const fileMap = new Map<string, {
      id: string;
      title: string;
      sourceLabel: string;
      entryId: string;
      chunks: typeof rawChunks;
      mtimeMs: number;
    }>();

    for (const chunk of rawChunks) {
      // Normaliza título (troca barras invertidas por barras normais)
      const cleanTitle = (chunk.entryTitle || '').replace(/\\/g, '/').replace(/^\/+/, '');

      // ID determinístico e exclusivo por arquivo usando SHA-256 (elimina colisão entre artigos)
      const articleId = computeArticleId(chunk.sourceId, cleanTitle);
      
      const existing = fileMap.get(chunk.entryId);
      if (existing) {
        existing.chunks.push(chunk);
        if (chunk.mtimeMs > existing.mtimeMs) existing.mtimeMs = chunk.mtimeMs;
      } else {
        fileMap.set(chunk.entryId, {
          id: articleId,
          title: cleanTitle,
          sourceLabel: chunk.sourceLabel,
          entryId: chunk.entryId,
          chunks: [chunk],
          mtimeMs: chunk.mtimeMs
        });
      }
    }

    // Constrói os artigos com conteúdo unificado e rótulos sanitizados (sem vazar paths locais da máquina)
    const payloadArticles: SyncPayloadArticle[] = Array.from(fileMap.values()).map((item) => {
      const sortedChunks = [...item.chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
      const unifiedContent = sortedChunks.map((c) => c.text).join('\n\n');

      const meta = sanitizeDocPathInfo(item.sourceLabel, item.title);

      return {
        id: item.id,
        title: meta.cleanTitle,
        content: unifiedContent,
        category: meta.category,
        fullPath: meta.fullPath,
        sourceLabel: meta.cleanProjectName,
        tags: meta.tags,
        byteSize: Buffer.byteLength(unifiedContent, 'utf-8'),
        chunkCount: sortedChunks.length,
        mtimeMs: item.mtimeMs
      };
    });

    // Mapeia chunks vinculando-os ao articleId pai de forma determinística
    const payloadChunks: SyncPayloadChunk[] = rawChunks.map((c) => {
      const cleanTitle = (c.entryTitle || '').replace(/\\/g, '/').replace(/^\/+/, '');
      const fileData = fileMap.get(c.entryId);
      const articleId = fileData?.id || computeArticleId(c.sourceId, cleanTitle);
      const meta = sanitizeDocPathInfo(c.sourceLabel, cleanTitle);

      return {
        id: c.id,
        articleId,
        sourceId: c.sourceId,
        sourceLabel: meta.cleanProjectName,
        entryId: c.entryId,
        entryTitle: meta.cleanTitle,
        chunkIndex: c.chunkIndex,
        content: c.text,
        vector: Array.isArray(c.vector) ? c.vector : Object.values(c.vector || {}),
        mtimeMs: c.mtimeMs
      };
    });

    const results: DocSyncResult[] = [];

    for (const target of targetsToSync) {
      const result = await this.executeSync(target, payloadArticles, payloadChunks, onProgress);
      results.push(result);

      if (result.success) {
        const updatedTargets = (this.configService.getSettings().docSyncTargets || []).map((t) => {
          if (t.id === target.id) {
            return { ...t, lastSyncedAt: new Date().toISOString() };
          }
          return t;
        });
        await this.configService.saveSettings({ docSyncTargets: updatedTargets });
      }
    }

    return results;
  }

  private async executeSync(
    target: DocSyncTargetConfig,
    articles: SyncPayloadArticle[],
    chunks: SyncPayloadChunk[],
    onProgress?: (progress: DocSyncProgress) => void
  ): Promise<DocSyncResult> {
    const syncMode = target.syncMode || 'all';
    const batchSize = Math.max(1, target.batchSize || 50);

    const shouldSendChunks = syncMode === 'all' || syncMode === 'chunks';
    const shouldSendArticles = syncMode === 'all' || syncMode === 'articles';

    const chunksToSend = shouldSendChunks ? chunks : [];
    const articlesToSend = shouldSendArticles ? articles : [];

    const totalChunks = chunksToSend.length;
    const totalArticles = articlesToSend.length;

    // Calcula lotes com base na maior coleção a enviar
    const chunkBatches = Math.ceil(totalChunks / batchSize);
    const articleBatches = Math.ceil(totalArticles / Math.max(1, Math.floor(batchSize / 2))); // artigos são maiores
    const totalBatches = Math.max(1, Math.max(shouldSendChunks ? chunkBatches : 0, shouldSendArticles ? articleBatches : 0));

    const syncId = `sync_${Date.now()}`;

    onProgress?.({
      targetId: target.id,
      targetName: target.name,
      phase: 'preparing',
      sentChunks: 0,
      totalChunks,
      sentArticles: 0,
      totalArticles,
      currentBatch: 0,
      totalBatches
    });

    let sentChunks = 0;
    let sentArticles = 0;

    const articleBatchSize = Math.max(1, Math.floor(batchSize / 2));

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const chunkStart = batchIdx * batchSize;
      const chunkSlice = shouldSendChunks ? chunksToSend.slice(chunkStart, chunkStart + batchSize) : [];

      const articleStart = batchIdx * articleBatchSize;
      const articleSlice = shouldSendArticles ? articlesToSend.slice(articleStart, articleStart + articleBatchSize) : [];

      const payload: SyncBatchPayload = {
        source: 'winthor-dev-manager',
        syncId,
        timestamp: new Date().toISOString(),
        targetId: target.id,
        syncMode,
        batchIndex: batchIdx + 1,
        totalBatches,
        totalChunks,
        totalArticles,
        articles: articleSlice.length > 0 ? articleSlice : undefined,
        chunks: chunkSlice.length > 0 ? chunkSlice : undefined
      };

      onProgress?.({
        targetId: target.id,
        targetName: target.name,
        phase: 'sending',
        sentChunks,
        totalChunks,
        sentArticles,
        totalArticles,
        currentBatch: batchIdx + 1,
        totalBatches
      });

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };

        if (target.authHeader && target.authValue) {
          headers[target.authHeader.trim()] = target.authValue.trim();
        }

        const method = target.method || 'PUT';
        const response = await this.httpRequest(target.endpointUrl, {
          method,
          headers,
          body: JSON.stringify(payload)
        });

        let responseJson: any = null;
        let responseRawText = '';
        try {
          responseRawText = await response.text();
          responseJson = JSON.parse(responseRawText);
        } catch {
          // ignore
        }

        if (!response.ok) {
          const statusText = response.statusText || `${response.status}`;
          const fullErr = `Falha HTTP ${response.status} (${statusText}): ${(responseRawText || '').slice(0, 200)}`;
          onProgress?.({
            targetId: target.id,
            targetName: target.name,
            phase: 'error',
            sentChunks,
            totalChunks,
            currentBatch: batchIdx + 1,
            totalBatches,
            error: fullErr
          });
          return {
            success: false,
            targetId: target.id,
            targetName: target.name,
            totalChunksSent: sentChunks,
            totalArticlesSent: sentArticles,
            totalBatches,
            error: fullErr
          };
        }

        // Se o servidor retornar a contagem exata persistida, usamos para maior precisão
        if (responseJson && typeof responseJson.savedChunks === 'number') {
          sentChunks += responseJson.savedChunks;
        } else {
          sentChunks += chunkSlice.length;
        }

        if (responseJson && typeof responseJson.savedArticles === 'number') {
          sentArticles += responseJson.savedArticles;
        } else {
          sentArticles += articleSlice.length;
        }
      } catch (err: any) {
        let msg = err?.message || 'Erro de rede desconhecido ao conectar com o endpoint';
        if (err?.cause) {
          const causeMsg = err.cause?.message || err.cause?.code || JSON.stringify(err.cause);
          msg = `${msg} (${causeMsg})`;
        }
        onProgress?.({
          targetId: target.id,
          targetName: target.name,
          phase: 'error',
          sentChunks,
          totalChunks,
          sentArticles,
          totalArticles,
          currentBatch: batchIdx + 1,
          totalBatches,
          error: msg
        });
        return {
          success: false,
          targetId: target.id,
          targetName: target.name,
          totalChunksSent: sentChunks,
          totalArticlesSent: sentArticles,
          totalBatches,
          error: msg
        };
      }
    }

    onProgress?.({
      targetId: target.id,
      targetName: target.name,
      phase: 'completed',
      sentChunks,
      totalChunks,
      sentArticles,
      totalArticles,
      currentBatch: totalBatches,
      totalBatches
    });

    return {
      success: true,
      targetId: target.id,
      targetName: target.name,
      totalChunksSent: sentChunks,
      totalArticlesSent: sentArticles,
      totalBatches
    };
  }

  /**
   * Executa requisição HTTP/HTTPS com suporte a certificados corporativos autoassinados (Zscaler, proxy TOTVS, etc).
   */
  private async httpRequest(
    urlStr: string,
    options: { method: string; headers: Record<string, string>; body: string }
  ): Promise<{ ok: boolean; status: number; statusText: string; text: () => Promise<string> }> {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(urlStr);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;

        const req = client.request(
          urlStr,
          {
            method: options.method,
            headers: options.headers,
            // Em redes corporativas com proxy SSL inspect, evita erro "self signed certificate in certificate chain"
            rejectUnauthorized: false
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            res.on('end', () => {
              const bodyText = Buffer.concat(chunks).toString('utf-8');
              const statusCode = res.statusCode || 200;
              resolve({
                ok: statusCode >= 200 && statusCode < 300,
                status: statusCode,
                statusText: res.statusMessage || `${statusCode}`,
                text: async () => bodyText
              });
            });
          }
        );

        req.on('error', (err) => {
          reject(err);
        });

        if (options.body) {
          req.write(options.body);
        }
        req.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

