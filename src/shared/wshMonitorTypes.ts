/**
 * Monitor do WSH (decisão 0003, revisão após a coleta): o que o Winthor Smart Hub gravou na PCINTEGRACAOCORE,
 * lido só do Oracle, sem credencial do PDVSync. Cada linha é um item (produto, preço, cobrança...) buscado no WinThor
 * por uma rota de busca e enviado ao PDVSync por uma rota de envio, que atualiza a mesma linha.
 */

export type WshStatusFilter = 'all' | 'error' | 'ok';

export interface WshRoute {
  id: number;
  name: string;
}

export interface WshSearchRequest {
  /** Rota de busca (PCINTEGRACAOROTASERVICO.ID). Vazio: todas. */
  routeId?: number;
  /** Trecho do IDEXTERNO, como o código do produto ("1000") ou "produto-1000-1". */
  text?: string;
  status?: WshStatusFilter;
  lookbackHours?: number;
  limit?: number;
}

/** Um erro devolvido pelo PDVSync para um item do envio. */
export interface WshItemError {
  /** identificadorExterno do item que o PDVSync recusou ("270-270", "PIXS"). */
  externalId?: string;
  field: string;
  messages: string[];
}

/** A OBSERVACAO lida: a resposta do PDVSync ao envio que o WSH gravou na linha. */
export interface WshObservation {
  httpStatus?: number;
  success?: boolean;
  errors: WshItemError[];
  totalTimeMs?: number;
  records?: number;
  /** Texto original (até 3800 caracteres), para quem quiser ver tudo. */
  raw: string;
  /** O banco tinha mais texto do que foi lido: a lista de erros pode estar incompleta. */
  truncated: boolean;
}

export type WshItemTone = 'ok' | 'error' | 'other';

export interface WshItem {
  id: number;
  status: string;
  statusLabel: string;
  tone: WshItemTone;
  attempts?: number;
  externalId: string;
  route: string;
  sendRoute?: string;
  requestId?: string;
  createdAt?: number;
  syncedAt?: number;
  updatedAt?: number;
  hasTransformedData: boolean;
  observation?: WshObservation;
  /** Erros do PDVSync que citam este item. */
  ownErrors: WshItemError[];
  /** Erros de outros itens do mesmo envio (o PDVSync recusa a requisição inteira). */
  otherErrors: WshItemError[];
}

export type WshRoutesResponse = { success: true; routes: WshRoute[] } | { success: false; error: string };
export type WshSearchResponse =
  | { success: true; items: WshItem[]; limit: number; lookbackHours: number }
  | { success: false; error: string };

export const WSH_DEFAULT_LOOKBACK_HOURS = 72;
export const WSH_MAX_LOOKBACK_HOURS = 24 * 90;
export const WSH_DEFAULT_LIMIT = 100;
export const WSH_MAX_LIMIT = 500;
export const WSH_MAX_TEXT_LENGTH = 120;
