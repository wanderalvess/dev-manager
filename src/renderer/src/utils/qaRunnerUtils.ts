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
  if (status === 'failed') return 'bg-danger/5';
  if (status === 'warning') return 'bg-warning/5';
  return 'hover:bg-muted/20';
}

export function getAssertionBadgeClass(status: QaRunnerAssertionStatus): string {
  if (status === 'passed') {
    return 'bg-success/10 text-success border-success/30';
  }
  if (status === 'failed') {
    return 'bg-danger/10 text-danger border-danger/30';
  }
  return 'bg-warning/10 text-warning border-warning/30';
}

export function getAssertionBadgeLabel(status: QaRunnerAssertionStatus): string {
  if (status === 'passed') return 'OK';
  if (status === 'failed') return 'DIVERG';
  return 'ALERTA';
}
