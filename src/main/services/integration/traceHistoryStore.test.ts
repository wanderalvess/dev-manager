import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { IntegrationTraceResult } from '../../../shared/integrationTypes';
import { isSafeTraceId, toListItem, TraceHistoryStore } from './traceHistoryStore';
import { applyStepUpdate, createEmptyTimeline, finalizeTrace } from './traceTimeline';

const makeTrace = (id: string, startedAt: number, failedAt = false): IntegrationTraceResult => {
  let steps = createEmptyTimeline();
  steps = applyStepUpdate(steps, { id: 'winthor-fetch', status: 'ok', source: 'apm' });
  steps = applyStepUpdate(steps, { id: 'pdv-arrival', status: failedAt ? 'failed' : 'ok', source: 'sql' });
  const base = finalizeTrace({ id, flowId: 'venda', flowName: 'Venda', batchNumber: '48213', startedAt, steps }, startedAt + 1000);
  return { ...base, evidenceMarkdown: '# md' };
};

describe('TraceHistoryStore', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-traces-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('isSafeTraceId só aceita identificadores simples (sem caminho)', () => {
    expect(isSafeTraceId('t-1730000000-ab12')).toBe(true);
    for (const bad of ['../x', 'a/b', 'a\\b', '', '-x', 'x'.repeat(65), 5, null]) expect(isSafeTraceId(bad)).toBe(false);
  });

  it('grava e relê o rastreio inteiro, criando a pasta sozinho', async () => {
    const store = new TraceHistoryStore(path.join(dir, 'novo', 'integration-traces'));
    const trace = makeTrace('t-1', 1000);
    await store.save(trace);

    expect(await store.get('t-1')).toEqual(trace);
    expect(await store.get('t-inexistente')).toBeNull();
  });

  it('lista os mais recentes primeiro, com contagem por status', async () => {
    const store = new TraceHistoryStore(dir);
    await store.save(makeTrace('t-velho', 1000));
    await store.save(makeTrace('t-novo', 5000, true));

    const list = await store.list();
    expect(list.map((item) => item.id)).toEqual(['t-novo', 't-velho']);
    expect(list[0]).toMatchObject({ brokenAt: 'pdv-arrival', okSteps: 1, failedSteps: 1, unknownSteps: 0, batchNumber: '48213' });
    expect(list[1].brokenAt).toBeUndefined();
  });

  it('toListItem conta os passos sem evidência', () => {
    const trace = makeTrace('t-x', 1);
    trace.steps = trace.steps.map((step) => (step.status === 'pending' ? { ...step, status: 'unknown' as const } : step));
    expect(toListItem(trace)).toMatchObject({ okSteps: 2, unknownSteps: 6 });
  });

  it('mantém só os últimos N e apaga os mais antigos ao gravar', async () => {
    const store = new TraceHistoryStore(dir, 3);
    for (let i = 1; i <= 5; i += 1) {
      await store.save(makeTrace(`t-${i}`, i * 1000));
      // mtime distinto entre arquivos: o sistema de arquivos pode arredondar
      fs.utimesSync(path.join(dir, `t-${i}.json`), new Date(i * 1000), new Date(i * 1000));
    }

    const ids = (await store.list()).map((item) => item.id).sort();
    expect(ids).toEqual(['t-3', 't-4', 't-5']);
  });

  it('remove o rastreio, recusa id inseguro e ignora arquivo corrompido na lista', async () => {
    const store = new TraceHistoryStore(dir);
    await store.save(makeTrace('t-1', 1000));
    fs.writeFileSync(path.join(dir, 't-lixo.json'), '{ nao e json');
    fs.writeFileSync(path.join(dir, 'outro.txt'), 'x');

    expect((await store.list()).map((item) => item.id)).toEqual(['t-1']);
    expect(await store.remove('t-1')).toBe(true);
    expect(await store.remove('t-1')).toBe(false);
    expect(await store.remove('../t-lixo')).toBe(false);
    expect(fs.existsSync(path.join(dir, 't-lixo.json'))).toBe(true);
  });

  it('não grava rastreio com id inseguro', async () => {
    const store = new TraceHistoryStore(dir);
    await expect(store.save(makeTrace('../fuga', 1))).rejects.toThrow('Identificador');
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});
