import { describe, it, expect } from 'vitest';
import {
  unpackOtelAttributeValue,
  normalizeOtelAttributes,
  parseOtlpTracesPayload,
  decodeOtlpTraceBody,
  buildTraceSummary,
  buildTraceTree,
  computePercentiles,
  aggregateServiceMetrics,
  aggregateEndpointMetrics,
  aggregateSlowQueries,
  computeDatabaseTimeRatio,
  computeTraceTimeBreakdown,
  filterTraceSummaries,
  buildApmFilterQuery,
  parseApmFilterQuery,
  aggregateTimeSeriesBuckets,
  buildCompactTraceDetails,
  generateMockTraces
} from './apmUtils';
import { TraceSpan, TraceSummary } from '../../shared/types';

const makeSpan = (partial: Partial<TraceSpan>): TraceSpan => ({
  traceId: 't1',
  spanId: 's1',
  name: 'span',
  kind: 'INTERNAL',
  serviceName: 'karaf',
  startTimeUnixMs: 1000,
  endTimeUnixMs: 1100,
  durationMs: 100,
  statusCode: 'UNSET',
  attributes: {},
  ...partial
});

const makeSummary = (partial: Partial<TraceSummary>): TraceSummary => ({
  traceId: 't1',
  rootSpanName: 'GET /api',
  serviceName: 'karaf',
  startTimeUnixMs: 1000,
  durationMs: 100,
  spanCount: 1,
  hasError: false,
  errorCount: 0,
  hasDatabaseQuery: false,
  ...partial
});

// PRNG determinístico (mulberry32) para testar geração de dados simulados
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('apmUtils', () => {
  describe('unpackOtelAttributeValue & normalizeOtelAttributes', () => {
    it('desempacota valores OTel stringValue, intValue e boolValue', () => {
      expect(unpackOtelAttributeValue({ stringValue: 'test' })).toBe('test');
      expect(unpackOtelAttributeValue({ intValue: '123' })).toBe(123);
      expect(unpackOtelAttributeValue({ boolValue: true })).toBe(true);
      expect(unpackOtelAttributeValue({ doubleValue: 45.6 })).toBe(45.6);
      expect(unpackOtelAttributeValue('raw')).toBe('raw');
    });

    it('normaliza array de atributos OTel em dicionário chave-valor', () => {
      const rawAttrs = [
        { key: 'http.method', value: { stringValue: 'GET' } },
        { key: 'http.status_code', value: { intValue: 200 } },
        { key: 'is_admin', value: { boolValue: false } }
      ];
      const normalized = normalizeOtelAttributes(rawAttrs);
      expect(normalized).toEqual({
        'http.method': 'GET',
        'http.status_code': 200,
        'is_admin': false
      });
    });
  });

  describe('parseOtlpTracesPayload', () => {
    it('extrai spans de payload no formato padrão OTLP Protobuf-JSON', () => {
      const otlpPayload = {
        resourceSpans: [
          {
            resource: {
              attributes: [{ key: 'service.name', value: { stringValue: 'karaf-winthor' } }]
            },
            scopeSpans: [
              {
                spans: [
                  {
                    traceId: 'trace-1234567890abcdef',
                    spanId: 'span-root-1',
                    name: 'GET /winthor/api/v1/pedidos',
                    kind: 2, // SERVER
                    startTimeUnixNano: '1700000000000000000',
                    endTimeUnixNano: '1700000000150000000',
                    attributes: [
                      { key: 'http.method', value: { stringValue: 'GET' } },
                      { key: 'http.status_code', value: { intValue: 200 } }
                    ],
                    status: { code: 1 }
                  }
                ]
              }
            ]
          }
        ]
      };

      const spans = parseOtlpTracesPayload(otlpPayload);
      expect(spans).toHaveLength(1);
      const span = spans[0];
      expect(span.traceId).toBe('trace-1234567890abcdef');
      expect(span.spanId).toBe('span-root-1');
      expect(span.serviceName).toBe('karaf-winthor');
      expect(span.kind).toBe('SERVER');
      expect(span.httpMethod).toBe('GET');
      expect(span.httpStatusCode).toBe(200);
      expect(span.durationMs).toBe(150);
      expect(span.statusCode).toBe('OK');
    });

    it('extrai spans de payload simplificado direto em array', () => {
      const simplePayload = [
        {
          traceId: 'tr-simple-1',
          spanId: 'sp-simple-1',
          name: 'POST /api/login',
          serviceName: 'auth-service',
          durationMs: 45,
          httpStatusCode: 200
        }
      ];

      const spans = parseOtlpTracesPayload(simplePayload);
      expect(spans).toHaveLength(1);
      expect(spans[0].traceId).toBe('tr-simple-1');
      expect(spans[0].serviceName).toBe('auth-service');
      expect(spans[0].durationMs).toBe(45);
    });

    it('marca status como ERROR se httpStatusCode >= 500 mesmo se status OTel não indicar', () => {
      const payload = [
        {
          traceId: 'tr-err',
          spanId: 'sp-err',
          name: 'GET /error',
          httpStatusCode: 500,
          status: { code: 0 }
        }
      ];
      const spans = parseOtlpTracesPayload(payload);
      expect(spans[0].statusCode).toBe('ERROR');
    });
  });

  describe('buildTraceSummary & buildTraceTree', () => {
    const mockSpans: TraceSpan[] = [
      {
        traceId: 'trace-composite',
        spanId: 'span-root',
        name: 'GET /winthor/api/v1/pedidos',
        kind: 'SERVER',
        serviceName: 'karaf-winthor',
        startTimeUnixMs: 1000,
        endTimeUnixMs: 1200,
        durationMs: 200,
        statusCode: 'OK',
        httpMethod: 'GET',
        httpRoute: '/winthor/api/v1/pedidos',
        httpStatusCode: 200,
        attributes: {}
      },
      {
        traceId: 'trace-composite',
        spanId: 'span-child-cxf',
        parentSpanId: 'span-root',
        name: 'CXF Dispatcher',
        kind: 'INTERNAL',
        serviceName: 'karaf-winthor',
        startTimeUnixMs: 1010,
        endTimeUnixMs: 1030,
        durationMs: 20,
        statusCode: 'OK',
        attributes: {}
      },
      {
        traceId: 'trace-composite',
        spanId: 'span-child-db',
        parentSpanId: 'span-root',
        name: 'Oracle Query',
        kind: 'CLIENT',
        serviceName: 'karaf-winthor',
        startTimeUnixMs: 1035,
        endTimeUnixMs: 1180,
        durationMs: 145,
        statusCode: 'OK',
        dbStatement: 'SELECT * FROM PCPEDC',
        attributes: {}
      }
    ];

    it('resume o trace identificando o span raiz e agregando duração total', () => {
      const summary = buildTraceSummary('trace-composite', mockSpans);
      expect(summary.traceId).toBe('trace-composite');
      expect(summary.rootSpanName).toBe('GET /winthor/api/v1/pedidos');
      expect(summary.serviceName).toBe('karaf-winthor');
      expect(summary.spanCount).toBe(3);
      expect(summary.durationMs).toBe(200);
      expect(summary.hasDatabaseQuery).toBe(true);
      expect(summary.hasError).toBe(false);
    });

    it('monta a árvore hierárquica e calcula proporções de tempo do waterfall', () => {
      const tree = buildTraceTree(mockSpans);
      expect(tree).toHaveLength(1); // 1 raiz
      const rootNode = tree[0];
      expect(rootNode.span.spanId).toBe('span-root');
      expect(rootNode.children).toHaveLength(2);

      // Checa se o offset e largura proporcional foram calculados
      expect(rootNode.offsetPercent).toBe(0);
      expect(rootNode.widthPercent).toBe(100);

      const dbNode = rootNode.children.find((c) => c.span.spanId === 'span-child-db');
      expect(dbNode).toBeDefined();
      expect(dbNode?.offsetPercent).toBeGreaterThan(0);
      expect(dbNode?.widthPercent).toBeGreaterThan(50);
    });
  });

  describe('computePercentiles', () => {
    it('retorna 0 para array vazio', () => {
      expect(computePercentiles([])).toEqual({ p50: 0, p95: 0, p99: 0, avg: 0 });
    });

    it('calcula percentis corretamente para lista de números', () => {
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
      const res = computePercentiles(latencies);
      expect(res.p50).toBe(50);
      expect(res.p95).toBe(100);
      expect(res.avg).toBe(55);
    });
  });

  describe('aggregateServiceMetrics & aggregateEndpointMetrics', () => {
    it('agrupa e calcula estatísticas por serviço e rota', () => {
      const traces = [
        {
          traceId: '1',
          rootSpanName: 'GET /orders',
          serviceName: 'karaf',
          httpMethod: 'GET',
          httpRoute: '/orders',
          startTimeUnixMs: 1000,
          durationMs: 100,
          spanCount: 1,
          hasError: false,
          errorCount: 0,
          hasDatabaseQuery: false
        },
        {
          traceId: '2',
          rootSpanName: 'GET /orders',
          serviceName: 'karaf',
          httpMethod: 'GET',
          httpRoute: '/orders',
          startTimeUnixMs: 2000,
          durationMs: 200,
          spanCount: 1,
          hasError: true,
          errorCount: 1,
          hasDatabaseQuery: false
        },
        {
          traceId: '3',
          rootSpanName: 'POST /auth',
          serviceName: 'auth',
          httpMethod: 'POST',
          httpRoute: '/auth',
          startTimeUnixMs: 3000,
          durationMs: 50,
          spanCount: 1,
          hasError: false,
          errorCount: 0,
          hasDatabaseQuery: false
        }
      ];

      const services = aggregateServiceMetrics(traces);
      expect(services).toHaveLength(2);
      const karafService = services.find((s) => s.serviceName === 'karaf');
      expect(karafService?.requestCount).toBe(2);
      expect(karafService?.errorCount).toBe(1);
      expect(karafService?.errorRate).toBe(50);

      const endpoints = aggregateEndpointMetrics(traces);
      expect(endpoints).toHaveLength(2);
      const ordersEndpoint = endpoints.find((e) => e.route === '/orders');
      expect(ordersEndpoint?.requestCount).toBe(2);
      expect(ordersEndpoint?.errorRate).toBe(50);
    });
  });

  describe('generateMockTraces', () => {
    it('gera lote com múltiplos traces incluindo casos de sucesso, lento e erro 500', () => {
      const mockSpans = generateMockTraces();
      expect(mockSpans.length).toBeGreaterThan(5);

      const traceIds = new Set(mockSpans.map((s) => s.traceId));
      expect(traceIds.size).toBeGreaterThanOrEqual(4);

      // Deve ter pelo menos um trace com erro 500
      expect(mockSpans.some((s) => s.httpStatusCode === 500 && s.statusCode === 'ERROR')).toBe(true);
      // Deve ter pelo menos um span com query de banco
      expect(mockSpans.some((s) => !!s.dbStatement)).toBe(true);
    });

    it('usa IDs novos a cada lote, para que simular de novo some tráfego em vez de sobrescrever', () => {
      const now = 1_711_200_000_000;
      const first = new Set(generateMockTraces(now, seededRandom(1)).map((s) => s.traceId));
      const second = generateMockTraces(now, seededRandom(2)).map((s) => s.traceId);
      expect(second.some((id) => first.has(id))).toBe(false);
      expect([...first].every((id) => /^[0-9a-f]{32}$/.test(id))).toBe(true);
    });

    it('espalha o tráfego pela janela do gráfico e inclui stacktrace, 4xx e chamada externa', () => {
      const now = 1_711_200_000_000;
      const spans = generateMockTraces(now, seededRandom(42));

      expect(spans.every((s) => s.startTimeUnixMs >= now - 15 * 60_000 && s.endTimeUnixMs <= now)).toBe(true);
      const buckets = aggregateTimeSeriesBuckets(
        Array.from(new Set(spans.map((s) => s.traceId)), (id) => buildTraceSummary(id, spans.filter((s) => s.traceId === id))),
        15,
        now
      );
      expect(buckets.filter((b) => b.requestCount > 0).length).toBeGreaterThan(3);

      expect(spans.some((s) => !!s.exception?.stacktrace)).toBe(true);
      expect(spans.some((s) => s.kind === 'SERVER' && s.httpStatusCode === 404)).toBe(true);
      expect(spans.some((s) => s.kind === 'CLIENT' && !s.dbStatement && !!s.httpUrl)).toBe(true);
    });
  });

  describe('aggregateSlowQueries', () => {
    it('agrupa queries iguais, calcula tempos e ordena pelas mais lentas', () => {
      const spans: TraceSpan[] = [
        {
          traceId: 't1',
          spanId: 's1',
          name: 'Oracle Query',
          kind: 'CLIENT',
          serviceName: 'karaf',
          startTimeUnixMs: 1000,
          endTimeUnixMs: 1100,
          durationMs: 100,
          statusCode: 'OK',
          dbStatement: 'SELECT * FROM PCPRODUT WHERE CODPROD = 1',
          dbSystem: 'oracle',
          attributes: {}
        },
        {
          traceId: 't2',
          spanId: 's2',
          name: 'Oracle Query',
          kind: 'CLIENT',
          serviceName: 'karaf',
          startTimeUnixMs: 2000,
          endTimeUnixMs: 2300,
          durationMs: 300,
          statusCode: 'OK',
          dbStatement: 'SELECT * FROM PCPRODUT WHERE CODPROD = 1',
          dbSystem: 'oracle',
          attributes: {}
        },
        {
          traceId: 't3',
          spanId: 's3',
          name: 'Oracle Query',
          kind: 'CLIENT',
          serviceName: 'karaf',
          startTimeUnixMs: 3000,
          endTimeUnixMs: 3050,
          durationMs: 50,
          statusCode: 'OK',
          dbStatement: 'SELECT * FROM PCPEDC',
          dbSystem: 'oracle',
          attributes: {}
        }
      ];

      const slow = aggregateSlowQueries(spans);
      expect(slow).toHaveLength(2);
      expect(slow[0].statement).toBe('SELECT * FROM PCPRODUT WHERE CODPROD = 1');
      expect(slow[0].executionCount).toBe(2);
      expect(slow[0].totalDurationMs).toBe(400);
      expect(slow[0].avgDurationMs).toBe(200);
      expect(slow[0].maxDurationMs).toBe(300);
      expect(slow[0].dbSystem).toBe('oracle');

      expect(slow[1].statement).toBe('SELECT * FROM PCPEDC');
      expect(slow[1].executionCount).toBe(1);
    });

    it('retorna array vazio se não houver spans com dbStatement', () => {
      expect(aggregateSlowQueries([])).toEqual([]);
    });
  });

  describe('computeDatabaseTimeRatio', () => {
    it('calcula corretamente a porcentagem de tempo gasto em chamadas de banco', () => {
      const spans: TraceSpan[] = [
        {
          traceId: 't1',
          spanId: 'root',
          name: 'GET /api/pedidos',
          kind: 'SERVER',
          serviceName: 'karaf',
          startTimeUnixMs: 1000,
          endTimeUnixMs: 1500,
          durationMs: 500, // 500ms total
          statusCode: 'OK',
          attributes: {}
        },
        {
          traceId: 't1',
          spanId: 'db1',
          name: 'Oracle Query',
          kind: 'CLIENT',
          serviceName: 'karaf',
          startTimeUnixMs: 1050,
          endTimeUnixMs: 1300,
          durationMs: 250, // 250ms de banco = 50%
          statusCode: 'OK',
          dbStatement: 'SELECT * FROM PCPEDC',
          attributes: {}
        }
      ];

      const ratio = computeDatabaseTimeRatio(spans);
      expect(ratio).toBe(50);
    });

    it('retorna 0 para spans vazios', () => {
      expect(computeDatabaseTimeRatio([])).toBe(0);
    });

    it('não infla o denominador com spans SERVER aninhados de trace distribuído', () => {
      const spans = [
        makeSpan({ spanId: 'gw', kind: 'SERVER', startTimeUnixMs: 0, durationMs: 1000 }),
        makeSpan({ spanId: 'call', parentSpanId: 'gw', kind: 'CLIENT', startTimeUnixMs: 10, durationMs: 900 }),
        makeSpan({ spanId: 'karaf', parentSpanId: 'call', kind: 'SERVER', startTimeUnixMs: 20, durationMs: 800 }),
        makeSpan({ spanId: 'db', parentSpanId: 'karaf', kind: 'CLIENT', startTimeUnixMs: 30, durationMs: 500, dbStatement: 'SELECT 1' })
      ];
      // 500ms de banco em um trace de 1000ms (antes: 500 / (1000 + 800) = 27.8%)
      expect(computeDatabaseTimeRatio(spans)).toBe(50);
    });

    it('agrega por trace, sem misturar a duração de traces diferentes', () => {
      const spans = [
        makeSpan({ traceId: 'a', spanId: 'a-root', kind: 'SERVER', startTimeUnixMs: 0, durationMs: 100 }),
        makeSpan({ traceId: 'a', spanId: 'a-db', parentSpanId: 'a-root', kind: 'CLIENT', startTimeUnixMs: 0, durationMs: 100, dbStatement: 'SELECT 1' }),
        makeSpan({ traceId: 'b', spanId: 'b-root', kind: 'SERVER', startTimeUnixMs: 5000, durationMs: 300 })
      ];
      expect(computeDatabaseTimeRatio(spans)).toBe(25);
    });
  });

  describe('computeTraceTimeBreakdown', () => {
    it('conta uma única vez queries paralelas ou aninhadas', () => {
      const spans = [
        makeSpan({ spanId: 'root', kind: 'SERVER', startTimeUnixMs: 0, durationMs: 1000 }),
        makeSpan({ spanId: 'q1', kind: 'CLIENT', startTimeUnixMs: 100, durationMs: 400, dbStatement: 'SELECT A' }),
        makeSpan({ spanId: 'q2', kind: 'CLIENT', startTimeUnixMs: 300, durationMs: 400, dbStatement: 'SELECT B' })
      ];
      const breakdown = computeTraceTimeBreakdown(spans);
      expect(breakdown).toEqual({ totalMs: 1000, dbMs: 600, externalMs: 0, appMs: 400 });
    });

    it('não conta como chamada externa o banco executado dentro dela por outro serviço', () => {
      const spans = [
        makeSpan({ spanId: 'root', kind: 'SERVER', startTimeUnixMs: 0, durationMs: 1000 }),
        makeSpan({ spanId: 'http', kind: 'CLIENT', startTimeUnixMs: 100, durationMs: 600, httpMethod: 'POST' }),
        makeSpan({ spanId: 'remote-db', kind: 'CLIENT', startTimeUnixMs: 200, durationMs: 300, dbStatement: 'UPDATE X' })
      ];
      const breakdown = computeTraceTimeBreakdown(spans);
      expect(breakdown.dbMs).toBe(300);
      expect(breakdown.externalMs).toBe(300);
      expect(breakdown.appMs).toBe(400);
      expect(breakdown.dbMs + breakdown.externalMs + breakdown.appMs).toBe(breakdown.totalMs);
    });

    it('reconhece span de banco sem statement (ex.: Redis) pelo db.system em spans CLIENT', () => {
      const spans = [
        makeSpan({ spanId: 'root', kind: 'SERVER', startTimeUnixMs: 0, durationMs: 100 }),
        makeSpan({ spanId: 'redis', kind: 'CLIENT', startTimeUnixMs: 10, durationMs: 20, dbSystem: 'redis' })
      ];
      expect(computeTraceTimeBreakdown(spans).dbMs).toBe(20);
    });

    it('respeita a duração informada do trace e nunca excede o total', () => {
      const spans = [makeSpan({ spanId: 'db', kind: 'CLIENT', startTimeUnixMs: 0, durationMs: 500, dbStatement: 'SELECT 1' })];
      expect(computeTraceTimeBreakdown(spans, 200)).toEqual({ totalMs: 200, dbMs: 200, externalMs: 0, appMs: 0 });
    });
  });

  describe('decodeOtlpTraceBody', () => {
    it('lê array JSON simplificado (exemplo cURL da tela "Como Conectar")', () => {
      const body = Buffer.from('[{"traceId":"t","spanId":"s","name":"GET /ping","durationMs":42}]');
      const { format, payload } = decodeOtlpTraceBody(body, 'application/json');
      expect(format).toBe('json');
      expect(parseOtlpTracesPayload(payload)).toHaveLength(1);
    });

    it('detecta JSON com espaços iniciais ou BOM mesmo sem Content-Type', () => {
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const pretty = Buffer.concat([bom, Buffer.from(['', '  {"spans":[{"traceId":"t","spanId":"s"}]}'].join('\n'))]);
      const { format, payload } = decodeOtlpTraceBody(pretty, 'text/plain');
      expect(format).toBe('json');
      expect(parseOtlpTracesPayload(payload)).toHaveLength(1);
    });

    it('trata como protobuf um corpo binário que começa com 0x0a seguido de 0x7b', () => {
      // 0x0a = tag de resource_spans (e também '\n'); 0x7b = comprimento 123 (e também '{')
      const scopeSpans = Buffer.concat([Buffer.from([0x1a, 119]), Buffer.alloc(119, 0x61)]); // schema_url
      const resourceSpans = Buffer.concat([Buffer.from([0x12, scopeSpans.length]), scopeSpans]);
      expect(resourceSpans.length).toBe(0x7b);
      const body = Buffer.concat([Buffer.from([0x0a, resourceSpans.length]), resourceSpans]);

      const { format, payload } = decodeOtlpTraceBody(body);
      expect(format).toBe('protobuf');
      expect((payload as any).resourceSpans).toHaveLength(1);
    });

    it('respeita Content-Type protobuf e propaga erro de payload malformado', () => {
      expect(() => decodeOtlpTraceBody(Buffer.from([0x0a, 0x7f, 0x01]), 'application/x-protobuf')).toThrow();
    });
  });

  describe('conversão de span (convenções semânticas)', () => {
    it('extrai exceção do evento "exception" e usa como mensagem de erro do span', () => {
      const [span] = parseOtlpTracesPayload([
        {
          traceId: 't',
          spanId: 's',
          name: 'SELECT PCNFSAID',
          status: { code: 2 },
          events: [
            {
              name: 'exception',
              timeUnixNano: '1711200000000000000',
              attributes: [
                { key: 'exception.type', value: { stringValue: 'java.sql.SQLException' } },
                { key: 'exception.message', value: { stringValue: 'ORA-00001' } },
                { key: 'exception.stacktrace', value: { stringValue: 'java.sql.SQLException: ORA-00001\n\tat Foo.bar(Foo.java:1)' } }
              ]
            }
          ]
        }
      ]);
      expect(span.exception).toEqual({
        type: 'java.sql.SQLException',
        message: 'ORA-00001',
        stacktrace: 'java.sql.SQLException: ORA-00001\n\tat Foo.bar(Foo.java:1)'
      });
      expect(span.statusMessage).toBe('java.sql.SQLException: ORA-00001');
    });

    it('não transforma exceção tratada (span sem ERROR) em mensagem de erro', () => {
      const [span] = parseOtlpTracesPayload([
        {
          traceId: 't',
          spanId: 's',
          events: [{ name: 'exception', attributes: { 'exception.type': 'java.io.IOException' } }]
        }
      ]);
      expect(span.exception?.type).toBe('java.io.IOException');
      expect(span.statusMessage).toBeUndefined();
    });

    it('entende a convenção estável de banco (db.query.text, db.namespace, db.system.name)', () => {
      const [span] = parseOtlpTracesPayload([
        {
          traceId: 't',
          spanId: 's',
          attributes: {
            'db.system.name': 'oracle',
            'db.query.text': 'SELECT * FROM PCPEDC',
            'db.namespace': 'WINT'
          }
        }
      ]);
      expect(span.dbSystem).toBe('oracle');
      expect(span.dbStatement).toBe('SELECT * FROM PCPEDC');
      expect(span.dbName).toBe('WINT');
    });

    it('remove a query string de http.target para não explodir o agrupamento por endpoint', () => {
      const [span] = parseOtlpTracesPayload([
        { traceId: 't', spanId: 's', attributes: { 'http.target': '/winthor/api/v1/pedidos?page=2&size=50' } }
      ]);
      expect(span.httpRoute).toBe('/winthor/api/v1/pedidos');
    });

    it('calcula o fim do span a partir de durationMs no formato simplificado', () => {
      const [span] = parseOtlpTracesPayload([{ traceId: 't', spanId: 's', startTimeUnixMs: 1711200000000, durationMs: 42 }]);
      expect(span.endTimeUnixMs - span.startTimeUnixMs).toBe(42);
      expect(buildTraceTree([span])[0].widthPercent).toBe(100);
    });

    it('registra o escopo de instrumentação do OTLP como atributo', () => {
      const [span] = parseOtlpTracesPayload({
        resourceSpans: [{ scopeSpans: [{ scope: { name: 'io.opentelemetry.jdbc' }, spans: [{ traceId: 't', spanId: 's' }] }] }]
      });
      expect(span.attributes['otel.scope.name']).toBe('io.opentelemetry.jdbc');
    });

    it('ignora atributo com chave __proto__ sem alterar o protótipo do objeto', () => {
      const attrs = normalizeOtelAttributes([
        { key: '__proto__', value: { kvlistValue: { values: [{ key: 'polluted', value: { boolValue: true } }] } } },
        { key: 'ok', value: { stringValue: 'sim' } }
      ]);
      expect(attrs).toEqual({ ok: 'sim' });
      expect((attrs as any).polluted).toBeUndefined();
    });
  });

  describe('buildTraceSummary (escolha do span raiz)', () => {
    it('prefere o span sem pai, mesmo que tenha chegado depois dos filhos', () => {
      const spans = [
        makeSpan({ spanId: 'db', parentSpanId: 'root', name: 'SELECT PCPEDC', startTimeUnixMs: 1010, durationMs: 50 }),
        makeSpan({ spanId: 'orphan', parentSpanId: 'missing', name: 'orphan', startTimeUnixMs: 1005, durationMs: 5 }),
        makeSpan({ spanId: 'root', name: 'GET /pedidos', kind: 'SERVER', startTimeUnixMs: 1000, durationMs: 100 })
      ];
      expect(buildTraceSummary('t1', spans).rootSpanName).toBe('GET /pedidos');
    });

    it('sem raiz recebida ainda, usa o órfão mais antigo', () => {
      const spans = [
        makeSpan({ spanId: 'late', parentSpanId: 'root', name: 'late', startTimeUnixMs: 1050 }),
        makeSpan({ spanId: 'early', parentSpanId: 'root', name: 'early', startTimeUnixMs: 1010 })
      ];
      expect(buildTraceSummary('t1', spans).rootSpanName).toBe('early');
    });
  });

  describe('buildApmFilterQuery / parseApmFilterQuery', () => {
    it('faz ida e volta de todos os campos do filtro pela query string', () => {
      const filter = {
        serviceName: 'karaf winthor',
        search: '/pedidos?x=1&y=2',
        hasError: false,
        hasDatabaseQuery: true,
        minDurationMs: 250,
        maxDurationMs: 1500.5,
        limit: 20,
        startTimeMs: 1_711_200_000_000,
        endTimeMs: 1_711_200_900_000
      };
      const query = buildApmFilterQuery(filter);
      expect(query.startsWith('?')).toBe(true);
      expect(parseApmFilterQuery(new URLSearchParams(query.slice(1)))).toEqual(filter);
    });

    it('gera query vazia sem filtro e ignora valores malformados ao ler', () => {
      expect(buildApmFilterQuery()).toBe('');
      expect(buildApmFilterQuery({})).toBe('');
      expect(parseApmFilterQuery(new URLSearchParams('limit=abc&hasError=sim&minDurationMs=&serviceName='))).toEqual({});
    });
  });

  describe('filterTraceSummaries', () => {
    const traces = [
      makeSummary({ traceId: 'old', startTimeUnixMs: 1_000, serviceName: 'karaf' }),
      makeSummary({ traceId: 'new', startTimeUnixMs: 9_000, serviceName: 'Karaf' }),
      makeSummary({ traceId: 'other', startTimeUnixMs: 9_500, serviceName: 'gateway' })
    ];

    it('aplica janela de tempo e serviço sem diferenciar maiúsculas', () => {
      const res = filterTraceSummaries(traces, { serviceName: 'KARAF', startTimeMs: 5_000 });
      expect(res.map((t) => t.traceId)).toEqual(['new']);
    });

    it('sem filtro devolve uma cópia (quem ordena não altera a origem)', () => {
      const res = filterTraceSummaries(traces);
      expect(res).toEqual(traces);
      expect(res).not.toBe(traces);
    });
  });

  describe('aggregateEndpointMetrics (nomes com separadores)', () => {
    it('não corrompe rotas ou nomes de span que contêm "::"', () => {
      const endpoints = aggregateEndpointMetrics([
        makeSummary({ traceId: '1', rootSpanName: 'PedidoService::listar', httpMethod: undefined, httpRoute: undefined })
      ]);
      expect(endpoints[0].route).toBe('PedidoService::listar');
      expect(endpoints[0].method).toBe('HTTP');
    });
  });

  describe('buildCompactTraceDetails', () => {
    it('lista spans na ordem do waterfall com profundidade e trunca textos longos', () => {
      const spans = [
        makeSpan({ spanId: 'db', parentSpanId: 'root', kind: 'CLIENT', startTimeUnixMs: 1010, durationMs: 50, dbStatement: 'X'.repeat(50) }),
        makeSpan({ spanId: 'root', kind: 'SERVER', startTimeUnixMs: 1000, durationMs: 100, attributes: { big: 'y'.repeat(400) } })
      ];
      const summary = buildTraceSummary('t1', spans);
      const compact = buildCompactTraceDetails(
        { summary, spans, rootTree: buildTraceTree(spans), breakdown: computeTraceTimeBreakdown(spans, summary.durationMs) },
        20
      );

      expect(compact.spans.map((s) => [s.spanId, s.depth, s.offsetMs])).toEqual([
        ['root', 0, 0],
        ['db', 1, 10]
      ]);
      expect(compact.spans[1].db?.statement).toContain('(+30 caracteres)');
      expect(String(compact.spans[0].attributes.big)).toContain('(+100 caracteres)');
      expect(compact.breakdown.dbMs).toBe(50);
    });
  });

  describe('aggregateTimeSeriesBuckets', () => {
    it('divide traces em fatias de 1 minuto com contagem e percentis', () => {
      const now = 1711200000000;
      const traces = [
        {
          traceId: 't1',
          rootSpanName: 'GET /items',
          serviceName: 'karaf',
          startTimeUnixMs: now - 120_000, // 2 minutos atrás
          durationMs: 40,
          spanCount: 1,
          hasError: false,
          errorCount: 0,
          httpStatusCode: 200,
          hasDatabaseQuery: false
        },
        {
          traceId: 't2',
          rootSpanName: 'GET /items',
          serviceName: 'karaf',
          startTimeUnixMs: now - 110_000, // 2 minutos atrás
          durationMs: 60,
          spanCount: 1,
          hasError: true,
          errorCount: 1,
          httpStatusCode: 500,
          hasDatabaseQuery: false
        }
      ];

      const buckets = aggregateTimeSeriesBuckets(traces, 5, now);
      expect(buckets).toHaveLength(5);
      // O bucket do minuto 2 atrás deve conter as 2 requisições
      const bucket2MinAgo = buckets[3]; // índice 3 de [0..4] (4 é agora, 3 é 1-2m atrás)
      expect(bucket2MinAgo.requestCount).toBe(2);
      expect(bucket2MinAgo.successCount).toBe(1);
      expect(bucket2MinAgo.serverErrorCount).toBe(1);
      expect(bucket2MinAgo.avgDurationMs).toBe(50);
    });
  });
});
