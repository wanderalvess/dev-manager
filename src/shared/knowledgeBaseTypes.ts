/**
 * Contrato do cliente da Base de Conhecimento do Agile Space (/api/v1/knowledge).
 * Espelha os DTOs do backend (KnowledgeIngestDtos, KnowledgeSearchDtos, KnowledgeAskDtos, KnowledgeDivergenceDtos).
 */

export type KbDocType = 'api_doc' | 'tdn_page' | 'prompt' | 'skill' | 'instruction';
export type KbSource = 'code' | 'tdn';

export const KB_MAX_BATCH = 50;

export interface KbIngestItem {
  docType: KbDocType;
  externalId: string;
  title: string;
  content: string;
  source?: KbSource;
  sourceUrl?: string;
  module?: string;
  version?: string;
  category?: string;
  tags?: string[];
  /** Referências "docType:externalId" de outros documentos (liga código a TDN). */
  related?: string[];
  visibility?: 'shared';
  embedding?: number[];
}

export type KbIngestStatus = 'created' | 'updated' | 'unchanged' | 'error';

export interface KbIngestItemResult {
  docType: string;
  externalId: string;
  status: KbIngestStatus;
  id?: string;
  message?: string;
  warnings?: string[];
}

export interface KbIngestResponse {
  created: number;
  updated: number;
  unchanged: number;
  errors: number;
  results: KbIngestItemResult[];
}

export interface KbSearchRequest {
  query?: string;
  embedding?: number[];
  k?: number;
  docType?: KbDocType;
  source?: KbSource;
  module?: string;
}

export interface KbHit {
  chunkId: string;
  documentId: string;
  docType: string;
  externalId: string;
  title: string;
  headingPath?: string;
  text: string;
  sourceUrl?: string;
  source?: string;
  module?: string;
  version?: string;
  score: number;
  textRank?: number | null;
  vectorRank?: number | null;
}

export interface KbSearchResponse {
  mode: 'hybrid' | 'text' | 'vector';
  hits: KbHit[];
}

export interface KbCitation {
  n: number;
  chunkId: string;
  documentId: string;
  docType: string;
  externalId: string;
  title: string;
  headingPath?: string;
  sourceUrl?: string;
  source?: string;
  module?: string;
  version?: string;
}

export interface KbAskResponse {
  provider: string;
  mode: string;
  answerable: boolean;
  /** Há trechos de código e de TDN juntos: vale comparar (ver divergências). */
  mixedSources: boolean;
  systemPrompt: string;
  userPrompt: string;
  citations: KbCitation[];
}

export interface KbPendingChunk {
  chunkId: string;
  documentId: string;
  /** Texto exato que deve virar embedding (título + caminho + trecho). */
  input: string;
}

export interface KbEmbeddingFill {
  chunkId: string;
  embedding: number[];
}

export interface KbFillResponse {
  updated: number;
  rejected: string[];
}

export interface KbDocRef {
  id: string;
  externalId: string;
  title: string;
  sourceUrl?: string;
  version?: string;
  module?: string;
}

export interface KbDivergencePair {
  code: KbDocRef;
  tdn: KbDocRef;
  shared: number;
  similarity: number;
  status: 'aligned' | 'review' | 'diverges';
  onlyInCode: string[];
  onlyInTdn: string[];
}

export interface KbDivergenceReport {
  pairCount: number;
  diverging: number;
  review: number;
  aligned: number;
  pairs: KbDivergencePair[];
  unlinkedCodeCount: number;
  unlinkedCode: string[];
}

/** Configuração do destino (URL do backend + chave de API com KNOWLEDGE_READ/KNOWLEDGE_WRITE). */
export interface KnowledgeBaseSettings {
  enabled: boolean;
  baseUrl: string;
  /** Criptografado em repouso (ver ConfigService.encryptSecretsForDisk). */
  apiKey?: string;
  /** Pasta local do prompt-hub (clone) usada pelo importador. */
  sourcePath?: string;
}

/** Uma mensagem anterior da conversa, enviada ao chat para manter o contexto. */
export interface KbChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface KbChatRequest {
  question: string;
  history?: KbChatTurn[];
  k?: number;
  docType?: KbDocType;
  source?: KbSource;
  module?: string;
}

export interface KbChatResponse {
  answer: string;
  /** false quando a base não trouxe nada: a resposta diz isso em vez de inventar. */
  answerable: boolean;
  mixedSources: boolean;
  citations: KbCitation[];
  /** hybrid (texto + significado), text ou vector, conforme o que foi possível usar. */
  mode: string;
  provider?: string;
  model?: string;
  usageWarning?: string;
}
