import type { JoltFieldMapping } from './joltFieldMap';
import type { WshFlowRun } from './wshExecution';

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
  /** Trecho do IDEXTERNO ou do IDINTERNO, como o código do produto ("produto-1000") ou o cupom da venda ("10905"). */
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
  /** Página do TDN que o PDVSync manda junto com o erro (linkDocumentacao). */
  docUrl?: string;
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
  /** IDINTERNO: o identificador do negócio nas transações (venda: filial-série-cupom, ex.: "1-3-10905"). */
  internalId?: string;
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

/** Situação de um fluxo do qual o item depende, lida da PCINTEGRACAOCORE. */
export interface WshDependency {
  flowId: string;
  flowName: string;
  route: string;
  /** Falso quando a rota nunca gravou nada neste banco: o fluxo nunca integrou neste ambiente. */
  found: boolean;
  lastAt?: number;
  lastStatus?: string;
  lastLabel?: string;
  lastTone?: WshItemTone;
  periodTotal: number;
  periodErrors: number;
}

export type WshDependenciesResponse =
  | { success: true; flowId?: string; dependencies: WshDependency[]; periodDays: number }
  | { success: false; error: string };

export const WSH_DEPENDENCY_PERIOD_DAYS = 30;

/** Nível 2 do "Como resolver": onde o JOLT das rotas do item monta os campos recusados. */
export interface WshLayoutRequest {
  /** Rotas do item (busca e envio): o payload é montado na busca, o envio só completa. */
  routes: string[];
  fields: string[];
  /** Identificadores dos itens com erro, para marcar a regra que casou com eles. */
  itemIds?: string[];
}

export interface WshLayoutField {
  field: string;
  mappings: JoltFieldMapping[];
}

export interface WshRouteLayout {
  route: string;
  found: boolean;
  fields: WshLayoutField[];
}

/** Um fluxo do WSH que usa a rota: passos ativos (ATIVO = S) e os agendamentos que o disparam, como estão no ambiente. */
export interface WshScheduledFlow {
  /** IDFLUXO: o número do fluxo, o mesmo do catálogo. Ausente em banco sem a coluna. */
  id?: number;
  name: string;
  /** O passo desta rota está ativo no fluxo; inativo, o WSH pula a rota e nada novo é gravado. */
  routeActive: boolean;
  activeSteps: number;
  totalSteps: number;
  schedules: { name: string; intervalSeconds?: number; initialDelaySeconds?: number }[];
  /** Últimas execuções (gestão de execução do WSH), da mais recente; ausente quando o banco não tem essas tabelas. */
  runs?: WshFlowRun[];
}

export interface WshScheduleInfo {
  route: string;
  /** Vazio: a rota não está em nenhum fluxo deste ambiente. */
  flows: WshScheduledFlow[];
}

export type WshScheduleResponse = { success: true; info: WshScheduleInfo } | { success: false; error: string };

export type WshLayoutResponse = { success: true; layouts: WshRouteLayout[] } | { success: false; error: string };

export type WshRoutesResponse = { success: true; routes: WshRoute[] } | { success: false; error: string };
export type WshSearchResponse =
  | { success: true; items: WshItem[]; limit: number; lookbackHours: number }
  | { success: false; error: string };

export const WSH_DEFAULT_LOOKBACK_HOURS = 72;
export const WSH_MAX_LOOKBACK_HOURS = 24 * 90;
export const WSH_DEFAULT_LIMIT = 100;
export const WSH_MAX_LIMIT = 500;
export const WSH_MAX_TEXT_LENGTH = 120;
