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
  it('nasce com os oito passos pendentes, na ordem real do fluxo de saída', () => {
    const steps = createEmptyTimeline();
    expect(steps.map((s) => s.id)).toEqual([
      'winthor-login', 'winthor-fetch', 'jolt', 'pdvsync-login', 'open-batch', 'send', 'close-batch', 'pdv-arrival'
    ]);
    expect(steps.every((s) => s.status === 'pending' && s.source === 'none')).toBe(true);
  });

  it('applyStepUpdate mescla só o passo pedido e não muta a lista original', () => {
    const steps = createEmptyTimeline();
    const updated = applyStepUpdate(steps, { id: 'open-batch', status: 'ok', source: 'ch-api', httpStatus: 200, durationMs: 120 });

    expect(updated.find((s) => s.id === 'open-batch')).toEqual({ id: 'open-batch', status: 'ok', source: 'ch-api', httpStatus: 200, durationMs: 120 });
    expect(updated.filter((s) => s.id !== 'open-batch')).toEqual(steps.filter((s) => s.id !== 'open-batch'));
    expect(steps.find((s) => s.id === 'open-batch')?.status).toBe('pending');
  });

  it('findBrokenStep devolve o primeiro passo falho na ordem da cadeia', () => {
    let steps = createEmptyTimeline();
    expect(findBrokenStep(steps)).toBeUndefined();
    steps = applyStepUpdate(steps, { id: 'pdv-arrival', status: 'failed' });
    steps = applyStepUpdate(steps, { id: 'close-batch', status: 'failed' });
    expect(findBrokenStep(steps)).toBe('close-batch');
  });

  it('skipAfterFailure pula só os pendentes depois da falha e preserva o que já foi observado', () => {
    let steps = createEmptyTimeline();
    steps = applyStepUpdate(steps, { id: 'winthor-login', status: 'ok' });
    steps = applyStepUpdate(steps, { id: 'jolt', status: 'failed' });
    steps = applyStepUpdate(steps, { id: 'close-batch', status: 'unknown' });

    const result = skipAfterFailure(steps).map((s) => s.status);
    expect(result).toEqual(['ok', 'pending', 'failed', 'skipped', 'skipped', 'skipped', 'unknown', 'skipped']);
  });

  it('skipAfterFailure sem falha devolve a mesma lista', () => {
    const steps = createEmptyTimeline();
    expect(skipAfterFailure(steps)).toBe(steps);
  });

  it('summarizeTimeline conta por status', () => {
    const steps: IntegrationTraceStep[] = [
      { id: 'open-batch', status: 'ok', source: 'ch-api' },
      { id: 'winthor-login', status: 'ok', source: 'http' },
      { id: 'winthor-fetch', status: 'failed', source: 'apm' },
      { id: 'jolt', status: 'skipped', source: 'none' },
      { id: 'close-batch', status: 'unknown', source: 'none' }
    ];
    expect(summarizeTimeline(steps)).toEqual({ ok: 2, failed: 1, pending: 0, skipped: 1, unknown: 1, total: 5 });
  });

  it('stepPosition é 1-based na ordem da cadeia', () => {
    expect(stepPosition('winthor-login')).toBe(1);
    expect(stepPosition('open-batch')).toBe(5);
    expect(stepPosition('pdv-arrival')).toBe(8);
  });

  it('finalizeTrace marca os pulados, aponta brokenAt e registra o fim', () => {
    let steps = createEmptyTimeline();
    steps = applyStepUpdate(steps, { id: 'winthor-login', status: 'ok' });
    steps = applyStepUpdate(steps, { id: 'send', status: 'failed', message: 'HTTP 500' });

    const result = finalizeTrace({ id: 't1', flowId: 'produto', startedAt: 1000, steps }, 5000);
    expect(result.brokenAt).toBe('send');
    expect(result.finishedAt).toBe(5000);
    expect(result.steps.map((s) => s.status)).toEqual(['ok', 'pending', 'pending', 'pending', 'pending', 'failed', 'skipped', 'skipped']);
  });
});
