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
  /** Soma das durações só dos usos com sucesso. Base do tempo economizado (a duração de uma falha não economiza nada). */
  okMs: number;
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

// ---- Tempo economizado (issue #13) ----

export type UsageBaselineOrigin = 'default' | 'user';

export interface UsageImpactModule {
  module: string;
  savedMs: number;
}

/** Economia numa janela de tempo (7 dias, 30 dias ou desde o início). */
export interface UsageImpactWindow {
  /** Tempo economizado, somando o confirmado e o estimado com valores padrão. */
  savedMs: number;
  /** Parte de `savedMs` que usa um tempo manual informado pela própria pessoa. */
  confirmedMs: number;
  /** Usos com sucesso de ações que têm equivalente manual. */
  okRuns: number;
  byModule: UsageImpactModule[];
}

/** Uma automação com equivalente manual, com a linha de base usada e a economia total dela. */
export interface UsageImpactRow {
  key: string;
  module: string;
  label: string;
  baselineMinutes: number;
  source: UsageBaselineOrigin;
  /** Dia (AAAA-MM-DD) em que a pessoa informou o tempo; ausente quando é o padrão. */
  setAt?: string;
  okRuns: number;
  /** Tempo real total dos usos com sucesso. */
  okMs: number;
  savedMs: number;
}

export interface UsageImpact {
  /** Dia (AAAA-MM-DD) usado como "hoje" no cálculo. */
  today: string;
  week: UsageImpactWindow;
  month: UsageImpactWindow;
  total: UsageImpactWindow;
  /** Todas as automações com linha de base, mesmo as ainda não usadas. */
  rows: UsageImpactRow[];
}
