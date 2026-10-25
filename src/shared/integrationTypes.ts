/**
 * Rastreio de Integração ponta a ponta (decisão 0003): WinThor → WSH → CH → PDV.
 * Tipos compartilhados entre main, preload, renderer, server e MCP. Vivem fora de
 * `types.ts` porque aquele arquivo já passa do teto de linhas do projeto.
 */

export type IntegrationLayerId = 'winthor' | 'wsh' | 'ch' | 'pdv';

export const INTEGRATION_LAYER_ORDER: readonly IntegrationLayerId[] = ['winthor', 'wsh', 'ch', 'pdv'];

export const INTEGRATION_LAYER_LABELS: Readonly<Record<IntegrationLayerId, string>> = {
  winthor: 'WinThor (Karaf + Oracle)',
  wsh: 'WSH (Winthor Smart Hub)',
  ch: 'Commerce Hub (CH)',
  pdv: 'PDV (Postgres)'
};

/** `rac-password` é o login do PDVSync (OAuth2 por senha no RAC): usuário, senha, client_id e client_secret. */
export type IntegrationLayerAuthType = 'none' | 'basic' | 'bearer' | 'winthor' | 'rac-password';

export interface IntegrationLayerAuth {
  type: IntegrationLayerAuthType;
  user?: string;
  /** Segredo: criptografado em disco, nunca devolvido pela API (ver `hasPassword`). */
  password?: string;
  /** Segredo: criptografado em disco, nunca devolvido pela API (ver `hasToken`). */
  token?: string;
  /** Só `rac-password`: identificador do cliente OAuth. Não é segredo. */
  clientId?: string;
  /** Só `rac-password`. Segredo: criptografado em disco, nunca devolvido pela API (ver `hasClientSecret`). */
  clientSecret?: string;
  /** Indica que há senha salva, quando `password` trafega sanitizado. */
  hasPassword?: boolean;
  /** Indica que há token salvo, quando `token` trafega sanitizado. */
  hasToken?: boolean;
  /** Indica que há client_secret salvo, quando `clientSecret` trafega sanitizado. */
  hasClientSecret?: boolean;
}

/** Endereços e inquilino do PDVSync (CH) usados pelo rastreio. Todos validados com `isSafeUrl` no main. */
export interface IntegrationPdvSyncEndpoints {
  /** `POST` do login (RAC), que devolve `access_token`. */
  racUrl?: string;
  /** Código do inquilino, usado nos caminhos e filtros da API de lote. */
  tenantId?: string;
  /** Base de `LoteExternoRetornos`: o Hub acrescenta `/<inquilino>/<lote>`. */
  batchStatusUrl?: string;
  /** Base de `LojaLoteStatusretorno`: o Hub acrescenta `?inquilino=&loteOrigem=&idRetaguardaLoja=`. */
  storeStatusUrl?: string;
}

/** Como alcançar e observar uma camada na máquina local. Tudo opcional: o pré-voo pula o que não estiver preenchido. */
export interface IntegrationLayerConfig {
  layer: IntegrationLayerId;
  /** Validada com `isSafeUrl` no main antes de qualquer requisição. */
  baseUrl?: string;
  /** Ex.: `/actuator/health`. Sem isso, o pré-voo testa só a porta e marca a camada como aviso. */
  healthPath?: string;
  port?: number;
  windowsServiceName?: string;
  /** Ex.: executável do PDV. */
  processName?: string;
  /** Oracle (winthor) ou Postgres (pdv), um id de `databaseConnections`. */
  dbConnectionId?: string;
  /** Lido com `isLogFilePath`/`isInsideDir`, como as fontes de log. */
  logFilePath?: string;
  auth?: IntegrationLayerAuth;
  /** Só na camada CH: como consultar o lote no PDVSync. */
  pdvsync?: IntegrationPdvSyncEndpoints;
}

export interface IntegrationFlowTrigger {
  method: 'GET' | 'POST';
  /** Caminho relativo à `baseUrl` da camada WSH. */
  path: string;
  body?: string;
}

export interface IntegrationFlowEvidence {
  /** Opcional: o dado existe na retaguarda? Binds `:lote`, `:inicio`, `:fim`. */
  oracleQuery?: string;
  /** Prova de chegada no Postgres do PDV. Binds `:lote`, `:inicio`, `:fim`. */
  pdvQuery: string;
  /** Quanto esperar a descida CH → PDV antes de dar o passo como falho. */
  pdvWaitSeconds: number;
  /** Onde contar itens no retorno da API do WinThor (ex.: `$.data`). */
  expectedItemsJsonPath?: string;
}

/** Um fluxo do WSH e como provar cada passo dele. */
export interface IntegrationFlowDefinition {
  id: string;
  name: string;
  description?: string;
  /** Tipo de lote informado ao CH na abertura. */
  chBatchType: string;
  trigger?: IntegrationFlowTrigger;
  /** API chamada pelo fluxo no WinThor (evidência do passo 3). */
  winthorApiPath?: string;
  evidence: IntegrationFlowEvidence;
  /** Texto além do número do lote para filtrar os logs. */
  logMarkers?: { wsh?: string; ch?: string };
  enabled?: boolean;
}

/**
 * Os oito passos de um fluxo de **saída** (WinThor → PDV), na ordem real dos layouts do WSH: o lote só é
 * aberto depois de buscar e transformar os dados. Fluxos de entrada (vendas) não usam lote e têm modelo próprio.
 */
export type IntegrationStepId =
  | 'winthor-login'
  | 'winthor-fetch'
  | 'jolt'
  | 'pdvsync-login'
  | 'open-batch'
  | 'send'
  | 'close-batch'
  | 'pdv-arrival';

export const INTEGRATION_STEP_ORDER: readonly IntegrationStepId[] = [
  'winthor-login',
  'winthor-fetch',
  'jolt',
  'pdvsync-login',
  'open-batch',
  'send',
  'close-batch',
  'pdv-arrival'
];

export const INTEGRATION_STEP_LABELS: Readonly<Record<IntegrationStepId, string>> = {
  'winthor-login': 'Login no WinThor',
  'winthor-fetch': 'Busca na API do WinThor',
  jolt: 'Transformação JOLT',
  'pdvsync-login': 'Login no PDVSync',
  'open-batch': 'Abertura do lote no PDVSync',
  send: 'Envio do JSON ao lote',
  'close-batch': 'Fechamento do lote',
  'pdv-arrival': 'Chegada nas lojas (PDV)'
};

/** Rótulo do passo, tolerante a rastreios antigos guardados com ids que não existem mais. */
export function stepLabel(id: string): string {
  return (INTEGRATION_STEP_LABELS as Record<string, string>)[id] ?? id;
}

export type IntegrationStepStatus = 'ok' | 'failed' | 'pending' | 'skipped' | 'unknown';

export type IntegrationEvidenceSource = 'ch-api' | 'apm' | 'log' | 'sql' | 'http' | 'none';

export interface IntegrationTraceStep {
  id: IntegrationStepId;
  status: IntegrationStepStatus;
  startedAt?: number;
  durationMs?: number;
  httpStatus?: number;
  itemCount?: number;
  source: IntegrationEvidenceSource;
  /** Trecho curto: linha de log, resumo do SQL, corpo da resposta. */
  evidence?: string;
  /** Em português, para a tela e o Jira. */
  message?: string;
}

/** Trechos de log filtrados pelo número do lote, de uma das camadas. */
export interface IntegrationLogExcerpt {
  source: 'wsh' | 'ch';
  /** Últimas linhas que casaram, em ordem de arquivo (limitadas). */
  lines: string[];
  /** Quantas linhas casaram no trecho lido do arquivo. */
  totalMatches: number;
  /** Quantas das que casaram parecem erro (ERROR, FATAL, Exception...). */
  errorLines: number;
  truncated: boolean;
}

/** Status de uma loja no PDVSync, já traduzido para o vocabulário do rastreio. */
export interface IntegrationTraceStore {
  branchId?: string;
  status: IntegrationStepStatus;
  /** Nome original do status no PDVSync (ex.: BaixadoComSucesso). */
  statusName: string;
  errors: { id?: string; message: string }[];
}

export interface IntegrationTraceResult {
  id: string;
  flowId: string;
  flowName?: string;
  batchNumber?: string;
  startedAt: number;
  finishedAt?: number;
  /** Parâmetros usados, para reconsultar o mesmo lote no modo ao vivo. */
  request?: { lookbackMinutes: number; branchId?: string };
  /** Status por loja vindo do PDVSync, quando houver. */
  stores?: IntegrationTraceStore[];
  steps: IntegrationTraceStep[];
  /** Primeiro passo com status `failed`. */
  brokenAt?: IntegrationStepId;
  logExcerpts?: IntegrationLogExcerpt[];
  /** Avisos sobre fontes que não puderam ser consultadas (APM sem receptor, log inexistente...). */
  notes?: string[];
  evidenceMarkdown: string;
}

/** Linha da lista do histórico de rastreios, sem os passos. */
export interface IntegrationTraceListItem {
  id: string;
  flowId: string;
  flowName?: string;
  batchNumber?: string;
  startedAt: number;
  finishedAt?: number;
  brokenAt?: IntegrationStepId;
  okSteps: number;
  failedSteps: number;
  unknownSteps: number;
}

export const DEFAULT_TRACE_LOOKBACK_MINUTES = 120;
export const MAX_TRACE_LOOKBACK_MINUTES = 10080;

export interface IntegrationBatchTraceRequest {
  flowId: string;
  batchNumber: string;
  /** Janela para trás a partir de agora usada em :inicio (padrão 120 min, máximo 7 dias). */
  lookbackMinutes?: number;
  /** Código da filial na retaguarda (`idRetaguardaLoja`) para filtrar o status por loja no PDVSync. Sem ele, vêm todas. */
  branchId?: string;
}

export type IntegrationBatchTraceResponse =
  | { success: true; trace: IntegrationTraceResult }
  | { success: false; error: string };

export type IntegrationCheckStatus = 'ok' | 'failed' | 'skipped';

export interface IntegrationReadinessCheck {
  label: string;
  status: IntegrationCheckStatus;
  detail?: string;
  durationMs?: number;
}

export type IntegrationLayerReadinessStatus = 'ok' | 'warning' | 'failed' | 'not-configured';

export interface IntegrationLayerReadiness {
  layer: IntegrationLayerId;
  status: IntegrationLayerReadinessStatus;
  checks: IntegrationReadinessCheck[];
}

export interface IntegrationReadinessResult {
  checkedAt: number;
  layers: IntegrationLayerReadiness[];
}
