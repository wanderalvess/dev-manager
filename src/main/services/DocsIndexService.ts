import fs from 'fs';
import path from 'path';
import { DocChunk, DocSearchResult, DocsIndexProgress, DocsIndexStatus } from '../../shared/types';
import { ConfigService, getAppDataDir } from './ConfigService';
import { GitAzureService } from './GitAzureService';
import { isSafePath } from '../utils/security';

const DOC_EXTENSIONS = ['.md', '.mdx', '.txt'];
const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  'out',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  'coverage',
  '.next',
  '.turbo'
]);
const MAX_FILE_SIZE_BYTES = 1_000_000;
const CHUNK_MAX_CHARS = 800;
const CHUNK_OVERLAP_CHARS = 100;

interface StoredChunk extends DocChunk {
  vector: number[];
}

interface DocsIndexFile {
  version: number;
  updatedAt: string;
  chunks: StoredChunk[];
}

function chunkText(text: string): string[] {
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

function cosineSimilarity(a: number[], b: number[]): number {
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
    projectName: chunk.projectName,
    projectPath: chunk.projectPath,
    filePath: chunk.filePath,
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
        if (parsed && Array.isArray(parsed.chunks)) return parsed;
      }
    } catch (err) {
      console.error('[DocsIndexService] Erro ao ler índice de documentação:', err);
    }
    return { version: 1, updatedAt: '', chunks: [] };
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
    const embedder = await this.getEmbedder();
    for await (const batch of embedder.passageEmbed([text], 1)) {
      return batch[0];
    }
    return [];
  }

  /** Embedding de consulta de busca — usa o encoder assimétrico "query" do modelo. */
  private async embedQuery(text: string): Promise<number[]> {
    const embedder = await this.getEmbedder();
    return embedder.queryEmbed(text);
  }

  private discoverDocFiles(projectPath: string, projectsPath: string): string[] {
    const found: string[] = [];
    const walk = (dir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (IGNORED_DIR_NAMES.has(entry.name)) continue;
          walk(path.join(dir, entry.name));
        } else if (entry.isFile() && DOC_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
          const filePath = path.join(dir, entry.name);
          if (!isSafePath(filePath, projectsPath)) continue;
          found.push(filePath);
        }
      }
    };
    walk(projectPath);
    return found;
  }

  public async reindex(onProgress?: (progress: DocsIndexProgress) => void): Promise<DocsIndexStatus> {
    const settings = this.configService.getSettings();
    const projectsPath = settings.projectsPath;
    const existingIndex = this.loadIndex();
    const existingByFile = new Map<string, StoredChunk[]>();
    for (const chunk of existingIndex.chunks) {
      const list = existingByFile.get(chunk.filePath) || [];
      list.push(chunk);
      existingByFile.set(chunk.filePath, list);
    }

    onProgress?.({ phase: 'scanning', current: 0, total: 0 });
    const projects = projectsPath ? await this.gitAzureService.listProjects() : [];

    const filesByProject = new Map<string, { name: string; path: string; files: string[] }>();
    for (const project of projects) {
      const files = this.discoverDocFiles(project.path, projectsPath);
      filesByProject.set(project.path, { name: project.name, path: project.path, files });
    }
    const allFiles = Array.from(filesByProject.values()).flatMap((p) => p.files);

    onProgress?.({ phase: 'loading-model', current: 0, total: allFiles.length });

    const newChunks: StoredChunk[] = [];
    try {
      if (allFiles.length > 0) {
        await this.getEmbedder();
      }

      let processed = 0;
      for (const project of filesByProject.values()) {
        for (const filePath of project.files) {
          processed++;
          onProgress?.({ phase: 'embedding', current: processed, total: allFiles.length, currentFile: filePath });

          let stat: fs.Stats;
          try {
            stat = fs.statSync(filePath);
          } catch {
            continue;
          }
          if (stat.size > MAX_FILE_SIZE_BYTES) continue;

          const cached = existingByFile.get(filePath);
          if (cached && cached.length > 0 && cached[0].mtimeMs === stat.mtimeMs) {
            newChunks.push(...cached);
            continue;
          }

          let content: string;
          try {
            content = fs.readFileSync(filePath, 'utf-8');
          } catch {
            continue;
          }

          const pieces = chunkText(content);
          for (let i = 0; i < pieces.length; i++) {
            const vector = await this.embedPassage(pieces[i]);
            newChunks.push({
              id: `${filePath}#${i}`,
              projectName: project.name,
              projectPath: project.path,
              filePath,
              chunkIndex: i,
              text: pieces[i],
              mtimeMs: stat.mtimeMs,
              vector
            });
          }
        }
      }
    } catch (err) {
      // Modelo indisponível (falha de rede/proxy no download, cache corrompido, etc).
      // Preserva os chunks já processados nesta rodada em vez de derrubar o processo.
      console.error('[DocsIndexService] Falha ao gerar embeddings, indexação interrompida:', err);
    }

    onProgress?.({ phase: 'saving', current: allFiles.length, total: allFiles.length });
    const updatedIndex: DocsIndexFile = {
      version: 1,
      updatedAt: new Date().toISOString(),
      chunks: newChunks
    };
    this.saveIndex(updatedIndex);
    onProgress?.({ phase: 'done', current: allFiles.length, total: allFiles.length });

    return this.buildStatus(updatedIndex);
  }

  public async search(
    query: string,
    options?: { projectName?: string; topK?: number }
  ): Promise<DocSearchResult[]> {
    const index = this.loadIndex();
    if (index.chunks.length === 0 || !query.trim()) return [];

    const candidates = options?.projectName
      ? index.chunks.filter((c) => c.projectName === options.projectName)
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
    const files = new Set(index.chunks.map((c) => c.filePath));
    const projects = Array.from(new Set(index.chunks.map((c) => c.projectName))).sort();
    return {
      totalChunks: index.chunks.length,
      totalFiles: files.size,
      totalProjects: projects.length,
      projectNames: projects,
      lastIndexedAt: index.updatedAt || undefined,
      modelDownloaded: this.isModelDownloaded()
    };
  }
}
