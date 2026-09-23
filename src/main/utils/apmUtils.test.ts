import { describe, it, expect } from 'vitest';
import {
  unpackOtelAttributeValue,
  normalizeOtelAttributes,
  parseOtlpTracesPayload,
  buildTraceSummary,
  buildTraceTree,
  computePercentiles,
  aggregateServiceMetrics,
  aggregateEndpointMetrics,
  aggregateSlowQueries,
  computeDatabaseTimeRatio,
  aggregateTimeSeriesBuckets,
  generateMockTraces
} from './apmUtils';
import { TraceSpan } from '../../shared/types';

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
