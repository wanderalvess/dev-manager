import type { AuthLockoutLogEntry } from './authLockoutTypes';

/**
 * Validação de Cenários → Validação de API: uma requisição e o que a resposta precisa ter. O teste chama a API
 * e confronta o resultado com cada regra: status, tempo de resposta, cabeçalho, texto do corpo, campos do JSON e
 * campo do JSON comparado com o valor de uma consulta (somente leitura) numa conexão do DB Studio.
 */

export type ApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export const API_HTTP_METHODS: readonly ApiHttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export type ApiRuleKind = 'status' | 'duration' | 'header' | 'body' | 'json' | 'db';

export type ApiRuleOperator =
  | 'equals'
  | 'not-equals'
  | 'in'
  | 'contains'
  | 'not-contains'
  | 'matches'
  | 'exists'
  | 'not-exists'
  | 'not-empty'
  | 'greater'
  | 'less'
  | 'length-equals';

export interface ApiRule {
  id: string;
  kind: ApiRuleKind;
  /** Caminho do campo no JSON (`$.itens[0].codigo`) em json e db; nome do cabeçalho em header. */
  path?: string;
  operator: ApiRuleOperator;
  /** Valor esperado como texto. No status, `in` aceita lista (`200, 201`) e faixa (`2xx`). Em db vem da consulta. */
  expected?: string;
  /** db: conexão do DB Studio. */
  connectionId?: string;
  /** db: consulta somente leitura; o valor comparado é a primeira coluna da primeira linha. */
  sql?: string;
  /** db: campo da resposta que entra na consulta como `:valor` (opcional). */
  bindPath?: string;
}

/** `settings-wta` usa o login do WTA de Configurações; `none` chama a API sem autenticação. */
export type ApiAuthMode = 'none' | 'settings-wta';

export interface ApiHeader {
  key: string;
  value: string;
}

export interface ApiScenario {
  id: string;
  name: string;
  method: ApiHttpMethod;
  /** Aceita `{{wtaUrl}}`, trocado pela URL do WTA de Configurações. */
  url: string;
  headers: ApiHeader[];
  body?: string;
  auth: ApiAuthMode;
  rules: ApiRule[];
  updatedAt?: string;
}

export interface ApiRuleResult {
  ruleId: string;
  /** A regra em português, ex.: "Status igual a 200". */
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export interface ApiResponseSnapshot {
  /** 0 = sem resposta. */
  status: number;
  durationMs: number;
  /** Cabeçalhos da resposta (nomes em minúsculas), com cookies e tokens mascarados. */
  headers: Record<string, string>;
  /** Corpo com tokens mascarados, cortado em 8 KB. */
  body: string;
  isJson: boolean;
  error?: string;
}

export interface ApiScenarioRunResult {
  scenarioId: string;
  scenarioName: string;
  startedAt: string;
  finishedAt: string;
  /** Houve resposta e todas as regras passaram. */
  success: boolean;
  /** Erro antes de chamar a API (URL inválida, login do WTA recusado...). */
  error?: string;
  request: { method: ApiHttpMethod; url: string };
  response?: ApiResponseSnapshot;
  rules: ApiRuleResult[];
  log: AuthLockoutLogEntry[];
  markdown: string;
}

export interface ApiScenarioProgress extends AuthLockoutLogEntry {
  scenarioId: string;
}

export type ApiScenarioRunResponse = ApiScenarioRunResult | { error: string };

export type ApiScenarioSaveResponse = { success: true; scenario: ApiScenario } | { success: false; error: string };
