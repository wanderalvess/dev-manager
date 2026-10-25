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

export type IntegrationLayerAuthType = 'none' | 'basic' | 'bearer' | 'winthor';

export interface IntegrationLayerAuth {
  type: IntegrationLayerAuthType;
  user?: string;
  /** Segredo: criptografado em disco, nunca devolvido pela API (ver `hasPassword`). */
  password?: string;
  /** Segredo: criptografado em disco, nunca devolvido pela API (ver `hasToken`). */
  token?: string;
  /** Indica que há senha salva, quando `password` trafega sanitizado. */
  hasPassword?: boolean;
  /** Indica que há token salvo, quando `token` trafega sanitizado. */
  hasToken?: boolean;
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

export type IntegrationStepId =
  | 'open-batch'
  | 'winthor-token'
  | 'winthor-api'
  | 'jolt'
  | 'ch-token'
  | 'ch-send'
  | 'pdv-arrival'
  | 'close-batch';

export const INTEGRATION_STEP_ORDER: readonly IntegrationStepId[] = [
  'open-batch',
  'winthor-token',
  'winthor-api',
  'jolt',
  'ch-token',
  'ch-send',
  'pdv-arrival',
  'close-batch'
];

export const INTEGRATION_STEP_LABELS: Readonly<Record<IntegrationStepId, string>> = {
  'open-batch': 'WSH abre o lote no CH',
  'winthor-token': 'Token do WinThor',
  'winthor-api': 'Chamada da API do fluxo (Karaf)',
  jolt: 'Transformação JOLT',
  'ch-token': 'Token do CH',
  'ch-send': 'Envio do JSON ao lote',
  'pdv-arrival': 'CH desce para o PDV',
  'close-batch': 'WSH fecha o lote'
};

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

export interface IntegrationTraceResult {
  id: string;
  flowId: string;
  flowName?: string;
  batchNumber?: string;
  startedAt: number;
  finishedAt?: number;
  steps: IntegrationTraceStep[];
  /** Primeiro passo com status `failed`. */
  brokenAt?: IntegrationStepId;
  evidenceMarkdown: string;
}

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
