import type {
  QaExecutionResult,
  QaRegressionTemplate,
  QaStepExecutionResult
} from '../../../shared/types';

export type QaRunnerAssertionStatus = QaStepExecutionResult['assertions'][number]['status'];

/** Converte as variáveis padrão do template (valores arbitrários) em mapa de strings. */
export function buildDefaultVariables(template: QaRegressionTemplate): Record<string, string> {
  const def = template.defaultVariables || {};
  const strMap: Record<string, string> = {};
  for (const [k, v] of Object.entries(def)) {
    strMap[k] = String(v);
  }
  return strMap;
}

/** Prefere a primeira conexão Oracle; sem Oracle, usa a primeira conexão disponível. */
export function pickDefaultConnectionId(
  oracleConnections: Array<{ id: string }>,
  allConnections: Array<{ id: string }>
): string | null {
  if (oracleConnections.length > 0) return oracleConnections[0].id;
  if (allConnections.length > 0) return allConnections[0].id;
  return null;
}

/** Após a execução, expande só os passos com falha; se não houver falhas, expande todos. */
export function computeInitialExpandedSteps(result: QaExecutionResult): Set<string> {
  const failedIds = new Set<string>();
  result.stepResults.forEach((s) => {
    if (!s.success) failedIds.add(s.stepId);
  });
  return failedIds.size > 0 ? failedIds : new Set(result.stepResults.map((s) => s.stepId));
}

export function toggleStepId(current: Set<string>, stepId: string): Set<string> {
  const next = new Set(current);
  if (next.has(stepId)) next.delete(stepId);
  else next.add(stepId);
  return next;
}

export function getAssertionRowClass(status: QaRunnerAssertionStatus): string {
  if (status === 'failed') return 'bg-rose-500/5';
  if (status === 'warning') return 'bg-amber-500/5';
  return 'hover:bg-muted/20';
}

export function getAssertionBadgeClass(status: QaRunnerAssertionStatus): string {
  if (status === 'passed') {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  }
  if (status === 'failed') {
    return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
  }
  return 'bg-amber-500/10 text-amber-500 border-amber-500/30';
}

export function getAssertionBadgeLabel(status: QaRunnerAssertionStatus): string {
  if (status === 'passed') return 'OK';
  if (status === 'failed') return 'DIVERG';
  return 'ALERTA';
}
