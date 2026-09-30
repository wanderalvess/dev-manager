import { describe, it, expect } from 'vitest';
import {
  buildApmSetupSnippets,
  categorizeSpan,
  computeLatencySpectrum,
  computeTimeBudget,
  detectSlowSummary,
  filterTraces,
  findNextTraceId,
  formatSpanErrorForClipboard,
  getMethodBadgeClass,
  getStatusBadgeClass,
  mergeLiveTraces,
  splitSqlTokens
} from './apmUiUtils';
import { TraceSummary, TraceDetails, TraceSpan } from '../../../shared/types';

describe('apmUiUtils', () => {
  const makeTrace = (partial: Partial<TraceSummary>): TraceSummary => ({
    traceId: 'tr-01',
    rootSpanName: 'GET /api/v1/pedidos',
    serviceName: 'karaf-winthor',
    startTimeUnixMs: Date.now(),
    durationMs: 50,
    spanCount: 3,
    hasError: false,
    errorCount: 0,
    hasDatabaseQuery: false,
    ...partial
  });

  const makeSpan = (partial: Partial<TraceSpan>): TraceSpan => ({
    traceId: 'tr-01',
    spanId: 's1',
    name: 'GET /api',
    kind: 'SERVER',
    serviceName: 'karaf',
    startTimeUnixMs: 1000,
    endTimeUnixMs: 1100,
    durationMs: 100,
    statusCode: 'OK',
    attributes: {},
    ...partial
  });

  describe('computeLatencySpectrum', () => {
    it('categoriza corretamente faixas de latência (<100, 100-400, 400-1000, >1000)', () => {
      const traces: TraceSummary[] = [
        makeTrace({ durationMs: 45 }),
        makeTrace({ durationMs: 250 }),
        makeTrace({ durationMs: 700 }),
        makeTrace({ durationMs: 1500 })
      ];

      const spectrum = computeLatencySpectrum(traces);
      expect(spectrum.fast).toBe(1);
      expect(spectrum.normal).toBe(1);
      expect(spectrum.slow).toBe(1);
      expect(spectrum.critical).toBe(1);
      expect(spectrum.fastPct).toBe(25);
      expect(spectrum.normalPct).toBe(25);
      expect(spectrum.slowPct).toBe(25);
      expect(spectrum.criticalPct).toBe(25);
    });

    it('retorna zeros com segurança para lista vazia', () => {
      const spectrum = computeLatencySpectrum([]);
      expect(spectrum.fast).toBe(0);
      expect(spectrum.fastPct).toBe(0);
    });
  });

  describe('categorizeSpan', () => {
    it('classifica span com dbStatement ou dbSystem como jdbc', () => {
      const span = makeSpan({
        name: 'SELECT FROM PCPEDC',
        kind: 'CLIENT',
        dbStatement: 'SELECT * FROM PCPEDC',
        dbSystem: 'oracle',
        durationMs: 350
      });
      const res = categorizeSpan(span);
      expect(res.category).toBe('jdbc');
      expect(res.label).toBe('JDBC');
      expect(res.isSlow).toBe(true);
      expect(res.badgeClass).toContain('amber');
    });

    it('classifica span raiz HTTP ou SERVER como http', () => {
      const span = makeSpan({
        name: 'GET /winthor/api/v1/pedidos',
        kind: 'SERVER',
        httpMethod: 'GET',
        durationMs: 40
      });
      const res = categorizeSpan(span);
      expect(res.category).toBe('http');
      expect(res.label).toBe('HTTP');
      expect(res.isSlow).toBe(false);
      expect(res.badgeClass).toContain('sky');
    });

    it('classifica span de processamento interno OSGi/Karaf como java', () => {
      const span = makeSpan({
        name: 'OrderProcessorService::process',
        kind: 'INTERNAL',
        durationMs: 120
      });
      const res = categorizeSpan(span);
      expect(res.category).toBe('java');
      expect(res.label).toBe('Java');
      expect(res.isSlow).toBe(false);
      expect(res.badgeClass).toContain('purple');
    });
  });

  describe('computeTimeBudget', () => {
    it('calcula percentual de banco de dados e aplicação com detecção de gargalo', () => {
      const details: TraceDetails = {
        summary: makeTrace({ durationMs: 100 }),
        spans: [
          makeSpan({
            spanId: 's1',
            name: 'GET /pedidos',
            kind: 'SERVER',
            startTimeUnixMs: 1000,
            durationMs: 100,
            serviceName: 'karaf'
          }),
          makeSpan({
            spanId: 's2',
            name: 'SELECT FROM PCPEDC',
            kind: 'CLIENT',
            startTimeUnixMs: 1010,
            durationMs: 80,
            serviceName: 'karaf',
            dbStatement: 'SELECT * FROM PCPEDC WHERE NUMPED = 1234'
          })
        ],
        rootTree: [],
        breakdown: { totalMs: 100, dbMs: 80, externalMs: 0, appMs: 20 }
      };

      const budget = computeTimeBudget(details);
      expect(budget).not.toBeNull();
      expect(budget?.dbMs).toBe(80);
      expect(budget?.dbPct).toBe(80);
      expect(budget?.hasDbBottleneck).toBe(true);
      expect(budget?.topBottleneck).toBe('db');
      expect(budget?.primaryBottleneck).toBe('jdbc');
      expect(budget?.jdbcPct).toBe(80);
      expect(budget!.httpPct + budget!.javaPct + budget!.jdbcPct).toBe(100);
    });

    it('mantém a soma dos percentuais em 100 mesmo com arredondamento', () => {
      const budget = computeTimeBudget({
        summary: makeTrace({ durationMs: 3 }),
        spans: [makeSpan({})],
        rootTree: [],
        breakdown: { totalMs: 3, dbMs: 1, externalMs: 1, appMs: 1 }
      });
      expect(budget!.dbPct + budget!.clientPct + budget!.appPct).toBe(100);
      expect(budget!.httpPct + budget!.javaPct + budget!.jdbcPct).toBe(100);
    });

    it('retorna null se não houver detalhes ou spans', () => {
      expect(computeTimeBudget(null)).toBeNull();
      expect(
        computeTimeBudget({
          summary: makeTrace({}),
          spans: [],
          rootTree: [],
          breakdown: { totalMs: 0, dbMs: 0, externalMs: 0, appMs: 0 }
        })
      ).toBeNull();
    });
  });

  describe('detectSlowSummary', () => {
    it('agrega contagens de traces lentos, críticos e queries lentas', () => {
      const traces = [
        makeTrace({ traceId: 't1', durationMs: 200, httpRoute: '/api/fast' }),
        makeTrace({ traceId: 't2', durationMs: 450, httpRoute: '/api/pedidos', hasDatabaseQuery: true }),
        makeTrace({ traceId: 't3', durationMs: 1500, httpRoute: '/api/pedidos', hasDatabaseQuery: true }),
        makeTrace({ traceId: 't4', durationMs: 1200, httpRoute: '/api/relatorios', hasDatabaseQuery: false })
      ];

      const res = detectSlowSummary(traces);
      expect(res.slowTracesCount).toBe(3); // >= 400ms
      expect(res.criticalTracesCount).toBe(2); // >= 1000ms
      expect(res.slowDbTracesCount).toBe(2);
      expect(res.topSlowEndpoints.length).toBeGreaterThan(0);
      expect(res.topSlowEndpoints[0].route).toBe('/api/pedidos');
      expect(res.topSlowEndpoints[0].maxDurationMs).toBe(1500);
    });
  });

  describe('mergeLiveTraces', () => {
    it('substitui a versão antiga do trace e mantém a ordem por início, sem pular para o topo', () => {
      const current = [
        makeTrace({ traceId: 'new', startTimeUnixMs: 3000 }),
        makeTrace({ traceId: 'old', startTimeUnixMs: 1000, spanCount: 1 })
      ];
      const merged = mergeLiveTraces(current, [makeTrace({ traceId: 'old', startTimeUnixMs: 1000, spanCount: 5 })], 10);

      expect(merged.map((t) => t.traceId)).toEqual(['new', 'old']);
      expect(merged[1].spanCount).toBe(5);
    });

    it('insere traces novos na posição certa e respeita o limite', () => {
      const current = [makeTrace({ traceId: 'a', startTimeUnixMs: 3000 }), makeTrace({ traceId: 'b', startTimeUnixMs: 1000 })];
      const merged = mergeLiveTraces(current, [makeTrace({ traceId: 'c', startTimeUnixMs: 2000 })], 2);
      expect(merged.map((t) => t.traceId)).toEqual(['a', 'c']);
    });

    it('devolve a mesma lista quando não há novidades (evita re-render)', () => {
      const current = [makeTrace({ traceId: 'a' })];
      expect(mergeLiveTraces(current, [], 10)).toBe(current);
    });
  });

  describe('formatSpanErrorForClipboard', () => {
    it('copia o stacktrace completo sem repetir a linha de cabeçalho', () => {
      const span = makeSpan({
        exception: {
          type: 'java.sql.SQLException',
          message: 'ORA-00001',
          stacktrace: 'java.sql.SQLException: ORA-00001\n\tat Foo.bar(Foo.java:1)'
        }
      });
      expect(formatSpanErrorForClipboard(span)).toBe('java.sql.SQLException: ORA-00001\n\tat Foo.bar(Foo.java:1)');
    });

    it('usa a mensagem de status quando não há exceção registrada', () => {
      expect(formatSpanErrorForClipboard(makeSpan({ statusMessage: 'Timeout' }))).toBe('Timeout');
    });
  });

  describe('buildApmSetupSnippets', () => {
    it('monta os comandos com a porta real e 127.0.0.1', () => {
      const snippets = buildApmSetupSnippets(4400);
      expect(snippets.tracesUrl).toBe('http://127.0.0.1:4400/v1/traces');
      expect(snippets.curlCopy).toContain('http://127.0.0.1:4400/v1/traces');
      expect(snippets.powershellCopy).toContain('http://127.0.0.1:4400/v1/traces');
      expect(snippets.nodeDisplay).toContain("url: 'http://127.0.0.1:4400/v1/traces'");
    });

    it('usa no snippet do Karaf as mesmas opções do anexo automático do agente (http/protobuf)', () => {
      const { karafCopy, karafDisplay } = buildApmSetupSnippets(4318);
      expect(karafCopy).toContain('-javaagent:opentelemetry-javaagent.jar');
      expect(karafCopy).toContain('-Dotel.exporter.otlp.endpoint=http://127.0.0.1:4318');
      expect(karafCopy).toContain('-Dotel.exporter.otlp.protocol=http/protobuf');
      expect(karafCopy).toContain('-Dotel.metrics.exporter=none');
      expect(karafDisplay.split('\n').every((line, i, lines) => i === lines.length - 1 || line.endsWith(' ^'))).toBe(true);
    });
  });

  describe('filterTraces', () => {
    const traces: TraceSummary[] = [
      makeTrace({ traceId: 'tr-01', httpRoute: '/api/v1/auth', serviceName: 'auth-service', durationMs: 30, hasError: false }),
      makeTrace({ traceId: 'tr-02', httpRoute: '/api/v1/pedidos', serviceName: 'karaf', durationMs: 1200, hasError: true }),
      makeTrace({ traceId: 'tr-03', httpRoute: '/api/v1/produtos', serviceName: 'karaf', durationMs: 250, hasDatabaseQuery: true }),
      makeTrace({ traceId: 'tr-04', httpRoute: '/api/v1/clientes', serviceName: 'karaf', durationMs: 850 })
    ];

    it('filtra por busca textual (rota ou traceId)', () => {
      const res = filterTraces(traces, { searchText: 'pedidos' });
      expect(res).toHaveLength(1);
      expect(res[0].traceId).toBe('tr-02');
    });

    it('filtra por preset ERRORS', () => {
      const res = filterTraces(traces, { preset: 'ERRORS' });
      expect(res).toHaveLength(1);
      expect(res[0].traceId).toBe('tr-02');
    });

    it('filtra por preset SLOW (>1000ms)', () => {
      const res = filterTraces(traces, { preset: 'SLOW' });
      expect(res).toHaveLength(1);
      expect(res[0].traceId).toBe('tr-02');
    });

    it('filtra por preset DB', () => {
      const res = filterTraces(traces, { preset: 'DB' });
      expect(res).toHaveLength(1);
      expect(res[0].traceId).toBe('tr-03');
    });

    it('filtra por latencyBracket FAST (<100ms)', () => {
      const res = filterTraces(traces, { latencyBracket: 'FAST' });
      expect(res).toHaveLength(1);
      expect(res[0].traceId).toBe('tr-01');
    });

    it('filtra por latencyBracket NORMAL (100-400ms)', () => {
      const res = filterTraces(traces, { latencyBracket: 'NORMAL' });
      expect(res).toHaveLength(1);
      expect(res[0].traceId).toBe('tr-03');
    });

    it('filtra por serviço selecionado', () => {
      const res = filterTraces(traces, { selectedService: 'auth-service' });
      expect(res).toHaveLength(1);
      expect(res[0].traceId).toBe('tr-01');
    });

    it('ordena traces por duração decrescente quando sortOrder for duration', () => {
      const res = filterTraces(traces, { sortOrder: 'duration' });
      expect(res.map((t) => t.traceId)).toEqual(['tr-02', 'tr-04', 'tr-03', 'tr-01']);
    });

    it('filtra por preset SLOW_QUERIES e SLOW_ENDPOINTS', () => {
      const slowQueries = filterTraces(traces, { preset: 'SLOW_QUERIES' });
      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].traceId).toBe('tr-03');

      const slowEndpoints = filterTraces(traces, { preset: 'SLOW_ENDPOINTS' });
      expect(slowEndpoints.map((t) => t.traceId)).toEqual(['tr-02', 'tr-04']);
    });
  });

  describe('findNextTraceId', () => {
    const traces: TraceSummary[] = [
      makeTrace({ traceId: 'tr-01' }),
      makeTrace({ traceId: 'tr-02' }),
      makeTrace({ traceId: 'tr-03' })
    ];

    it('avança para o próximo trace corretamente', () => {
      expect(findNextTraceId(traces, 'tr-01', 'next')).toBe('tr-02');
      expect(findNextTraceId(traces, 'tr-02', 'next')).toBe('tr-03');
      expect(findNextTraceId(traces, 'tr-03', 'next')).toBe('tr-03'); // trava no fim
    });

    it('retrocede para o trace anterior', () => {
      expect(findNextTraceId(traces, 'tr-03', 'prev')).toBe('tr-02');
      expect(findNextTraceId(traces, 'tr-01', 'prev')).toBe('tr-01'); // trava no início
    });

    it('retorna o primeiro se trace atual for null', () => {
      expect(findNextTraceId(traces, null, 'next')).toBe('tr-01');
    });
  });

  describe('splitSqlTokens', () => {
    it('identifica palavras-chave SQL em consultas WinThor', () => {
      const sql = 'SELECT NUMPED, CODCLI FROM PCPEDC WHERE NUMPED = 100';
      const tokens = splitSqlTokens(sql);
      const keywords = tokens.filter((t) => t.isKeyword).map((t) => t.text.toUpperCase());
      expect(keywords).toContain('SELECT');
      expect(keywords).toContain('FROM');
      expect(keywords).toContain('WHERE');
    });

    it('preserva todo o texto da query, inclusive números e acentos', () => {
      const sql = "INSERT INTO PCNFSAID (NUMTRANSVENDA, NUMNOTA, CODFILIAL) VALUES (982314, 10452, '01') -- emissão 2ª via";
      expect(splitSqlTokens(sql).map((t) => t.text).join('')).toBe(sql);
    });
  });

  describe('badge class helpers', () => {
    it('retorna estilos semânticos para HTTP methods', () => {
      expect(getMethodBadgeClass('GET')).toContain('text-sky-700');
      expect(getMethodBadgeClass('GET')).toContain('dark:text-sky-400');
      expect(getMethodBadgeClass('POST')).toContain('text-emerald-700');
      expect(getMethodBadgeClass('DELETE')).toContain('text-rose-700');
    });

    it('retorna estilos semânticos para status codes', () => {
      expect(getStatusBadgeClass(200)).toContain('text-emerald-700');
      expect(getStatusBadgeClass(200)).toContain('dark:text-emerald-400');
      expect(getStatusBadgeClass(404)).toContain('text-amber-700');
      expect(getStatusBadgeClass(500)).toContain('text-rose-700');
      expect(getStatusBadgeClass(200, true)).toContain('text-rose-700');
    });
  });
});
