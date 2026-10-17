/**
 * Métricas locais de uso (épico #11, issue #12).
 *
 * Regra de ouro: só contadores e durações. Nenhum tipo aqui carrega conteúdo (SQL, caminhos,
 * schemas, prompts, respostas da IA, credenciais, nome ou e-mail). Módulo e ação são chaves
 * curtas de uma lista fechada (ver usageActions.ts) ou nomes de tools MCP.
 */

export type UsageOrigin = 'ui' | 'rest' | 'mcp';

export type UsageRisk = 'read' | 'write' | 'destructive';

/** Totais de uma ação em um dia. */
export interface UsageCounter {
  runs: number;
  ok: number;
  failed: number;
  /** Soma das durações em ms (média = totalMs / runs). */
  totalMs: number;
  /** Só para tools MCP: classificação de risco (toolSafety). */
  risk?: UsageRisk;
}

/** Um uso a registrar. `durationMs` é arredondado e limitado antes de entrar na soma. */
export interface UsageEvent {
  module: string;
  action: string;
  origin: UsageOrigin;
  ok: boolean;
  durationMs: number;
  risk?: UsageRisk;
}

/** dia local (AAAA-MM-DD) → chave `módulo/ação/origem` → totais. */
export type UsageDays = Record<string, Record<string, UsageCounter>>;

/** Conteúdo do arquivo `usage-metrics.json`. */
export interface UsageMetricsStore {
  schemaVersion: 1;
  /** UUID aleatório da instalação, criado no primeiro uso. */
  installId: string;
  createdAt: string;
  days: UsageDays;
}

export interface UsageSummaryRow {
  module: string;
  action: string;
  origin: UsageOrigin;
  runs: number;
  ok: number;
  failed: number;
  totalMs: number;
  avgMs: number;
  risk?: UsageRisk;
}

export interface UsageModuleTotal {
  module: string;
  runs: number;
  ok: number;
  failed: number;
  totalMs: number;
}

export interface UsageWeekTotal {
  /** Segunda-feira da semana (AAAA-MM-DD). */
  weekStart: string;
  runs: number;
}

export interface UsageSummary {
  enabled: boolean;
  installId: string;
  /** Primeiro e último dia com dados dentro do filtro; `null` quando não há nada. */
  firstDay: string | null;
  lastDay: string | null;
  totalRuns: number;
  totalOk: number;
  totalFailed: number;
  byModule: UsageModuleTotal[];
  byWeek: UsageWeekTotal[];
  rows: UsageSummaryRow[];
}

export interface UsageSummaryQuery {
  /** AAAA-MM-DD, inclusivo. */
  from?: string;
  /** AAAA-MM-DD, inclusivo. */
  to?: string;
}
