import {
  INTEGRATION_STEP_ORDER,
  type IntegrationStepId,
  type IntegrationStepStatus,
  type IntegrationTraceResult,
  type IntegrationTraceStep
} from '../../../shared/integrationTypes';

/**
 * Lógica pura da linha do tempo de um rastreio (decisão 0003): os oito passos nascem pendentes,
 * cada camada observada atualiza o seu, e o primeiro `failed` define onde a integração quebrou.
 * Sem I/O: o `IntegrationTraceService` chama estas funções a cada evidência que chega.
 */

export function createEmptyTimeline(): IntegrationTraceStep[] {
  return INTEGRATION_STEP_ORDER.map((id) => ({ id, status: 'pending', source: 'none' }));
}

export type IntegrationStepUpdate = Partial<Omit<IntegrationTraceStep, 'id'>> & { id: IntegrationStepId };

/** Devolve uma nova lista com o passo mesclado; um id desconhecido não altera nada. */
export function applyStepUpdate(steps: IntegrationTraceStep[], update: IntegrationStepUpdate): IntegrationTraceStep[] {
  return steps.map((step) => (step.id === update.id ? { ...step, ...update } : step));
}

export function findBrokenStep(steps: IntegrationTraceStep[]): IntegrationStepId | undefined {
  return steps.find((step) => step.status === 'failed')?.id;
}

/**
 * Depois do primeiro passo falho, o que ainda estava pendente não vai acontecer: vira `skipped`.
 * Passos já observados (ok, unknown ou outro failed) ficam como estão, para não apagar evidência.
 */
export function skipAfterFailure(steps: IntegrationTraceStep[]): IntegrationTraceStep[] {
  const brokenIndex = steps.findIndex((step) => step.status === 'failed');
  if (brokenIndex < 0) return steps;
  return steps.map((step, index) =>
    index > brokenIndex && step.status === 'pending' ? { ...step, status: 'skipped' } : step
  );
}

export type IntegrationTimelineSummary = Record<IntegrationStepStatus, number> & { total: number };

export function summarizeTimeline(steps: IntegrationTraceStep[]): IntegrationTimelineSummary {
  const summary: IntegrationTimelineSummary = { ok: 0, failed: 0, pending: 0, skipped: 0, unknown: 0, total: steps.length };
  for (const step of steps) summary[step.status] += 1;
  return summary;
}

/** Posição 1..8 do passo na cadeia, para textos como "quebrou no passo 6". */
export function stepPosition(id: IntegrationStepId): number {
  return INTEGRATION_STEP_ORDER.indexOf(id) + 1;
}

/** Fecha o rastreio: marca os pendentes após a falha como pulados, define `brokenAt` e o fim. */
export function finalizeTrace(
  trace: Omit<IntegrationTraceResult, 'brokenAt' | 'finishedAt' | 'evidenceMarkdown'>,
  finishedAt: number
): Omit<IntegrationTraceResult, 'evidenceMarkdown'> {
  const steps = skipAfterFailure(trace.steps);
  return { ...trace, steps, brokenAt: findBrokenStep(steps), finishedAt };
}
