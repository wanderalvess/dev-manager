import { isSafeUrl } from '../../utils/security';
import type {
  KbAskResponse,
  KbDivergenceReport,
  KbDocType,
  KbIngestItem,
  KbIngestResponse,
  KbSearchRequest,
  KbSearchResponse,
  KbSource
} from '../../../shared/knowledgeBaseTypes';
import { KB_MAX_BATCH } from '../../../shared/knowledgeBaseTypes';

export interface KnowledgeBaseClientConfig {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface KbAskParams {
  question: string;
  k?: number;
  docType?: KbDocType;
  source?: KbSource;
  module?: string;
  embedding?: number[];
}

/** Cliente HTTP da API de conhecimento do Agile Space (header X-Api-Key). Sem estado além da configuração. */
export class KnowledgeBaseClient {
  private readonly base: string;

  constructor(private readonly config: KnowledgeBaseClientConfig) {
    const url = (config.baseUrl || '').trim().replace(/\/+$/, '');
    if (!isSafeUrl(url)) throw new Error('URL da Base de Conhecimento inválida.');
    if (!config.apiKey) throw new Error('Chave de API da Base de Conhecimento não configurada.');
    this.base = `${url}/api/v1/knowledge`;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        'X-Api-Key': this.config.apiKey,
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.config.timeoutMs ?? 60_000)
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          `Chave de API recusada (HTTP ${res.status}). Ela precisa dos escopos KNOWLEDGE_READ e KNOWLEDGE_WRITE.`
        );
      }
      throw new Error(`Base de Conhecimento respondeu HTTP ${res.status}${detail ? `: ${detail}` : ''}`);
    }
    return (await res.json()) as T;
  }

  ingest(items: KbIngestItem[]): Promise<KbIngestResponse> {
    if (items.length === 0 || items.length > KB_MAX_BATCH) {
      throw new Error(`Envie de 1 a ${KB_MAX_BATCH} documentos por requisição.`);
    }
    return this.request('POST', '/ingest', { items });
  }

  search(req: KbSearchRequest): Promise<KbSearchResponse> {
    return this.request('POST', '/search', { k: 8, ...req });
  }

  ask(params: KbAskParams): Promise<KbAskResponse> {
    return this.request('POST', '/ask', { k: 8, provider: 'none', ...params });
  }

  divergences(module?: string, limit?: number): Promise<KbDivergenceReport> {
    const q = new URLSearchParams();
    if (module) q.set('module', module);
    if (limit) q.set('limit', String(limit));
    const qs = q.toString();
    return this.request('GET', `/divergences${qs ? `?${qs}` : ''}`);
  }
}
