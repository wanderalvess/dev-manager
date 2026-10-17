import type { UsageOrigin } from './usageMetricsTypes';

/**
 * Chaves das métricas de uso (`módulo/ação/origem`). Ficam em `shared` porque tanto o
 * armazenamento (main) quanto o cálculo de economia, que também roda na interface, precisam
 * ler a mesma chave.
 *
 * Privacidade: módulo e ação precisam bater com SEGMENT_PATTERN (minúsculas, números, `-` e
 * `_`). Qualquer outra coisa é DESCARTADA, não "limpa" — um caminho, SQL ou e-mail passado por
 * engano não tem como virar chave.
 */
const SEGMENT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const ORIGINS: readonly UsageOrigin[] = ['ui', 'rest', 'mcp'];

export function isUsageSegment(value: unknown): value is string {
  return typeof value === 'string' && SEGMENT_PATTERN.test(value);
}

export function isUsageOrigin(value: unknown): value is UsageOrigin {
  return typeof value === 'string' && (ORIGINS as readonly string[]).includes(value);
}

export function buildUsageKey(module: string, action: string, origin: UsageOrigin): string {
  return `${module}/${action}/${origin}`;
}

export function parseUsageKey(key: string): { module: string; action: string; origin: UsageOrigin } | null {
  const parts = key.split('/');
  if (parts.length !== 3) return null;
  const [module, action, origin] = parts;
  if (!isUsageSegment(module) || !isUsageSegment(action) || !isUsageOrigin(origin)) return null;
  return { module, action, origin };
}
