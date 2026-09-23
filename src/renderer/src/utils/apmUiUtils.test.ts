import { describe, it, expect } from 'vitest';
import {
  computeLatencySpectrum,
  computeTimeBudget,
  filterTraces,
  findNextTraceId,
  getMethodBadgeClass,
  getStatusBadgeClass,
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
        rootTree: []
      };

      const budget = computeTimeBudget(details);
      expect(budget).not.toBeNull();
      expect(budget?.dbMs).toBe(80);
      expect(budget?.dbPct).toBe(80);
      expect(budget?.hasDbBottleneck).toBe(true);
      expect(budget?.topBottleneck).toBe('db');
    });

    it('retorna null se não houver detalhes ou spans', () => {
      expect(computeTimeBudget(null)).toBeNull();
      expect(computeTimeBudget({ summary: makeTrace({}), spans: [], rootTree: [] })).toBeNull();
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
