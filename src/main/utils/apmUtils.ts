import {
  TraceSpan,
  TraceSpanKind,
  TraceStatusCode,
  TraceSummary,
  TraceSpanTreeNode,
  ServiceMetricsSummary,
  EndpointMetricsSummary,
  SlowQueryMetricsSummary,
  ApmTimeSeriesBucket
} from '../../shared/types';

/**
 * Converte valor OTel em formato de objeto tipado (ex: `{ stringValue: 'foo' }`)
 * ou valor primitivo direto para valor primitivo JavaScript.
 */
export function unpackOtelAttributeValue(val: any): any {
  if (val === null || val === undefined) return val;
  if (typeof val !== 'object') return val;

  if ('stringValue' in val) return val.stringValue;
  if ('intValue' in val) return Number(val.intValue);
  if ('boolValue' in val) return Boolean(val.boolValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('arrayValue' in val && Array.isArray(val.arrayValue?.values)) {
    return val.arrayValue.values.map(unpackOtelAttributeValue);
  }
  if ('kvlistValue' in val && Array.isArray(val.kvlistValue?.values)) {
    const obj: Record<string, any> = {};
    for (const item of val.kvlistValue.values) {
      if (item.key) obj[item.key] = unpackOtelAttributeValue(item.value);
    }
    return obj;
  }
  return val;
}

/**
 * Transforma uma lista de atributos OTel `[ { key: 'foo', value: { ... } } ]`
 * ou um objeto plano `{ foo: 'bar' }` em dicionário `Record<string, any>`.
 */
export function normalizeOtelAttributes(attrs: any): Record<string, any> {
  const result: Record<string, any> = {};
  if (!attrs) return result;

  if (Array.isArray(attrs)) {
    for (const item of attrs) {
      if (item && typeof item.key === 'string') {
        result[item.key] = unpackOtelAttributeValue(item.value);
      }
    }
  } else if (typeof attrs === 'object') {
    for (const [k, v] of Object.entries(attrs)) {
      result[k] = unpackOtelAttributeValue(v);
    }
  }

  return result;
}

/**
 * Mapeia código de status numérico ou textual OTel para enum unificado.
 */
export function parseOtelStatusCode(code: any): TraceStatusCode {
  if (code === 1 || code === 'STATUS_CODE_OK' || code === 'OK') return 'OK';
  if (code === 2 || code === 'STATUS_CODE_ERROR' || code === 'ERROR') return 'ERROR';
  return 'UNSET';
}

/**
 * Mapeia kind de span OTel para enum unificado.
 */
export function parseOtelSpanKind(kind: any): TraceSpanKind {
  if (kind === 1 || kind === 'SPAN_KIND_INTERNAL' || kind === 'INTERNAL') return 'INTERNAL';
  if (kind === 2 || kind === 'SPAN_KIND_SERVER' || kind === 'SERVER') return 'SERVER';
  if (kind === 3 || kind === 'SPAN_KIND_CLIENT' || kind === 'CLIENT') return 'CLIENT';
  if (kind === 4 || kind === 'SPAN_KIND_PRODUCER' || kind === 'PRODUCER') return 'PRODUCER';
  if (kind === 5 || kind === 'SPAN_KIND_CONSUMER' || kind === 'CONSUMER') return 'CONSUMER';
  return 'UNSPECIFIED';
}

/**
 * Normaliza timestamp em nanos ou milissegundos para milissegundos inteiros.
 */
export function normalizeTimestampMs(timeVal: any): number {
  if (!timeVal) return Date.now();
  const num = typeof timeVal === 'string' ? Number(timeVal) : timeVal;
  if (isNaN(num)) return Date.now();
  // Se o número for maior que 10^14, provavelmente está em nanosegundos (OTel standard)
  if (num > 1_000_000_000_000_000) {
    return Math.round(num / 1_000_000);
  }
  // Se for maior que 10^11, já está em milissegundos
  if (num > 100_000_000_000) {
    return Math.round(num);
  }
  // Se for segundos (10 dígitos)
  return Math.round(num * 1000);
}

/**
 * Extrai spans a partir de payload padrão OpenTelemetry OTLP/HTTP v1/traces Protobuf-JSON
 * ou payload simplificado.
 */
export function parseOtlpTracesPayload(payload: any): TraceSpan[] {
  const extractedSpans: TraceSpan[] = [];
  if (!payload || typeof payload !== 'object') return extractedSpans;

  // 1. Caso seja payload direto com lista de spans { spans: [...] } ou array direto
  const directList = Array.isArray(payload) ? payload : Array.isArray(payload.spans) ? payload.spans : null;
  if (directList) {
    for (const raw of directList) {
      if (!raw || typeof raw !== 'object') continue;
      const span = convertSingleSpan(raw, raw.serviceName || 'default-service');
      if (span) extractedSpans.push(span);
    }
    return extractedSpans;
  }

  // 2. Formato padrão OpenTelemetry OTLP (resourceSpans -> scopeSpans/instrumentationLibrarySpans -> spans)
  const resourceSpans = Array.isArray(payload.resourceSpans) ? payload.resourceSpans : [];
  for (const rSpan of resourceSpans) {
    if (!rSpan || typeof rSpan !== 'object') continue;

    const resourceAttrs = normalizeOtelAttributes(rSpan.resource?.attributes);
    const serviceName =
      String(resourceAttrs['service.name'] || resourceAttrs['serviceName'] || 'karaf-service').trim() || 'karaf-service';

    const scopes = Array.isArray(rSpan.scopeSpans)
      ? rSpan.scopeSpans
      : Array.isArray(rSpan.instrumentationLibrarySpans)
      ? rSpan.instrumentationLibrarySpans
      : [];

    for (const scope of scopes) {
      if (!scope || !Array.isArray(scope.spans)) continue;
      for (const rawSpan of scope.spans) {
        const span = convertSingleSpan(rawSpan, serviceName);
        if (span) extractedSpans.push(span);
      }
    }
  }

  return extractedSpans;
}

/**
 * Converte um span bruto OTel em um `TraceSpan` tipado.
 */
function convertSingleSpan(raw: any, defaultServiceName: string): TraceSpan | null {
  if (!raw.traceId || !raw.spanId) return null;

  const attributes = normalizeOtelAttributes(raw.attributes);
  const startMs = normalizeTimestampMs(raw.startTimeUnixNano || raw.startTimeUnixMs || raw.start);
  const endMs = normalizeTimestampMs(raw.endTimeUnixNano || raw.endTimeUnixMs || raw.end || startMs);
  const durationMs = Math.max(0, raw.durationMs !== undefined ? Number(raw.durationMs) : endMs - startMs);

  const statusCode = parseOtelStatusCode(raw.status?.code ?? raw.statusCode);
  const statusMessage = raw.status?.message || raw.statusMessage;

  // Extrair atributos HTTP padronizados
  const httpMethod = attributes['http.method'] || attributes['http.request.method'] || raw.httpMethod;
  const httpUrl = attributes['http.url'] || attributes['url.full'] || raw.httpUrl;
  const httpRoute = attributes['http.route'] || attributes['http.target'] || attributes['url.path'] || raw.httpRoute;
  const rawHttpStatus = attributes['http.status_code'] || attributes['http.response.status_code'] || raw.httpStatusCode;
  const httpStatusCode = rawHttpStatus !== undefined ? Number(rawHttpStatus) : undefined;

  // Extrair atributos de banco
  const dbSystem = attributes['db.system'] || raw.dbSystem;
  const dbStatement = attributes['db.statement'] || raw.dbStatement;
  const dbName = attributes['db.name'] || raw.dbName;

  // Se o status HTTP for 5xx, marca como erro automaticamente
  const effectiveStatus = httpStatusCode && httpStatusCode >= 500 ? 'ERROR' : statusCode;

  return {
    traceId: String(raw.traceId),
    spanId: String(raw.spanId),
    parentSpanId: raw.parentSpanId ? String(raw.parentSpanId) : undefined,
    name: String(raw.name || httpRoute || 'span'),
    kind: parseOtelSpanKind(raw.kind),
    serviceName: String(raw.serviceName || defaultServiceName),
    startTimeUnixMs: startMs,
    endTimeUnixMs: endMs,
    durationMs,
    statusCode: effectiveStatus,
    statusMessage,
    httpMethod: httpMethod ? String(httpMethod).toUpperCase() : undefined,
    httpUrl: httpUrl ? String(httpUrl) : undefined,
    httpRoute: httpRoute ? String(httpRoute) : undefined,
    httpStatusCode,
    dbSystem: dbSystem ? String(dbSystem) : undefined,
    dbStatement: dbStatement ? String(dbStatement) : undefined,
    dbName: dbName ? String(dbName) : undefined,
    attributes,
    events: Array.isArray(raw.events)
      ? raw.events.map((ev: any) => ({
          name: String(ev.name || ''),
          timestampUnixMs: normalizeTimestampMs(ev.timeUnixNano || ev.timestampUnixMs),
          attributes: normalizeOtelAttributes(ev.attributes)
        }))
      : undefined
  };
}

/**
 * Constrói o `TraceSummary` para um conjunto de spans pertencentes ao mesmo `traceId`.
 */
export function buildTraceSummary(traceId: string, spans: TraceSpan[]): TraceSummary {
  if (spans.length === 0) {
    return {
      traceId,
      rootSpanName: 'empty-trace',
      serviceName: 'unknown',
      startTimeUnixMs: Date.now(),
      durationMs: 0,
      spanCount: 0,
      hasError: false,
      errorCount: 0,
      hasDatabaseQuery: false
    };
  }

  // 1. Identificar o span raiz (sem parentSpanId ou cujo parent não está na lista de spans deste trace)
  const spanIdSet = new Set(spans.map((s) => s.spanId));
  const candidateRoots = spans.filter((s) => !s.parentSpanId || !spanIdSet.has(s.parentSpanId));

  // Ordena por horário de início
  const sorted = [...spans].sort((a, b) => a.startTimeUnixMs - b.startTimeUnixMs);
  const rootSpan = candidateRoots.length > 0 ? candidateRoots[0] : sorted[0];

  const earliestStart = sorted[0].startTimeUnixMs;
  const latestEnd = Math.max(...spans.map((s) => s.endTimeUnixMs));
  const totalDuration = Math.max(rootSpan.durationMs, latestEnd - earliestStart);

  const errorSpans = spans.filter((s) => s.statusCode === 'ERROR' || (s.httpStatusCode && s.httpStatusCode >= 500));
  const hasDb = spans.some((s) => !!s.dbStatement);

  return {
    traceId,
    rootSpanName: rootSpan.name,
    serviceName: rootSpan.serviceName,
    httpMethod: rootSpan.httpMethod,
    httpRoute: rootSpan.httpRoute || (rootSpan.name.startsWith('/') ? rootSpan.name : undefined),
    httpStatusCode: rootSpan.httpStatusCode,
    startTimeUnixMs: earliestStart,
    durationMs: totalDuration,
    spanCount: spans.length,
    hasError: errorSpans.length > 0,
    errorCount: errorSpans.length,
    hasDatabaseQuery: hasDb
  };
}

/**
 * Constrói a árvore de spans com offsets de tempo relativos (%) para renderizar a régua em cascata (waterfall).
 */
export function buildTraceTree(spans: TraceSpan[]): TraceSpanTreeNode[] {
  if (spans.length === 0) return [];

  const earliestStart = Math.min(...spans.map((s) => s.startTimeUnixMs));
  const latestEnd = Math.max(...spans.map((s) => s.endTimeUnixMs));
  const totalDuration = Math.max(1, latestEnd - earliestStart);

  // Mapeia filhos por parentSpanId
  const childrenMap = new Map<string, TraceSpan[]>();
  const spanIdMap = new Map<string, TraceSpan>();

  for (const span of spans) {
    spanIdMap.set(span.spanId, span);
    const parentId = span.parentSpanId || '__ROOT__';
    if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
    childrenMap.get(parentId)!.push(span);
  }

  // Raízes reais: spans sem parent ou cujo parent não existe neste trace
  const rootSpans = spans.filter((s) => !s.parentSpanId || !spanIdMap.has(s.parentSpanId));
  rootSpans.sort((a, b) => a.startTimeUnixMs - b.startTimeUnixMs);

  function createNode(span: TraceSpan, depth: number): TraceSpanTreeNode {
    const rawOffset = ((span.startTimeUnixMs - earliestStart) / totalDuration) * 100;
    const offsetPercent = Math.max(0, Math.min(99, Math.round(rawOffset * 10) / 10));

    const rawWidth = (Math.max(1, span.durationMs) / totalDuration) * 100;
    const widthPercent = Math.max(1, Math.min(100 - offsetPercent, Math.round(rawWidth * 10) / 10));

    const childrenSpans = childrenMap.get(span.spanId) || [];
    childrenSpans.sort((a, b) => a.startTimeUnixMs - b.startTimeUnixMs);

    return {
      span,
      depth,
      offsetPercent,
      widthPercent,
      children: childrenSpans.map((child) => createNode(child, depth + 1))
    };
  }

  return rootSpans.map((r) => createNode(r, 0));
}

/**
 * Calcula p50, p95, p99 e média de uma lista de durações em milissegundos.
 */
export function computePercentiles(latencies: number[]): {
  p50: number;
  p95: number;
  p99: number;
  avg: number;
} {
  if (latencies.length === 0) {
    return { p50: 0, p95: 0, p99: 0, avg: 0 };
  }

  const sorted = [...latencies].sort((a, b) => a - b);
  const total = sorted.reduce((sum, v) => sum + v, 0);
  const avg = Math.round((total / sorted.length) * 10) / 10;

  const getPercentile = (p: number) => {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
  };

  return {
    p50: getPercentile(50),
    p95: getPercentile(95),
    p99: getPercentile(99),
    avg
  };
}

/**
 * Agrega métricas agrupadas por serviço.
 */
export function aggregateServiceMetrics(traces: TraceSummary[]): ServiceMetricsSummary[] {
  const serviceGroups = new Map<string, TraceSummary[]>();

  for (const t of traces) {
    const sName = t.serviceName || 'unknown';
    if (!serviceGroups.has(sName)) serviceGroups.set(sName, []);
    serviceGroups.get(sName)!.push(t);
  }

  const result: ServiceMetricsSummary[] = [];

  for (const [serviceName, list] of serviceGroups.entries()) {
    const latencies = list.map((t) => t.durationMs);
    const percentiles = computePercentiles(latencies);
    const errorCount = list.filter((t) => t.hasError).length;
    const errorRate = list.length > 0 ? Math.round((errorCount / list.length) * 1000) / 10 : 0;
    const lastSeenAt = Math.max(...list.map((t) => t.startTimeUnixMs));

    result.push({
      serviceName,
      requestCount: list.length,
      errorCount,
      errorRate,
      avgDurationMs: percentiles.avg,
      p50DurationMs: percentiles.p50,
      p95DurationMs: percentiles.p95,
      p99DurationMs: percentiles.p99,
      lastSeenAt
    });
  }

  // Ordena por quantidade de requisições decrescente
  result.sort((a, b) => b.requestCount - a.requestCount);
  return result;
}

/**
 * Agrega métricas agrupadas por endpoint/rota.
 */
export function aggregateEndpointMetrics(traces: TraceSummary[]): EndpointMetricsSummary[] {
  const endpointGroups = new Map<string, TraceSummary[]>();

  for (const t of traces) {
    const method = t.httpMethod || 'HTTP';
    const route = t.httpRoute || t.rootSpanName;
    const key = `${t.serviceName}::${method}::${route}`;
    if (!endpointGroups.has(key)) endpointGroups.set(key, []);
    endpointGroups.get(key)!.push(t);
  }

  const result: EndpointMetricsSummary[] = [];

  for (const [key, list] of endpointGroups.entries()) {
    const [serviceName, method, route] = key.split('::');
    const latencies = list.map((t) => t.durationMs);
    const percentiles = computePercentiles(latencies);
    const errorCount = list.filter((t) => t.hasError).length;
    const errorRate = list.length > 0 ? Math.round((errorCount / list.length) * 1000) / 10 : 0;

    result.push({
      serviceName,
      method,
      route,
      requestCount: list.length,
      errorCount,
      errorRate,
      avgDurationMs: percentiles.avg,
      p95DurationMs: percentiles.p95
    });
  }

  result.sort((a, b) => b.requestCount - a.requestCount);
  return result;
}

/**
 * Agrega e ranqueia as queries de banco de dados mais lentas a partir de uma lista de spans.
 */
export function aggregateSlowQueries(spans: TraceSpan[], maxQueries: number = 20): SlowQueryMetricsSummary[] {
  const queryGroups = new Map<string, TraceSpan[]>();

  for (const span of spans) {
    if (!span.dbStatement || !span.dbStatement.trim()) continue;
    // Normaliza espaços em branco duplicados e quebras de linha para agrupar queries idênticas
    const normalized = span.dbStatement.trim().replace(/\s+/g, ' ');
    if (!queryGroups.has(normalized)) {
      queryGroups.set(normalized, []);
    }
    queryGroups.get(normalized)!.push(span);
  }

  const result: SlowQueryMetricsSummary[] = [];

  for (const [statement, list] of queryGroups.entries()) {
    const totalDurationMs = list.reduce((acc, s) => acc + s.durationMs, 0);
    const executionCount = list.length;
    const avgDurationMs = Math.round(totalDurationMs / executionCount);
    const maxDurationMs = Math.max(...list.map((s) => s.durationMs));
    const first = list[0];

    result.push({
      statement,
      dbSystem: first.dbSystem,
      dbName: first.dbName,
      executionCount,
      totalDurationMs,
      avgDurationMs,
      maxDurationMs,
      sampleTraceId: first.traceId
    });
  }

  // Ordena por maior tempo acumulado e depois maior pico de duração
  result.sort((a, b) => b.totalDurationMs - a.totalDurationMs || b.maxDurationMs - a.maxDurationMs);
  return result.slice(0, maxQueries);
}

/**
 * Calcula a porcentagem estimada de tempo gasto em chamadas de banco de dados vs tempo total de execução.
 */
export function computeDatabaseTimeRatio(spans: TraceSpan[]): number {
  if (spans.length === 0) return 0;

  let totalDbTime = 0;
  let totalRootTime = 0;

  for (const span of spans) {
    if (span.dbStatement && span.durationMs > 0) {
      totalDbTime += span.durationMs;
    }
    // Spans de entrada/servidor representam o tempo total da transação
    if (span.kind === 'SERVER' || !span.parentSpanId) {
      totalRootTime += span.durationMs;
    }
  }

  if (totalRootTime === 0) return 0;
  const ratio = (totalDbTime / totalRootTime) * 100;
  return Math.min(100, Math.round(ratio * 10) / 10);
}

/**
 * Agrega requisições em buckets temporais de 1 minuto (padrão últimos 15 a 30 minutos).
 */
export function aggregateTimeSeriesBuckets(
  traces: TraceSummary[],
  windowMinutes: number = 15,
  referenceNow?: number
): ApmTimeSeriesBucket[] {
  const now = referenceNow || Date.now();
  const bucketMs = 60_000; // 1 minuto
  const startTime = now - windowMinutes * bucketMs;

  const buckets: ApmTimeSeriesBucket[] = [];

  for (let i = 0; i < windowMinutes; i++) {
    const bStart = startTime + i * bucketMs;
    const bEnd = bStart + bucketMs;
    const date = new Date(bStart);
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');

    buckets.push({
      timestampUnixMs: bStart,
      label: `${hh}:${mm}`,
      requestCount: 0,
      successCount: 0,
      clientErrorCount: 0,
      serverErrorCount: 0,
      avgDurationMs: 0,
      p95DurationMs: 0
    });
  }

  for (const t of traces) {
    if (t.startTimeUnixMs < startTime || t.startTimeUnixMs >= now) continue;
    const idx = Math.floor((t.startTimeUnixMs - startTime) / bucketMs);
    if (idx >= 0 && idx < buckets.length) {
      const b = buckets[idx];
      b.requestCount++;

      const status = t.httpStatusCode;
      if (status && status >= 400 && status < 500) {
        b.clientErrorCount++;
      } else if (t.hasError || (status && status >= 500)) {
        b.serverErrorCount++;
      } else {
        b.successCount++;
      }
    }
  }

  // Calcula percentis para cada bucket preenchido
  for (let i = 0; i < buckets.length; i++) {
    const bStart = startTime + i * bucketMs;
    const bEnd = bStart + bucketMs;
    const bucketTraces = traces.filter((t) => t.startTimeUnixMs >= bStart && t.startTimeUnixMs < bEnd);

    if (bucketTraces.length > 0) {
      const latencies = bucketTraces.map((t) => t.durationMs);
      const percentiles = computePercentiles(latencies);
      buckets[i].avgDurationMs = percentiles.avg;
      buckets[i].p95DurationMs = percentiles.p95;
    }
  }

  return buckets;
}

/**
 * Gera um lote de traces simulados realistas para Karaf e WinThor (APIs, queries Oracle e erros).
 */
export function generateMockTraces(): TraceSpan[] {
  const baseTime = Date.now() - 60_000;
  const spans: TraceSpan[] = [];

  const addTrace = (
    traceId: string,
    serviceName: string,
    method: string,
    route: string,
    status: number,
    startOffsetMs: number,
    totalDurationMs: number,
    dbQuery?: { statement: string; durationMs: number },
    errorMsg?: string
  ) => {
    const rootSpanId = `${traceId}-root`;
    const rootStart = baseTime + startOffsetMs;
    const rootEnd = rootStart + totalDurationMs;

    // Span Raiz (HTTP Server)
    spans.push({
      traceId,
      spanId: rootSpanId,
      name: `${method} ${route}`,
      kind: 'SERVER',
      serviceName,
      startTimeUnixMs: rootStart,
      endTimeUnixMs: rootEnd,
      durationMs: totalDurationMs,
      statusCode: status >= 500 ? 'ERROR' : 'OK',
      statusMessage: errorMsg,
      httpMethod: method,
      httpRoute: route,
      httpUrl: `http://localhost:8889${route}`,
      httpStatusCode: status,
      attributes: {
        'http.method': method,
        'http.route': route,
        'http.status_code': status,
        'http.user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DevManager/1.0',
        'karaf.bundle.name': 'br.com.totvs.winthor.servicos.api'
      }
    });

    // Sub-span interno (CXF Dispatcher)
    const cxfDuration = Math.round(totalDurationMs * 0.15);
    const cxfStart = rootStart + 2;
    spans.push({
      traceId,
      spanId: `${traceId}-cxf`,
      parentSpanId: rootSpanId,
      name: 'CXF JAX-RS Resource Handler',
      kind: 'INTERNAL',
      serviceName,
      startTimeUnixMs: cxfStart,
      endTimeUnixMs: cxfStart + cxfDuration,
      durationMs: cxfDuration,
      statusCode: 'OK',
      attributes: {
        'cxf.service': 'WinThorRestEndpoint',
        'cxf.operation': route.split('/').pop() || 'handle'
      }
    });

    // Sub-span de Banco de Dados (Oracle JDBC)
    if (dbQuery) {
      const dbStart = cxfStart + cxfDuration + 3;
      const dbEnd = dbStart + dbQuery.durationMs;
      spans.push({
        traceId,
        spanId: `${traceId}-db`,
        parentSpanId: rootSpanId,
        name: 'Oracle JDBC executeQuery',
        kind: 'CLIENT',
        serviceName,
        startTimeUnixMs: dbStart,
        endTimeUnixMs: dbEnd,
        durationMs: dbQuery.durationMs,
        statusCode: status >= 500 ? 'ERROR' : 'OK',
        statusMessage: errorMsg,
        dbSystem: 'oracle',
        dbStatement: dbQuery.statement,
        dbName: 'WINT',
        attributes: {
          'db.system': 'oracle',
          'db.name': 'WINT',
          'db.statement': dbQuery.statement,
          'db.user': 'WINTHOR'
        }
      });
    }
  };

  // 1. Pedidos (Sucesso - Rápido)
  addTrace(
    'trace-pedidos-1',
    'karaf-winthor',
    'GET',
    '/winthor/api/v1/pedidos',
    200,
    1000,
    85,
    { statement: 'SELECT NUMPED, CODFILIAL, POSICAO, VLTOTAL FROM PCPEDC WHERE POSICAO = \'L\' AND ROWNUM <= 50', durationMs: 42 }
  );

  // 2. Autenticação (Sucesso)
  addTrace(
    'trace-auth-1',
    'karaf-winthor',
    'POST',
    '/winthor/api/v1/auth/token',
    200,
    5000,
    120,
    { statement: 'SELECT MATRICULA, NOME, SENHA FROM PCEMPR WHERE MATRICULA = 1', durationMs: 38 }
  );

  // 3. Consulta de Estoque (Lenta - 1.2s)
  addTrace(
    'trace-estoque-slow',
    'karaf-winthor',
    'GET',
    '/winthor/api/v1/estoque/posicao',
    200,
    12000,
    1250,
    {
      statement:
        'SELECT E.CODPROD, P.DESCRICAO, E.QTESTGER, E.QTRESERV FROM PCEST E JOIN PCPRODUT P ON E.CODPROD = P.CODPROD WHERE E.QTESTGER > 0',
      durationMs: 1120
    }
  );

  // 4. Emissão com Falha 500 (Erro de Constraint Oracle)
  addTrace(
    'trace-faturamento-error',
    'karaf-winthor',
    'POST',
    '/winthor/api/v1/faturamento/emitir',
    500,
    25000,
    340,
    {
      statement: 'INSERT INTO PCNFSAID (NUMTRANSVENDA, NUMNOTA, CODFILIAL) VALUES (982314, 10452, \'01\')',
      durationMs: 290
    },
    'java.sql.SQLException: ORA-00001: restrição exclusiva (WINTHOR.PK_PCNFSAID) violada'
  );

  // 5. Clientes (Sucesso)
  addTrace(
    'trace-clientes-1',
    'karaf-winthor',
    'GET',
    '/winthor/api/v1/clientes/420',
    200,
    35000,
    65,
    { statement: 'SELECT CODCLI, CLIENTE, CGC, MUNICENT, ESTENT FROM PCCLIENT WHERE CODCLI = 420', durationMs: 28 }
  );

  // 6. Microserviço Node / Gateway (Sucesso)
  addTrace('trace-gateway-health', 'api-gateway', 'GET', '/health', 200, 48000, 12);

  return spans;
}
