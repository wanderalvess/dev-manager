import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'http';
import net from 'net';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';
import {
  ApmService,
  ApmIngestError,
  MAX_OTLP_BODY_BYTES,
  APM_QUERY_PATH_PREFIX,
  APM_QUERY_TOKEN_HEADER
} from './ApmService';
import { AppSettings, TraceSpan } from '../../shared/types';

function requestJson(
  port: number,
  pathName: string,
  headers: Record<string, string> = {},
  method = 'GET'
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: pathName, method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let body: any = text;
        try {
          body = JSON.parse(text);
        } catch {
          // corpo não-JSON fica como texto
        }
        resolve({ statusCode: res.statusCode || 0, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function listenOnFreePort(): Promise<net.Server> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  return server;
}

async function findFreePort(): Promise<number> {
  const probe = await listenOnFreePort();
  const port = (probe.address() as net.AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return port;
}

const makeSpan = (partial: Partial<TraceSpan>): TraceSpan => {
  const base: TraceSpan = {
    traceId: 't1',
    spanId: 's1',
    name: 'GET /api',
    kind: 'SERVER',
    serviceName: 'karaf',
    startTimeUnixMs: 1000,
    endTimeUnixMs: 0,
    durationMs: 100,
    statusCode: 'UNSET',
    attributes: {},
    ...partial
  };
  return { ...base, endTimeUnixMs: partial.endTimeUnixMs ?? base.startTimeUnixMs + base.durationMs };
};

function postToReceiver(
  port: number,
  body: Buffer | string,
  headers: Record<string, string | number>
): Promise<{ statusCode: number; contentType?: string; body: string }> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const req = http.request({ hostname: '127.0.0.1', port, path: '/v1/traces', method: 'POST', headers }, (res) => {
      const chunks: Buffer[] = [];
      const finish = () => {
        if (settled) return;
        settled = true;
        resolve({ statusCode: res.statusCode || 0, contentType: res.headers['content-type'], body: Buffer.concat(chunks).toString() });
      };
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', finish);
      res.on('close', finish);
    });
    req.on('error', (err) => {
      if (!settled) reject(err);
    });
    req.end(body);
  });
}

describe('ApmService', () => {
  let apmService: ApmService;

  beforeEach(() => {
    apmService = new ApmService(100);
  });

  it('inicializa vazio e com status correto', () => {
    const overview = apmService.getOverview();
    expect(overview.totalTraces).toBe(0);
    expect(overview.totalSpans).toBe(0);
    expect(overview.services).toEqual([]);
    expect(overview.slowQueries).toEqual([]);
    expect(overview.timeSeries).toHaveLength(15);
    expect(overview.dbTimePercentage).toBe(0);
    expect(overview.receiverStatus.bufferSize).toBe(0);
  });

  it('ingere spans e atualiza o resumo do trace', () => {
    const spans: TraceSpan[] = [
      {
        traceId: 'trace-1',
        spanId: 'span-1',
        name: 'GET /api/v1/status',
        kind: 'SERVER',
        serviceName: 'karaf-app',
        startTimeUnixMs: 1000,
        endTimeUnixMs: 1050,
        durationMs: 50,
        statusCode: 'OK',
        httpMethod: 'GET',
        httpRoute: '/api/v1/status',
        httpStatusCode: 200,
        attributes: {}
      }
    ];

    const res = apmService.ingestSpans(spans);
    expect(res.ingestedSpans).toBe(1);
    expect(res.updatedTraces).toBe(1);

    const traces = apmService.getTraces();
    expect(traces).toHaveLength(1);
    expect(traces[0].traceId).toBe('trace-1');
    expect(traces[0].serviceName).toBe('karaf-app');
    expect(traces[0].durationMs).toBe(50);
    expect(traces[0].hasError).toBe(false);
  });

  it('dispara callback onNewTrace quando novos dados chegam', () => {
    let capturedSummary: any = null;
    apmService.onNewTrace = (summary) => {
      capturedSummary = summary;
    };

    apmService.ingestSpans([
      {
        traceId: 'trace-live',
        spanId: 'span-live',
        name: 'POST /orders',
        kind: 'SERVER',
        serviceName: 'order-service',
        startTimeUnixMs: 2000,
        endTimeUnixMs: 2150,
        durationMs: 150,
        statusCode: 'OK',
        attributes: {}
      }
    ]);

    expect(capturedSummary).not.toBeNull();
    expect(capturedSummary?.traceId).toBe('trace-live');
    expect(capturedSummary?.serviceName).toBe('order-service');
  });

  it('aplica filtros de busca, erro e duração em getTraces', () => {
    apmService.ingestSpans([
      {
        traceId: 'tr-ok',
        spanId: 'sp-ok',
        name: 'GET /health',
        kind: 'SERVER',
        serviceName: 'gateway',
        startTimeUnixMs: 1000,
        endTimeUnixMs: 1020,
        durationMs: 20,
        statusCode: 'OK',
        attributes: {}
      },
      {
        traceId: 'tr-err',
        spanId: 'sp-err',
        name: 'POST /checkout',
        kind: 'SERVER',
        serviceName: 'karaf-winthor',
        startTimeUnixMs: 2000,
        endTimeUnixMs: 2600,
        durationMs: 600,
        statusCode: 'ERROR',
        httpStatusCode: 500,
        attributes: {}
      }
    ]);

    // Filtro apenas erros
    const errorsOnly = apmService.getTraces({ hasError: true });
    expect(errorsOnly).toHaveLength(1);
    expect(errorsOnly[0].traceId).toBe('tr-err');

    // Filtro por serviço
    const karafOnly = apmService.getTraces({ serviceName: 'karaf-winthor' });
    expect(karafOnly).toHaveLength(1);
    expect(karafOnly[0].serviceName).toBe('karaf-winthor');

    // Filtro por texto de busca
    const searchRes = apmService.getTraces({ search: 'checkout' });
    expect(searchRes).toHaveLength(1);
    expect(searchRes[0].traceId).toBe('tr-err');

    // Filtro por duração mínima
    const slowOnly = apmService.getTraces({ minDurationMs: 500 });
    expect(slowOnly).toHaveLength(1);
    expect(slowOnly[0].traceId).toBe('tr-err');
  });

  it('retorna os detalhes completos do trace com árvore para waterfall', () => {
    apmService.ingestSpans([
      {
        traceId: 'tr-tree',
        spanId: 'root',
        name: 'GET /produtos',
        kind: 'SERVER',
        serviceName: 'winthor-api',
        startTimeUnixMs: 1000,
        endTimeUnixMs: 1200,
        durationMs: 200,
        statusCode: 'OK',
        attributes: {}
      },
      {
        traceId: 'tr-tree',
        spanId: 'db',
        parentSpanId: 'root',
        name: 'Oracle Query',
        kind: 'CLIENT',
        serviceName: 'winthor-api',
        startTimeUnixMs: 1020,
        endTimeUnixMs: 1180,
        durationMs: 160,
        statusCode: 'OK',
        dbStatement: 'SELECT * FROM PCPRODUT',
        attributes: {}
      }
    ]);

    const details = apmService.getTraceDetails('tr-tree');
    expect(details).not.toBeNull();
    expect(details?.summary.traceId).toBe('tr-tree');
    expect(details?.spans).toHaveLength(2);
    expect(details?.rootTree).toHaveLength(1);
    expect(details?.rootTree[0].children).toHaveLength(1);
    expect(details?.rootTree[0].children[0].span.dbStatement).toBe('SELECT * FROM PCPRODUT');
    expect(details?.breakdown).toEqual({ totalMs: 200, dbMs: 160, externalMs: 0, appMs: 40, httpMs: 20, javaMs: 20, jdbcMs: 160 });
  });

  it('aplica o filtro de serviço a todas as métricas do overview, não só às latências', () => {
    const now = Date.now();
    apmService.ingestSpans([
      makeSpan({ traceId: 'k', spanId: 'root', serviceName: 'karaf', startTimeUnixMs: now - 1000, durationMs: 100 }),
      makeSpan({
        traceId: 'k',
        spanId: 'db',
        parentSpanId: 'root',
        kind: 'CLIENT',
        serviceName: 'karaf',
        startTimeUnixMs: now - 990,
        durationMs: 50,
        dbStatement: 'SELECT 1'
      }),
      makeSpan({ traceId: 'g', spanId: 'root', serviceName: 'gateway', startTimeUnixMs: now - 500, durationMs: 10, statusCode: 'ERROR' })
    ]);

    const overview = apmService.getOverview({ serviceName: 'gateway' });
    expect(overview.totalTraces).toBe(1);
    expect(overview.totalSpans).toBe(1);
    expect(overview.errorRate).toBe(100);
    expect(overview.slowQueries).toEqual([]);
    expect(overview.dbTimePercentage).toBe(0);
    expect(overview.timeSeries.reduce((acc, b) => acc + b.requestCount, 0)).toBe(1);
    // O status do receptor continua descrevendo o buffer inteiro
    expect(overview.receiverStatus.bufferSize).toBe(2);

    expect(apmService.getOverview().dbTimePercentage).toBeGreaterThan(0);
  });

  it('filtra traces por janela de tempo', () => {
    apmService.ingestSpans([
      makeSpan({ traceId: 'old', startTimeUnixMs: 1000 }),
      makeSpan({ traceId: 'new', startTimeUnixMs: 5000 })
    ]);
    expect(apmService.getTraces({ startTimeMs: 2000 }).map((t) => t.traceId)).toEqual(['new']);
    expect(apmService.getTraces({ endTimeMs: 2000 }).map((t) => t.traceId)).toEqual(['old']);
  });

  it('despeja o trace menos recentemente atualizado ao exceder o limite (LRU)', () => {
    const service = new ApmService(500);
    for (let i = 0; i < 500; i++) {
      service.ingestSpans([makeSpan({ traceId: `t${i}`, spanId: 'root', startTimeUnixMs: 1000 + i })]);
    }
    // t0 é o mais antigo, mas acabou de receber um span atrasado: continua ativo
    service.ingestSpans([makeSpan({ traceId: 't0', spanId: 'late', parentSpanId: 'root' })]);
    service.ingestSpans([makeSpan({ traceId: 't500', spanId: 'root' })]);

    expect(service.getReceiverStatus().bufferSize).toBe(500);
    expect(service.getTraceDetails('t0')?.spans).toHaveLength(2);
    expect(service.getTraceDetails('t1')).toBeNull();
    expect(service.getTraceDetails('t500')).not.toBeNull();
  });

  it('descarta spans acima do limite por trace e contabiliza no status do receptor', () => {
    const service = new ApmService(500, { maxSpansPerTrace: 3 });
    const res = service.ingestSpans([1, 2, 3, 4, 5].map((i) => makeSpan({ spanId: `s${i}` })));

    expect(res.ingestedSpans).toBe(3);
    expect(service.getTraceDetails('t1')?.spans).toHaveLength(3);
    expect(service.getReceiverStatus().droppedSpans).toBe(2);

    // Re-emissão de um span já guardado continua permitida
    expect(service.ingestSpans([makeSpan({ spanId: 's1', durationMs: 999 })]).ingestedSpans).toBe(1);
    expect(service.getReceiverStatus().droppedSpans).toBe(2);
  });

  it('respeita o teto global de spans despejando os traces mais antigos', () => {
    const service = new ApmService(500, { maxSpans: 10 });
    for (let i = 0; i < 5; i++) {
      service.ingestSpans(['a', 'b', 'c'].map((spanId) => makeSpan({ traceId: `t${i}`, spanId })));
    }

    expect(service.getOverview().totalSpans).toBeLessThanOrEqual(10);
    expect(service.getTraceDetails('t0')).toBeNull();
    expect(service.getTraceDetails('t4')).not.toBeNull();
  });

  it('rejeita payload comprimido que estoura o limite ao descomprimir (zip bomb)', async () => {
    const bomb = zlib.gzipSync(Buffer.alloc(MAX_OTLP_BODY_BYTES + 1024, 0x20));
    expect(bomb.length).toBeLessThan(100 * 1024);

    const err = await apmService.ingestOtlpBody(bomb, 'application/json', 'gzip').catch((e) => e);
    expect(err).toBeInstanceOf(ApmIngestError);
    expect(err.statusCode).toBe(413);
  });

  describe('receptor HTTP (porta dinâmica)', () => {
    let service: ApmService;
    let port: number;

    beforeEach(async () => {
      service = new ApmService();
      expect(await service.startReceiver(0)).toBe(true);
      port = service.getReceiverStatus().port;
    });

    afterEach(async () => {
      await service.stopReceiver();
    });

    it('reporta a porta real escolhida pelo SO', () => {
      expect(port).toBeGreaterThan(0);
      expect(service.getReceiverStatus().listening).toBe(true);
    });

    it('ingere o array JSON simplificado do exemplo cURL do app (antes era tratado como protobuf)', async () => {
      const body = JSON.stringify([
        { traceId: 'trace-manual-01', spanId: 'span-manual-01', name: 'GET /api/v1/ping', serviceName: 'meu-servico', durationMs: 42 }
      ]);
      const res = await postToReceiver(port, body, { 'Content-Type': 'application/json' });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toMatchObject({ status: 'success', ingestedSpans: 1 });
      expect(service.getTraces().map((t) => t.traceId)).toEqual(['trace-manual-01']);
    });

    it('ingere JSON OTLP comprimido com gzip', async () => {
      const payload = {
        resourceSpans: [
          {
            resource: { attributes: [{ key: 'service.name', value: { stringValue: 'karaf-winthor' } }] },
            scopeSpans: [{ spans: [{ traceId: 'gz-trace', spanId: 'gz-span', name: 'GET /gz', kind: 2 }] }]
          }
        ]
      };
      const res = await postToReceiver(port, zlib.gzipSync(JSON.stringify(payload)), {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip'
      });

      expect(res.statusCode).toBe(200);
      expect(service.getTraces()[0]).toMatchObject({ traceId: 'gz-trace', serviceName: 'karaf-winthor' });
    });

    it('responde 400 para protobuf malformado', async () => {
      const res = await postToReceiver(port, Buffer.from([0x0a, 0x7f, 0x01]), { 'Content-Type': 'application/x-protobuf' });
      expect(res.statusCode).toBe(400);
      expect(service.getTraces()).toHaveLength(0);
    });

    it('responde 413 (não-retentável) quando o corpo declarado excede o limite', async () => {
      const res = await postToReceiver(port, Buffer.from('{}'), {
        'Content-Type': 'application/json',
        'Content-Length': MAX_OTLP_BODY_BYTES + 1
      });
      expect(res.statusCode).toBe(413);
    });

    it('responde 415 para Content-Encoding não suportado', async () => {
      const res = await postToReceiver(port, Buffer.from('{}'), { 'Content-Type': 'application/json', 'Content-Encoding': 'br' });
      expect(res.statusCode).toBe(415);
    });
  });

  it('respeita o limite do buffer descartando o trace mais antigo', () => {
    const tinyService = new ApmService(2); // Máximo 500 pelo Math.max(500, maxTraces)
    // Vamos testar o eviction direto populando com mais traces se construído sem limitação ou verificando
    expect(tinyService.getReceiverStatus().maxBufferSize).toBe(500);
  });

  it('gera dados simulados de demonstração e limpa buffer com clear', () => {
    const demo = apmService.generateDemoData();
    expect(demo.generatedTraces).toBeGreaterThan(0);
    expect(demo.generatedSpans).toBeGreaterThan(0);

    const overview = apmService.getOverview();
    expect(overview.totalTraces).toBeGreaterThan(0);
    expect(overview.services.length).toBeGreaterThan(0);

    apmService.clear();
    expect(apmService.getOverview().totalTraces).toBe(0);
  });

  it('recebe e processa requisição OTLP com payload Protobuf via HTTP POST /v1/traces', async () => {
    const port = 4329;
    const started = await apmService.startReceiver(port);
    expect(started).toBe(true);

    try {
      // Cria buffer protobuf simples
      const traceIdRaw = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
      const spanIdRaw = Buffer.from('1122334455667788', 'hex');
      const spanBuf = Buffer.concat([
        Buffer.from([0x0a, 16]),
        traceIdRaw,
        Buffer.from([0x12, 8]),
        spanIdRaw,
        Buffer.from([0x2a, 10]),
        Buffer.from('GET /test1', 'utf-8')
      ]);
      const scopeSpansBuf = Buffer.concat([
        Buffer.from([0x12, spanBuf.length]),
        spanBuf
      ]);
      const resourceSpansBuf = Buffer.concat([
        Buffer.from([0x12, scopeSpansBuf.length]),
        scopeSpansBuf
      ]);
      const exportReqBuf = Buffer.concat([
        Buffer.from([0x0a, resourceSpansBuf.length]),
        resourceSpansBuf
      ]);

      const res = await new Promise<{ statusCode: number; contentType: string }>((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: '/v1/traces',
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-protobuf',
              'Content-Length': exportReqBuf.length
            }
          },
          (response: any) => {
            resolve({
              statusCode: response.statusCode,
              contentType: response.headers['content-type']
            });
          }
        );
        req.on('error', reject);
        req.write(exportReqBuf);
        req.end();
      });

      expect(res.statusCode).toBe(200);
      expect(res.contentType).toBe('application/x-protobuf');

      const traces = apmService.getTraces();
      expect(traces).toHaveLength(1);
      expect(traces[0].traceId).toBe('00112233445566778899aabbccddeeff');
    } finally {
      await apmService.stopReceiver();
    }
  });

  describe('API de consulta para outros processos (ex.: servidor MCP)', () => {
    let tmpDir: string;
    let handleFile: string;
    let service: ApmService;
    let port: number;
    let token: string;

    beforeEach(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-query-'));
      handleFile = path.join(tmpDir, '.apm-receiver.json');
      service = new ApmService(500, { queryHandleFile: handleFile });
      expect(await service.startReceiver(0)).toBe(true);
      ({ port, token } = JSON.parse(fs.readFileSync(handleFile, 'utf-8')));
      service.ingestSpans([
        makeSpan({ traceId: 'q1', spanId: 'root', serviceName: 'karaf', statusCode: 'ERROR', startTimeUnixMs: Date.now() - 1000 })
      ]);
    });

    afterEach(async () => {
      await service.stopReceiver();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('publica a porta real e um token aleatório no arquivo de acesso', () => {
      expect(port).toBe(service.getReceiverStatus().port);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('responde overview, traces, detalhes, serviços e status com o token', async () => {
      const auth = { [APM_QUERY_TOKEN_HEADER]: token };

      const overview = await requestJson(port, `${APM_QUERY_PATH_PREFIX}overview?serviceName=karaf`, auth);
      expect(overview.statusCode).toBe(200);
      expect(overview.body.totalTraces).toBe(1);

      const traces = await requestJson(port, `${APM_QUERY_PATH_PREFIX}traces?hasError=true`, auth);
      expect(traces.body.map((t: any) => t.traceId)).toEqual(['q1']);

      expect((await requestJson(port, `${APM_QUERY_PATH_PREFIX}traces/q1`, auth)).body.summary.traceId).toBe('q1');
      expect((await requestJson(port, `${APM_QUERY_PATH_PREFIX}traces/nao-existe`, auth)).statusCode).toBe(404);
      expect((await requestJson(port, `${APM_QUERY_PATH_PREFIX}services`, auth)).body[0].serviceName).toBe('karaf');
      expect((await requestJson(port, `${APM_QUERY_PATH_PREFIX}status`, auth)).body.bufferSize).toBe(1);
    });

    it('exige o token e não envia cabeçalhos CORS, para que páginas web não leiam os dados', async () => {
      const noToken = await requestJson(port, `${APM_QUERY_PATH_PREFIX}overview`);
      const wrongToken = await requestJson(port, `${APM_QUERY_PATH_PREFIX}overview`, { [APM_QUERY_TOKEN_HEADER]: 'f'.repeat(64) });
      const preflight = await requestJson(
        port,
        `${APM_QUERY_PATH_PREFIX}overview`,
        { Origin: 'https://site-malicioso.example', 'Access-Control-Request-Method': 'GET' },
        'OPTIONS'
      );

      expect(noToken.statusCode).toBe(401);
      expect(wrongToken.statusCode).toBe(401);
      expect(preflight.statusCode).toBe(405);
      for (const res of [noToken, wrongToken, preflight]) {
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      }

      // O restante do receptor segue com CORS para exportadores OTel rodando no navegador
      expect((await requestJson(port, '/health')).headers['access-control-allow-origin']).toBe('*');
    });

    it('rejeita ID de trace com escape malformado', async () => {
      const res = await requestJson(port, `${APM_QUERY_PATH_PREFIX}traces/%E0%A4%A`, { [APM_QUERY_TOKEN_HEADER]: token });
      expect(res.statusCode).toBe(400);
    });

    it('remove o arquivo de acesso ao parar o receptor', async () => {
      await service.stopReceiver();
      expect(fs.existsSync(handleFile)).toBe(false);
    });

    it('preserva o arquivo de acesso publicado depois por outro processo', async () => {
      fs.writeFileSync(handleFile, JSON.stringify({ port: 1, token: 'outro-processo' }));
      await service.stopReceiver();
      expect(JSON.parse(fs.readFileSync(handleFile, 'utf-8')).token).toBe('outro-processo');
    });
  });

  describe('porta configurável do receptor', () => {
    let tmpDir: string;
    let handleFile: string;
    let savedSettings: Array<Partial<AppSettings>>;
    let service: ApmService;

    const makeConfigService = (apmReceiverPort?: number) => ({
      getSettings: () => ({ apmReceiverPort }) as AppSettings,
      saveSettings: (settings: Partial<AppSettings>) => {
        savedSettings.push(settings);
        return settings as AppSettings;
      }
    });

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-port-'));
      handleFile = path.join(tmpDir, '.apm-receiver.json');
      savedSettings = [];
      service = new ApmService(500, { queryHandleFile: handleFile, configService: makeConfigService() });
    });

    afterEach(async () => {
      await service.stopReceiver();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('abre na porta das configurações quando nenhuma é informada', async () => {
      const configuredPort = await findFreePort();
      const configured = new ApmService(500, { configService: makeConfigService(configuredPort) });
      try {
        expect(await configured.startReceiver()).toBe(true);
        expect(configured.getReceiverStatus().port).toBe(configuredPort);
      } finally {
        await configured.stopReceiver();
      }
    });

    it('troca para uma porta livre, grava a escolha e republica o acesso', async () => {
      await service.startReceiver(0);
      const target = await findFreePort();

      const result = await service.changeReceiverPort(target);

      expect(result).toMatchObject({ success: true, status: { listening: true, port: target } });
      expect(savedSettings).toEqual([{ apmReceiverPort: target }]);
      expect(JSON.parse(fs.readFileSync(handleFile, 'utf-8')).port).toBe(target);
    });

    it('mantém o receptor na porta atual quando a nova está ocupada', async () => {
      await service.startReceiver(0);
      const currentPort = service.getReceiverStatus().port;
      const blocker = await listenOnFreePort();
      const busyPort = (blocker.address() as net.AddressInfo).port;

      try {
        const result = await service.changeReceiverPort(busyPort);
        expect(result.success).toBe(false);
        expect(result.error).toContain('já em uso');
        expect(result.status).toMatchObject({ listening: true, port: currentPort });
        expect(savedSettings).toEqual([]);
        expect((await requestJson(currentPort, '/health')).statusCode).toBe(200);
      } finally {
        await new Promise<void>((resolve) => blocker.close(() => resolve()));
      }
    });

    it('com o receptor inativo, registra a falha da nova porta no status', async () => {
      const blocker = await listenOnFreePort();
      const busyPort = (blocker.address() as net.AddressInfo).port;
      try {
        const result = await service.changeReceiverPort(busyPort);
        expect(result.success).toBe(false);
        expect(result.status).toMatchObject({ listening: false, port: busyPort, error: `Porta ${busyPort} já em uso` });
      } finally {
        await new Promise<void>((resolve) => blocker.close(() => resolve()));
      }
    });

    it('recusa porta fora da faixa permitida sem mexer no receptor', async () => {
      await service.startReceiver(0);
      const saveSpy = vi.fn();
      const result = await new ApmService(500, { configService: { getSettings: () => ({}) as AppSettings, saveSettings: saveSpy } }).changeReceiverPort(80);

      expect(result.success).toBe(false);
      expect(result.error).toContain('1024');
      expect(saveSpy).not.toHaveBeenCalled();
      expect((await service.changeReceiverPort(70000)).status.listening).toBe(true);
    });
  });
});
