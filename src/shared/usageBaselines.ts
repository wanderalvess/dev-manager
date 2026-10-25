import type { UsageOrigin } from './usageMetricsTypes';

/**
 * Linha de base do tempo economizado (épico #11, issue #13): quanto tempo a pessoa levava para
 * fazer a mesma coisa à mão. Sem isso a contagem de usos não vira horas economizadas.
 *
 * Os valores PADRÃO são estimativas iniciais, não medições. Por isso a origem do valor
 * (`default` ou `user`) acompanha o número até a tela e o CSV, e a economia é separada em
 * "confirmada" (baseada em tempo informado pela pessoa) e "estimada" (baseada no padrão).
 */
export interface UsageBaselineDefinition {
  /** `módulo/ação` canônico. */
  key: string;
  module: string;
  label: string;
  /** Minutos para fazer manualmente, usados enquanto a pessoa não informar o dela. */
  defaultMinutes: number;
}

export const USAGE_BASELINE_DEFINITIONS: readonly UsageBaselineDefinition[] = [
  { key: 'environment/pipeline-run', module: 'environment', label: 'Preparar o ambiente (pipeline de 1 clique)', defaultMinutes: 10 },
  { key: 'environment/reset', module: 'environment', label: 'Reset completo do ambiente', defaultMinutes: 15 },
  { key: 'deploy/run-profile', module: 'deploy', label: 'Deploy por perfil (Maven e Karaf)', defaultMinutes: 15 },
  { key: 'karaf/deploy', module: 'karaf', label: 'Deploy de bundle no Karaf', defaultMinutes: 10 },
  { key: 'database/oracle-capture-start', module: 'database', label: 'Capturar SQL e binds no Oracle', defaultMinutes: 20 },
  { key: 'database/backup-run', module: 'database', label: 'Backup de schema', defaultMinutes: 15 },
  { key: 'database/restore', module: 'database', label: 'Restaurar backup', defaultMinutes: 20 },
  { key: 'database/restore-drill', module: 'database', label: 'Restore drill (testar a restauração)', defaultMinutes: 30 },
  { key: 'routines/download-ccw', module: 'routines', label: 'Baixar rotina da CCW', defaultMinutes: 5 },
  { key: 'qa/regression-execute', module: 'qa', label: 'Regressão de QA', defaultMinutes: 30 },
  { key: 'qa/test-runner-execute', module: 'qa', label: 'Rodar suíte de testes', defaultMinutes: 10 },
  { key: 'qa/taut-run-tests', module: 'qa', label: 'Rodar testes Cypress (TAUT)', defaultMinutes: 10 },
  { key: 'git/create-task-branch', module: 'git', label: 'Criar branch da tarefa', defaultMinutes: 3 },
  { key: 'integration/readiness-check', module: 'integration', label: 'Conferir à mão as camadas da integração (WinThor, WSH, CH e PDV)', defaultMinutes: 10 },
  { key: 'integration/batch-trace', module: 'integration', label: 'Rastrear um lote à mão (logs, banco do PDV e APM)', defaultMinutes: 20 }
];

const DEFINITIONS_BY_KEY = new Map(USAGE_BASELINE_DEFINITIONS.map((d) => [d.key, d]));

/**
 * Tool MCP → chave da linha de base. As tools são contadas pelo nome (ex.: `db_run_backup`),
 * mas fazem o mesmo trabalho manual que a ação da interface (`database/backup-run`), então
 * usam o mesmo tempo de referência.
 */
export const MCP_TOOL_TO_BASELINE_KEY: Readonly<Record<string, string>> = {
  profile_run: 'environment/pipeline-run',
  env_reset_environment: 'environment/reset',
  deploy_run_profile: 'deploy/run-profile',
  karaf_deploy: 'karaf/deploy',
  db_start_oracle_capture: 'database/oracle-capture-start',
  db_run_backup: 'database/backup-run',
  db_restore_backup: 'database/restore',
  db_run_restore_drill: 'database/restore-drill',
  routines_download_ccw_routine: 'routines/download-ccw',
  qa_run_regression_suite: 'qa/regression-execute',
  test_runner_execute: 'qa/test-runner-execute',
  taut_run_tests: 'qa/taut-run-tests',
  git_create_task_branch: 'git/create-task-branch',
  integration_check_readiness: 'integration/readiness-check',
  integration_check_batch: 'integration/batch-trace'
};

/** Tempo manual informado pela própria pessoa. `setAt` (AAAA-MM-DD) é o dia em que ela informou. */
export interface UsageBaselineOverride {
  minutes: number;
  setAt?: string;
}

/** Sobrescritas da pessoa por chave de linha de base. Quem não está aqui usa o padrão. */
export type UsageBaselineOverrides = Record<string, UsageBaselineOverride>;

export type UsageBaselineSource = 'default' | 'user';

export interface ResolvedUsageBaseline {
  minutes: number;
  source: UsageBaselineSource;
  setAt?: string;
}

export const MAX_BASELINE_MINUTES = 24 * 60;

export function getBaselineDefinition(key: string): UsageBaselineDefinition | undefined {
  return DEFINITIONS_BY_KEY.get(key);
}

/** Minutos válidos (0 a 24 h, uma casa decimal) ou `null` se o valor não serve. */
export function normalizeBaselineMinutes(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_BASELINE_MINUTES) return null;
  return Math.round(value * 10) / 10;
}

/**
 * Descarta o que não vale em vez de quebrar: chave sem definição, minutos inválidos, data
 * malformada. `config.json` pode ter sido editado à mão ou vir de uma versão futura.
 */
export function sanitizeBaselineOverrides(raw: unknown): UsageBaselineOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const result: UsageBaselineOverrides = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!DEFINITIONS_BY_KEY.has(key) || !value || typeof value !== 'object') continue;
    const minutes = normalizeBaselineMinutes((value as Record<string, unknown>).minutes);
    if (minutes === null) continue;
    const setAt = (value as Record<string, unknown>).setAt;
    result[key] = typeof setAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(setAt) ? { minutes, setAt } : { minutes };
  }
  return result;
}

/**
 * Chave da linha de base de um uso registrado, ou `null` quando a ação não tem equivalente
 * manual (consulta à documentação, conversa com a IA, etc.): ela conta como uso, não como economia.
 */
export function baselineKeyFor(module: string, action: string, origin: UsageOrigin): string | null {
  if (origin === 'mcp') return MCP_TOOL_TO_BASELINE_KEY[action] ?? null;
  const key = `${module}/${action}`;
  return DEFINITIONS_BY_KEY.has(key) ? key : null;
}

/** Tempo manual a usar para a chave: o da pessoa, se informou, senão o padrão. `null` sem definição. */
export function resolveBaseline(key: string, overrides: UsageBaselineOverrides): ResolvedUsageBaseline | null {
  const definition = DEFINITIONS_BY_KEY.get(key);
  if (!definition) return null;
  const own = overrides[key];
  if (own) return { minutes: own.minutes, source: 'user', ...(own.setAt ? { setAt: own.setAt } : {}) };
  return { minutes: definition.defaultMinutes, source: 'default' };
}
