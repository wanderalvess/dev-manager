import { describe, expect, it } from 'vitest';
import type { IntegrationTraceStep } from '../../../shared/integrationTypes';
import {
  applyStepUpdate,
  createEmptyTimeline,
  finalizeTrace,
  findBrokenStep,
  skipAfterFailure,
  stepPosition,
  summarizeTimeline
} from './traceTimeline';

describe('traceTimeline', () => {
  it('nasce com os oito passos pendentes, na ordem da cadeia', () => {
    const steps = createEmptyTimeline();
    expect(steps.map((s) => s.id)).toEqual([
      'open-batch', 'winthor-token', 'winthor-api', 'jolt', 'ch-token', 'ch-send', 'pdv-arrival', 'close-batch'
    ]);
    expect(steps.every((s) => s.status === 'pending' && s.source === 'none')).toBe(true);
  });

  it('applyStepUpdate mescla só o passo pedido e não muta a lista original', () => {
    const steps = createEmptyTimeline();
    const updated = applyStepUpdate(steps, { id: 'open-batch', status: 'ok', source: 'ch-api', httpStatus: 200, durationMs: 120 });

    expect(updated[0]).toEqual({ id: 'open-batch', status: 'ok', source: 'ch-api', httpStatus: 200, durationMs: 120 });
    expect(updated.slice(1)).toEqual(steps.slice(1));
    expect(steps[0].status).toBe('pending');
  });

  it('findBrokenStep devolve o primeiro passo falho', () => {
    let steps = createEmptyTimeline();
    expect(findBrokenStep(steps)).toBeUndefined();
    steps = applyStepUpdate(steps, { id: 'pdv-arrival', status: 'failed' });
    steps = applyStepUpdate(steps, { id: 'close-batch', status: 'failed' });
    expect(findBrokenStep(steps)).toBe('pdv-arrival');
  });

  it('skipAfterFailure pula só os pendentes depois da falha e preserva o que já foi observado', () => {
    let steps = createEmptyTimeline();
    steps = applyStepUpdate(steps, { id: 'open-batch', status: 'ok' });
    steps = applyStepUpdate(steps, { id: 'winthor-api', status: 'failed' });
    steps = applyStepUpdate(steps, { id: 'close-batch', status: 'unknown' });

    const result = skipAfterFailure(steps).map((s) => s.status);
    expect(result).toEqual(['ok', 'pending', 'failed', 'skipped', 'skipped', 'skipped', 'skipped', 'unknown']);
  });

  it('skipAfterFailure sem falha devolve a mesma lista', () => {
    const steps = createEmptyTimeline();
    expect(skipAfterFailure(steps)).toBe(steps);
  });

  it('summarizeTimeline conta por status', () => {
    const steps: IntegrationTraceStep[] = [
      { id: 'open-batch', status: 'ok', source: 'ch-api' },
      { id: 'winthor-token', status: 'ok', source: 'http' },
      { id: 'winthor-api', status: 'failed', source: 'apm' },
      { id: 'jolt', status: 'skipped', source: 'none' },
      { id: 'close-batch', status: 'unknown', source: 'none' }
    ];
    expect(summarizeTimeline(steps)).toEqual({ ok: 2, failed: 1, pending: 0, skipped: 1, unknown: 1, total: 5 });
  });

  it('stepPosition é 1-based na ordem da cadeia', () => {
    expect(stepPosition('open-batch')).toBe(1);
    expect(stepPosition('pdv-arrival')).toBe(7);
  });

  it('finalizeTrace marca os pulados, aponta brokenAt e registra o fim', () => {
    let steps = createEmptyTimeline();
    steps = applyStepUpdate(steps, { id: 'open-batch', status: 'ok' });
    steps = applyStepUpdate(steps, { id: 'ch-send', status: 'failed', message: 'HTTP 500' });

    const result = finalizeTrace({ id: 't1', flowId: 'venda', startedAt: 1000, steps }, 5000);
    expect(result.brokenAt).toBe('ch-send');
    expect(result.finishedAt).toBe(5000);
    expect(result.steps.map((s) => s.status)).toEqual(['ok', 'pending', 'pending', 'pending', 'pending', 'failed', 'skipped', 'skipped']);
  });
});
