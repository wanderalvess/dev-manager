import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { IntegrationTraceResult } from '../../shared/integrationTypes';
import type { AppSettings, TraceSummary } from '../../shared/types';
import { makeService } from './integrationTraceServiceTestKit';

describe('IntegrationTraceService.checkReadiness', () => {
  it('sem nada configurado devolve as quatro camadas na ordem, todas não configuradas', async () => {
    const { service } = makeService({});
    const result = await service.checkReadiness();

    expect(result.layers.map((l) => [l.layer, l.status])).toEqual([
      ['winthor', 'not-configured'], ['wsh', 'not-configured'], ['ch', 'not-configured'], ['pdv', 'not-configured']
    ]);
    expect(result.checkedAt).toBeGreaterThan(0);
  });

  it('confere cada camada com o serviço certo e usa a conexão salva do DB Studio', async () => {
    const { service, databaseService, networkService, httpClientService } = makeService({
      databaseConnections: [{ id: 'ora', name: 'Oracle', type: 'oracle', host: 'h', port: 1521, database: 'd', user: 'u', password: 'p' }],
      integrationLayers: [
        { layer: 'winthor', baseUrl: 'http://localhost:8181', healthPath: '/health', dbConnectionId: 'ora', auth: { type: 'winthor', user: 'admin', password: 'senha' } },
        { layer: 'ch', baseUrl: 'http://localhost:9000', healthPath: '/ping', windowsServiceName: 'CommerceHub' }
      ]
    });

    const result = await service.checkReadiness();
    const winthor = result.layers[0];
    expect(winthor.status).toBe('ok');
    expect(winthor.checks.map((c) => c.label)).toEqual(['Health HTTP', 'Login WinThor', 'Banco de dados']);
    expect(networkService.checkHttpHealth).toHaveBeenCalledWith('http://localhost:8181/health', 5000);
    expect(httpClientService.loginWinThor).toHaveBeenCalledWith({
      loginUrl: 'http://localhost:8181/winthor/autenticacao/v1/login', login: 'admin', senha: 'senha'
    });
    expect(databaseService.testConnection).toHaveBeenCalledWith(expect.objectContaining({ id: 'ora' }));
    expect(result.layers[2].checks.map((c) => c.label)).toEqual(['Health HTTP', 'Serviço CommerceHub']);
    expect(result.layers[1].status).toBe('not-configured');
  });

  it('conexão apagada das configurações vira falha da camada, sem exceção', async () => {
    const { service, databaseService } = makeService({ integrationLayers: [{ layer: 'pdv', dbConnectionId: 'sumiu' }] });
    const pdv = (await service.checkReadiness()).layers[3];

    expect(pdv.status).toBe('failed');
    expect(pdv.checks[0].detail).toContain('não encontrada');
    expect(databaseService.testConnection).not.toHaveBeenCalled();
  });

  it('uma camada com falha não impede as outras de serem verificadas', async () => {
    const { service, windowsService } = makeService({
      integrationLayers: [
        { layer: 'wsh', windowsServiceName: 'WshSvc' },
        { layer: 'pdv', processName: 'pdv.exe' }
      ]
    });
    windowsService.getServiceStatus.mockResolvedValueOnce('STOPPED' as never);

    const result = await service.checkReadiness();
    expect(result.layers[1]).toMatchObject({ layer: 'wsh', status: 'failed' });
    expect(result.layers[3]).toMatchObject({ layer: 'pdv', status: 'ok' });
  });

  it('lê o arquivo de log de verdade: existente é ok, ausente é aviso', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-readiness-'));
    try {
      const logFile = path.join(dir, 'wsh.log');
      fs.writeFileSync(logFile, 'linha\n');
      const { service } = makeService({
        integrationLayers: [
          { layer: 'wsh', logFilePath: logFile },
          { layer: 'ch', logFilePath: path.join(dir, 'ausente.log') }
        ]
      });

      const result = await service.checkReadiness();
      expect(result.layers[1].status).toBe('ok');
      expect(result.layers[2].status).toBe('warning');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('IntegrationTraceService: rastreio de lote', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-trace-service-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const flow = {
    id: 'venda',
    name: 'Venda',
    chBatchType: 'VENDA',
    winthorApiPath: '/winthor/vendas/v1/pedidos',
    evidence: { pdvQuery: 'select count(*) from venda where lote = :lote', pdvWaitSeconds: 0 }
  };
  const settings = (extra: Partial<AppSettings> = {}): Partial<AppSettings> => ({
    databaseConnections: [{ id: 'pg', name: 'PDV', type: 'postgres', host: 'h', port: 5432, database: 'd', user: 'u' }],
    integrationLayers: [{ layer: 'pdv', dbConnectionId: 'pg' }],
    integrationFlows: [flow],
    ...extra
  });
  const traceOf = (response: unknown) => (response as { trace: IntegrationTraceResult }).trace;

  it('entrada inválida e fluxo desconhecido voltam como erro legível, sem exceção nem histórico', async () => {
    const { service } = makeService(settings(), { configDir: dir });

    expect(await service.traceBatch({ flowId: 'venda', batchNumber: '' })).toEqual({ success: false, error: 'Informe o número do lote.' });
    const unknown = await service.traceBatch({ flowId: 'nao-existe', batchNumber: '1' });
    expect(unknown).toMatchObject({ success: false });
    expect((unknown as { error: string }).error).toContain('Fluxo não encontrado');
    expect(await service.listTraces()).toEqual([]);
  });

  it('fluxo desativado não pode ser rastreado e não aparece na lista de fluxos', async () => {
    const { service } = makeService(settings({ integrationFlows: [{ ...flow, enabled: false }] }), { configDir: dir });
    expect(service.listFlows()).toEqual([]);
    expect(await service.traceBatch({ flowId: 'venda', batchNumber: '1' })).toMatchObject({ success: false });
  });

  it('rastreia o lote com SQL do PDV, grava no histórico e permite reabrir e apagar', async () => {
    const { service, databaseService } = makeService(settings(), { configDir: dir });

    const response = await service.traceBatch({ flowId: 'venda', batchNumber: '48213' });
    expect(response.success).toBe(true);
    const trace = traceOf(response);
    expect(trace.steps.find((s) => s.id === 'pdv-arrival')).toMatchObject({ status: 'ok', itemCount: 3 });
    expect(databaseService.executeQuery).toHaveBeenCalledWith(expect.objectContaining({ id: 'pg' }), flow.evidence.pdvQuery, 200, { lote: '48213' });

    expect((await service.listTraces()).map((item) => item.id)).toEqual([trace.id]);
    expect(await service.getTrace(trace.id)).toMatchObject({ id: trace.id, batchNumber: '48213' });
    expect(fs.existsSync(path.join(dir, 'integration-traces', `${trace.id}.json`))).toBe(true);

    expect(await service.deleteTrace(trace.id)).toBe(true);
    expect(await service.getTrace(trace.id)).toBeNull();
    expect(await service.getTrace('../config')).toBeNull();
  });

  it('usa o APM e os logs reais: o passo 3 vem do trace e o log filtra pelo lote', async () => {
    const logFile = path.join(dir, 'wsh.log');
    fs.writeFileSync(logFile, ['10:00 INFO lote 99 aberto', '10:01 ERROR lote 48213 falhou', '10:02 INFO lote 48213 reenviado'].join('\n') + '\n');
    const apmTrace: TraceSummary = {
      traceId: 'tr-9', rootSpanName: 'GET /winthor/vendas/v1/pedidos', serviceName: 'karaf', httpMethod: 'GET',
      httpRoute: '/winthor/vendas/v1/pedidos', httpStatusCode: 200, startTimeUnixMs: Date.now() - 1000, durationMs: 700,
      spanCount: 3, hasError: false, errorCount: 0, hasDatabaseQuery: false
    };
    const { service } = makeService(
      settings({ integrationLayers: [{ layer: 'pdv', dbConnectionId: 'pg' }, { layer: 'wsh', logFilePath: logFile }] }),
      { configDir: dir, traces: [apmTrace] }
    );

    const trace = traceOf(await service.traceBatch({ flowId: 'venda', batchNumber: '48213' }));

    expect(trace.steps.find((s) => s.id === 'winthor-fetch')).toMatchObject({ status: 'ok', source: 'apm' });
    expect(trace.logExcerpts?.[0]).toMatchObject({ totalMatches: 2, errorLines: 1 });
    expect(trace.logExcerpts?.[0].lines).toEqual(['10:01 ERROR lote 48213 falhou', '10:02 INFO lote 48213 reenviado']);
    expect(trace.notes).toContain('O log do WSH tem 1 linha(s) de erro citando o lote.');
  });

  it('arquivo fora do padrão de log nunca é lido, nem que esteja configurado como log', async () => {
    const notALog = path.join(dir, 'config.json');
    fs.writeFileSync(notALog, '{ "karafPass": "lote 7" }');
    const { service } = makeService(
      settings({ integrationLayers: [{ layer: 'pdv', dbConnectionId: 'pg' }, { layer: 'ch', logFilePath: notALog }] }),
      { configDir: dir }
    );

    const trace = traceOf(await service.traceBatch({ flowId: 'venda', batchNumber: '7' }));
    expect(trace.logExcerpts).toEqual([]);
    expect(trace.notes).toContain('Log do CH não encontrado ou ilegível (config.json).');
  });

  it('falha ao gravar o histórico não perde o resultado, só avisa', async () => {
    const blocked = path.join(dir, 'ocupado');
    fs.writeFileSync(blocked, 'arquivo, não pasta');
    const { service } = makeService(settings(), { configDir: blocked });

    const response = await service.traceBatch({ flowId: 'venda', batchNumber: '5' });
    expect(response.success).toBe(true);
    expect(traceOf(response).notes?.some((n) => n.startsWith('O rastreio não pôde ser salvo no histórico'))).toBe(true);
  });
});
