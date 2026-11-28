import path from 'path';
import type { ConfigService } from '../ConfigService';
import type { LlmService } from '../LlmService';
import { buildChatMessages, KB_NOT_FOUND_ANSWER } from '../../../shared/knowledgeBaseChat';
import { isSafeLocalPath } from '../../utils/security';
import type {
  KbAskResponse,
  KbChatRequest,
  KbChatResponse,
  KbDivergenceReport,
  KbSearchRequest,
  KbSearchResponse
} from '../../../shared/knowledgeBaseTypes';
import { KnowledgeBaseClient, type KbAskParams } from './KnowledgeBaseClient';
import { KnowledgeBaseEmbedder, type EmbedderProgress } from './KnowledgeBaseEmbedder';
import {
  syncPendingEmbeddings,
  type EmbeddingSyncProgress,
  type EmbeddingSyncResult
} from './KnowledgeBaseEmbeddingSync';
import { KnowledgeBaseImportService, type KbImportProgress, type KbImportSummary } from './KnowledgeBaseImportService';

export interface KbStatus {
  enabled: boolean;
  configured: boolean;
  baseUrl: string;
  hasApiKey: boolean;
  sourcePath: string;
  /** O modelo de embeddings já está na máquina (busca híbrida e cálculo dos pendentes disponíveis). */
  embeddingModelReady: boolean;
}

export type KbEmbeddingsProgress =
  | { phase: 'download'; doneBytes: number; totalBytes: number }
  | { phase: 'embedding'; done: number; rejected: number };

/** Fachada da Base de Conhecimento: monta o cliente a partir das configurações salvas. */
export class KnowledgeBaseService {
  private embedder: KnowledgeBaseEmbedder | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly llmService?: Pick<LlmService, 'chat'>
  ) {}

  private getEmbedder(): KnowledgeBaseEmbedder {
    this.embedder ??= new KnowledgeBaseEmbedder(
      path.join(path.dirname(this.configService.getConfigFilePath()), 'models', 'kb-multilingual-minilm')
    );
    return this.embedder;
  }

  getStatus(): KbStatus {
    const kb = this.configService.getSettings().knowledgeBase;
    return {
      enabled: Boolean(kb?.enabled),
      configured: Boolean(kb?.baseUrl && kb?.apiKey),
      baseUrl: kb?.baseUrl ?? '',
      hasApiKey: Boolean(kb?.apiKey),
      sourcePath: kb?.sourcePath ?? '',
      embeddingModelReady: this.getEmbedder().isDownloaded()
    };
  }

  private client(): KnowledgeBaseClient {
    const kb = this.configService.getSettings().knowledgeBase;
    if (!kb?.enabled) throw new Error('A Base de Conhecimento está desativada nas configurações.');
    return new KnowledgeBaseClient({ baseUrl: kb.baseUrl, apiKey: kb.apiKey ?? '' });
  }

  /** Vetor da pergunta com o modelo local; sem o modelo (ou se falhar) a busca segue só por texto. */
  private async queryEmbedding(text: string | undefined, given?: number[]): Promise<number[] | undefined> {
    if (given || !text) return given;
    const embedder = this.getEmbedder();
    if (!embedder.isDownloaded()) return undefined;
    try {
      return (await embedder.embed([text]))[0];
    } catch {
      return undefined;
    }
  }

  async search(req: KbSearchRequest): Promise<KbSearchResponse> {
    const client = this.client();
    return client.search({ ...req, embedding: await this.queryEmbedding(req.query, req.embedding) });
  }

  async ask(params: KbAskParams): Promise<KbAskResponse> {
    const client = this.client();
    return client.ask({ ...params, embedding: await this.queryEmbedding(params.question, params.embedding) });
  }

  /**
   * Responde com o LLM ativo do Hub a partir dos trechos recuperados (o servidor da base não chama LLM). Sem trechos,
   * devolve o aviso de "não encontrei" sem gastar tokens.
   */
  async chat(req: KbChatRequest): Promise<KbChatResponse> {
    const question = req.question?.trim() ?? '';
    if (!question) throw new Error('A pergunta não pode estar vazia.');
    if (!this.llmService) throw new Error('O motor de IA não está disponível neste modo.');

    const ask = await this.ask({
      question,
      k: req.k,
      docType: req.docType,
      source: req.source,
      module: req.module
    });
    const base = { mixedSources: ask.mixedSources, citations: ask.citations, mode: ask.mode };
    if (!ask.answerable) return { ...base, answer: KB_NOT_FOUND_ANSWER, answerable: false };

    const reply = await this.llmService.chat({
      messages: buildChatMessages(ask, req.history),
      temperature: 0.2,
      source: 'kb-chat'
    });
    return {
      ...base,
      answer: reply.text,
      answerable: true,
      provider: reply.provider,
      model: reply.model,
      usageWarning: reply.usageWarning
    };
  }

  divergences(module?: string, limit?: number): Promise<KbDivergenceReport> {
    return this.client().divergences(module, limit);
  }

  importFolder(
    options: { path?: string; version?: string; onProgress?: (p: KbImportProgress) => void } = {}
  ): Promise<KbImportSummary> {
    const kb = this.configService.getSettings().knowledgeBase;
    const root = (options.path || kb?.sourcePath || '').trim();
    if (!root) throw new Error('Informe a pasta do prompt-hub nas configurações da Base de Conhecimento.');
    if (!isSafeLocalPath(root)) throw new Error('Caminho da pasta do prompt-hub inválido ou remoto não permitido.');
    return new KnowledgeBaseImportService(this.client()).importFolder(root, options);
  }

  /**
   * Calcula e envia os embeddings dos trechos pendentes. Com `downloadModel`, baixa o modelo antes se faltar
   * (cerca de 135 MB); sem ele, exige o modelo já presente (é o caso da tool MCP, que não baixa nada sozinha).
   */
  async syncEmbeddings(
    options: { downloadModel?: boolean; onProgress?: (p: KbEmbeddingsProgress) => void } = {}
  ): Promise<EmbeddingSyncResult> {
    const client = this.client();
    const embedder = this.getEmbedder();
    if (!embedder.isDownloaded()) {
      if (!options.downloadModel) {
        throw new Error('O modelo de embeddings ainda não foi baixado. Baixe pelo card da Base de Conhecimento no Hub.');
      }
      await embedder.download((p: EmbedderProgress) => {
        if (p.phase === 'download') {
          options.onProgress?.({ phase: 'download', doneBytes: p.doneBytes ?? 0, totalBytes: p.totalBytes ?? 0 });
        }
      });
    }
    return syncPendingEmbeddings(client, embedder, (p: EmbeddingSyncProgress) =>
      options.onProgress?.({ phase: 'embedding', ...p })
    );
  }
}
