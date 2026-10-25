import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { IntegrationLayerConfig, IntegrationTraceResult } from '../../shared/integrationTypes';
import type { AppSettings } from '../../shared/types';
import { FAKE_CREDENTIALS, PROGRESSIVE_BATCH, startFakePdvSync, type FakePdvSync } from './integration/fakePdvSyncServer';
import { makeService } from './integrationTraceServiceTestKit';

describe('IntegrationTraceService: PDVSync (servidor falso)', () => {
  let dir: string;
  let fake: FakePdvSync;
  beforeAll(async () => {
    fake = await startFakePdvSync();
  });
  afterAll(async () => {
    await fake.close();
  });
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-pdvsync-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const flow = {
    id: 'produto',
    name: 'Produto',
    chBatchType: '12',
    evidence: { pdvQuery: 'select count(*) from produto where lote = :lote', pdvWaitSeconds: 0 }
  };
  const chLayer = (authOverrides: Partial<NonNullable<IntegrationLayerConfig['auth']>> = {}): IntegrationLayerConfig => ({
    layer: 'ch',
    pdvsync: { racUrl: fake.racUrl, tenantId: 'T1', batchStatusUrl: fake.batchStatusUrl, storeStatusUrl: fake.storeStatusUrl },
    auth: {
      type: 'rac-password',
      user: FAKE_CREDENTIALS.username,
      password: FAKE_CREDENTIALS.password,
      clientId: FAKE_CREDENTIALS.clientId,
      clientSecret: FAKE_CREDENTIALS.clientSecret,
      ...authOverrides
    }
  });
  const settings = (ch: IntegrationLayerConfig): Partial<AppSettings> => ({
    databaseConnections: [{ id: 'pg', name: 'PDV', type: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u' }],
    integrationLayers: [{ layer: 'pdv', dbConnectionId: 'pg' }, ch],
    integrationFlows: [flow]
  });
  const trace = async (ch: IntegrationLayerConfig, request: { batchNumber: string; branchId?: string }) => {
    const { service } = makeService(settings(ch), { configDir: dir, executeQuery: vi.fn(async () => ({ success: true, rows: [{ c: 0 }] })) });
    const response = await service.traceBatch({ flowId: 'produto', ...request });
    return (response as { trace: IntegrationTraceResult }).trace;
  };
  const stepOf = (t: IntegrationTraceResult, id: string) => t.steps.find((s) => s.id === id)!;

  it('prova o lote pela API do PDVSync: abertura, fechamento e a loja que baixou com erro', async () => {
    fake.requests.length = 0;
    const result = await trace(chLayer(), { batchNumber: '100' });

    expect(stepOf(result, 'open-batch')).toMatchObject({ status: 'ok', source: 'ch-api' });
    expect(stepOf(result, 'close-batch').status).toBe('ok');
    expect(stepOf(result, 'pdv-arrival')).toMatchObject({ status: 'failed', source: 'ch-api' });
    expect(stepOf(result, 'pdv-arrival').evidence).toContain('loja 2 · PROD-7: NCM inválido para o produto');
    expect(result.brokenAt).toBe('pdv-arrival');
    expect(fake.requests.map((r) => r.method)).toEqual(['POST', 'GET', 'GET']);
  });

  it('filtrando pela filial que baixou bem, a chegada fica ok', async () => {
    const result = await trace(chLayer(), { batchNumber: '100', branchId: '1' });

    expect(stepOf(result, 'pdv-arrival')).toMatchObject({ status: 'ok', source: 'ch-api' });
    expect(result.brokenAt).toBeUndefined();
    expect(fake.requests.at(-1)?.query.idRetaguardaLoja).toBe('1');
  });

  it('login recusado: observação com o motivo, passos do PDVSync sem evidência e nenhum segredo no resultado', async () => {
    const result = await trace(chLayer({ password: 'senha-errada-xyz' }), { batchNumber: '100' });

    expect(result.notes?.some((n) => n.includes('recusou o login'))).toBe(true);
    expect(stepOf(result, 'open-batch').status).toBe('unknown');
    expect(JSON.stringify(result)).not.toMatch(/senha-errada-xyz|segredo-do-cliente|token-falso-123/);
  });

  it('camada CH sem o login do PDVSync completo não consulta a API e avisa', async () => {
    fake.requests.length = 0;
    const incomplete = chLayer({ clientSecret: '' });
    const result = await trace(incomplete, { batchNumber: '100' });

    expect(fake.requests).toHaveLength(0);
    expect(result.notes?.some((n) => n.startsWith('PDVSync não consultado'))).toBe(true);
  });

  it('o pré-voo da camada CH testa o login do PDVSync: ok com credenciais certas, falha com errada', async () => {
    const good = makeService({ integrationLayers: [chLayer()] });
    const ch = (await good.service.checkReadiness()).layers[2];
    expect(ch.status).toBe('ok');
    expect(ch.checks).toEqual([expect.objectContaining({ label: 'Login PDVSync', status: 'ok', detail: expect.stringMatching(/^token obtido/) })]);

    const bad = makeService({ integrationLayers: [chLayer({ clientSecret: 'errado-abc' })] });
    const failed = (await bad.service.checkReadiness()).layers[2];
    expect(failed.status).toBe('failed');
    expect(failed.checks[0].detail).toContain('recusou o login');
    expect(JSON.stringify(failed)).not.toContain('errado-abc');
  });
});

describe('IntegrationTraceService.refreshTrace (servidor falso)', () => {
  let dir: string;
  let fake: FakePdvSync;
  beforeAll(async () => {
    fake = await startFakePdvSync();
  });
  afterAll(async () => {
    await fake.close();
  });
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-refresh-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const make = () =>
    makeService(
      {
        integrationLayers: [
          {
            layer: 'ch',
            pdvsync: { racUrl: fake.racUrl, tenantId: 'T1', batchStatusUrl: fake.batchStatusUrl, storeStatusUrl: fake.storeStatusUrl },
            auth: {
              type: 'rac-password',
              user: FAKE_CREDENTIALS.username,
              password: FAKE_CREDENTIALS.password,
              clientId: FAKE_CREDENTIALS.clientId,
              clientSecret: FAKE_CREDENTIALS.clientSecret
            }
          }
        ],
        integrationFlows: [{ id: 'produto', name: 'Produto', chBatchType: '12', evidence: { pdvQuery: '', pdvWaitSeconds: 0 } }]
      },
      { configDir: dir }
    ).service;
  const arrival = (t: IntegrationTraceResult) => t.steps.find((s) => s.id === 'pdv-arrival')?.status;

  it('acompanha o lote até as lojas terminarem, sempre no mesmo rastreio do histórico', async () => {
    const service = make();
    const first = ((await service.traceBatch({ flowId: 'produto', batchNumber: PROGRESSIVE_BATCH })) as { trace: IntegrationTraceResult }).trace;
    expect(arrival(first)).toBe('pending');
    expect(first.stores?.map((s) => s.status)).toEqual(['ok', 'pending']);

    const second = ((await service.refreshTrace(first.id)) as { trace: IntegrationTraceResult }).trace;
    expect(second.id).toBe(first.id);
    expect(arrival(second)).toBe('pending');

    const third = ((await service.refreshTrace(first.id)) as { trace: IntegrationTraceResult }).trace;
    expect(arrival(third)).toBe('ok');
    expect(third.stores?.map((s) => s.status)).toEqual(['ok', 'ok']);

    expect((await service.listTraces()).map((item) => item.id)).toEqual([first.id]);
  });

  it('rastreio que não está no histórico ou id inseguro voltam como erro legível', async () => {
    const service = make();
    expect(await service.refreshTrace('t-nao-existe')).toEqual({ success: false, error: 'Rastreio não encontrado no histórico.' });
    expect(await service.refreshTrace('../config')).toEqual({ success: false, error: 'Rastreio não encontrado no histórico.' });
  });
});
