/**
 * Uso de IA (tokens) por chamada, só no que passa pelo Hub. Nunca guarda prompt, resposta nem chave:
 * só data, provedor, modelo, origem e contagem de tokens.
 */

export type AiUsagePeriod = '7d' | '30d' | 'all';

export const AI_USAGE_PERIODS: ReadonlyArray<{ id: AiUsagePeriod; label: string }> = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'all', label: 'Tudo' }
];

/** Origem do uso. O chamador informa em `LlmChatRequest.source`; fora desta lista vira `outros`. */
export const AI_USAGE_SOURCE_LABELS: Record<string, string> = {
  'ia-conduz': 'IA conduz (Nova versão)',
  'perguntar-ia': 'Perguntar à documentação',
  'diagnostico-http': 'Diagnóstico de requisição HTTP',
  mcp: 'Assistente externo (MCP)',
  outros: 'Outros'
};

export const AI_USAGE_DEFAULT_SOURCE = 'outros';

export function normalizeAiUsageSource(value: unknown): string {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(AI_USAGE_SOURCE_LABELS, value)
    ? value
    : AI_USAGE_DEFAULT_SOURCE;
}

export interface AiUsageTotals {
  calls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/** Uma linha do dia: tudo que um provedor/modelo/origem gastou naquele dia. */
export interface AiUsageRow extends AiUsageTotals {
  providerId: string;
  provider: string;
  model: string;
  source: string;
}

/** AAAA-MM-DD (dia local) → linhas do dia. */
export type AiUsageDays = Record<string, AiUsageRow[]>;

export interface AiUsageStore {
  schemaVersion: 1;
  days: AiUsageDays;
}

export interface AiUsageGroup extends AiUsageTotals {
  key: string;
  label: string;
  /** Só existe quando o provedor tem preço informado pelo usuário. */
  costEstimate?: number;
}

export type AiLimitLevel = 'ok' | 'warning' | 'blocked';

/** Situação do teto de um provedor (tokens do dia e do mês corrente). */
export interface AiLimitStatus {
  providerId: string;
  providerName: string;
  dayUsed: number;
  monthUsed: number;
  dayLimit?: number;
  monthLimit?: number;
  level: AiLimitLevel;
  /** Preenchida em `warning` e `blocked`; em pt-BR, com o "Como resolver" no bloqueio. */
  message?: string;
}

export interface AiUsageReport {
  /** `false` = a contagem de uso está desligada: nada é registrado e o teto não é aplicado. */
  enabled: boolean;
  period: AiUsagePeriod;
  totals: AiUsageTotals;
  costEstimate?: number;
  byProvider: AiUsageGroup[];
  byModel: AiUsageGroup[];
  bySource: AiUsageGroup[];
  limits: AiLimitStatus[];
}
