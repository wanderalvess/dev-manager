import {
  TraceSpan,
  TraceSpanKind,
  TraceStatusCode,
  TraceSpanEvent,
  TraceSpanException,
  TraceSummary,
  TraceSpanTreeNode,
  TraceDetails,
  TraceTimeBreakdown,
  ServiceMetricsSummary,
  EndpointMetricsSummary,
  SlowQueryMetricsSummary,
  ApmTimeSeriesBucket,
  ApmFilter
} from '../../shared/types';
import { decodeOtlpProtobufTraces } from './otlpProtobufUtils';

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
      if (item.key && item.key !== '__proto__') obj[item.key] = unpackOtelAttributeValue(item.value);
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
      // `__proto__` como chave trocaria o protótipo do objeto em vez de virar atributo
      if (item && typeof item.key === 'string' && item.key !== '__proto__') {
        result[item.key] = unpackOtelAttributeValue(item.value);
      }
    }
  } else if (typeof attrs === 'object') {
    for (const [k, v] of Object.entries(attrs)) {
      if (k !== '__proto__') result[k] = unpackOtelAttributeValue(v);
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
  // Se o número for maior que 10^15, provavelmente está em nanosegundos (OTel standard)
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

export type OtlpBodyFormat = 'json' | 'protobuf';

function looksLikeJson(body: Buffer): boolean {
  let pos = 0;
  if (body.length >= 3 && body[0] === 0xef && body[1] === 0xbb && body[2] === 0xbf) pos = 3;
  while (pos < body.length && (body[pos] === 0x20 || body[pos] === 0x09 || body[pos] === 0x0a || body[pos] === 0x0d)) {
    pos++;
  }
  return pos < body.length && (body[pos] === 0x7b /* { */ || body[pos] === 0x5b /* [ */);
}

function parseJsonBody(body: Buffer): unknown {
  const raw = body.toString('utf-8');
  const text = (raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw).trim();
  return JSON.parse(text || '{}');
}

/**
 * Interpreta o corpo de um export OTLP/HTTP (JSON ou Protobuf).
 *
 * O Content-Type explícito manda. Sem ele (ex.: `text/plain`), tenta JSON só quando o corpo
 * parece JSON e faz parse — não dá para decidir pelo primeiro byte sozinho: todo protobuf OTLP
 * válido começa com `0x0a` (tag de `resource_spans`), que também é a quebra de linha de um JSON
 * formatado. Lança `SyntaxError`/`OtlpDecodeError` se o corpo for inválido.
 */
export function decodeOtlpTraceBody(body: Buffer, contentType?: string): { format: OtlpBodyFormat; payload: unknown } {
  const type = (contentType || '').toLowerCase();
  if (type.includes('protobuf')) {
    return { format: 'protobuf', payload: decodeOtlpProtobufTraces(body) };
  }
  if (type.includes('json')) {
    return { format: 'json', payload: parseJsonBody(body) };
  }
  if (looksLikeJson(body)) {
    try {
      return { format: 'json', payload: parseJsonBody(body) };
    } catch {
      // Não era JSON de verdade: segue como protobuf
    }
  }
  return { format: 'protobuf', payload: decodeOtlpProtobufTraces(body) };
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
      // Nome do escopo identifica a instrumentação que gerou o span (ex.: io.opentelemetry.jdbc)
      const scopeName = scope.scope?.name ?? scope.instrumentationLibrary?.name;
      for (const rawSpan of scope.spans) {
        if (!rawSpan || typeof rawSpan !== 'object') continue;
        const span = convertSingleSpan(rawSpan, serviceName);
        if (!span) continue;
        if (typeof scopeName === 'string' && scopeName && span.attributes['otel.scope.name'] === undefined) {
          span.attributes['otel.scope.name'] = scopeName;
        }
        extractedSpans.push(span);
      }
    }
  }

  return extractedSpans;
}

function stringOrUndefined(value: unknown): string | undefined {
  return value === undefined || value === null || value === '' ? undefined : String(value);
}

/**
 * Localiza a exceção registrada no span: evento `exception` (convenção OTel, usada pelo Java Agent)
 * ou objeto `exception` direto do formato simplificado. Um span pode registrar várias exceções
 * (ex.: retentativas); a última é a que encerrou a operação.
 */
export function extractSpanException(events?: TraceSpanEvent[], rawException?: any): TraceSpanException | undefined {
  if (events) {
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev.name !== 'exception') continue;
      const attrs = ev.attributes || {};
      const exception: TraceSpanException = {
        type: stringOrUndefined(attrs['exception.type']),
        message: stringOrUndefined(attrs['exception.message']),
        stacktrace: stringOrUndefined(attrs['exception.stacktrace'])
      };
      if (exception.type || exception.message || exception.stacktrace) return exception;
    }
  }

  if (rawException && typeof rawException === 'object') {
    const exception: TraceSpanException = {
      type: stringOrUndefined(rawException.type),
      message: stringOrUndefined(rawException.message),
      stacktrace: stringOrUndefined(rawException.stacktrace)
    };
    if (exception.type || exception.message || exception.stacktrace) return exception;
  }

  return undefined;
}

/**
 * Converte um span bruto OTel em um `TraceSpan` tipado.
 */
function convertSingleSpan(raw: any, defaultServiceName: string): TraceSpan | null {
  if (!raw.traceId || !raw.spanId) return null;

  const attributes = normalizeOtelAttributes(raw.attributes);
  const startMs = normalizeTimestampMs(raw.startTimeUnixNano || raw.startTimeUnixMs || raw.start);
  const explicitDuration = raw.durationMs !== undefined ? Number(raw.durationMs) : NaN;
  const rawEnd = raw.endTimeUnixNano || raw.endTimeUnixMs || raw.end;
  // Formato simplificado costuma mandar só início + durationMs: o fim precisa refletir a duração,
  // senão o waterfall e o resumo do trace enxergam o span com largura zero
  const endMs = rawEnd
    ? normalizeTimestampMs(rawEnd)
    : startMs + (Number.isFinite(explicitDuration) ? Math.max(0, explicitDuration) : 0);
  const durationMs = Math.max(0, Number.isFinite(explicitDuration) ? explicitDuration : endMs - startMs);

  const statusCode = parseOtelStatusCode(raw.status?.code ?? raw.statusCode);

  // Extrair atributos HTTP padronizados (convenções antigas e novas)
  const httpMethod = attributes['http.method'] || attributes['http.request.method'] || raw.httpMethod;
  const httpUrl = attributes['http.url'] || attributes['url.full'] || raw.httpUrl;
  const rawRoute = attributes['http.route'] || attributes['http.target'] || attributes['url.path'] || raw.httpRoute;
  // `http.target` inclui a query string; mantê-la explodiria o agrupamento por endpoint
  const httpRoute = rawRoute ? String(rawRoute).split('?')[0] : undefined;
  const rawHttpStatus = attributes['http.status_code'] || attributes['http.response.status_code'] || raw.httpStatusCode;
  const parsedHttpStatus = rawHttpStatus !== undefined ? Number(rawHttpStatus) : NaN;
  const httpStatusCode = Number.isFinite(parsedHttpStatus) ? parsedHttpStatus : undefined;

  // Extrair atributos de banco (convenção antiga `db.statement`/`db.name` e estável `db.query.text`/`db.namespace`)
  const dbSystem = attributes['db.system'] || attributes['db.system.name'] || raw.dbSystem;
  const dbStatement = attributes['db.statement'] || attributes['db.query.text'] || raw.dbStatement;
  const dbName = attributes['db.name'] || attributes['db.namespace'] || raw.dbName;

  // Se o status HTTP for 5xx, marca como erro automaticamente
  const effectiveStatus = httpStatusCode && httpStatusCode >= 500 ? 'ERROR' : statusCode;

  const events: TraceSpanEvent[] | undefined = Array.isArray(raw.events)
    ? raw.events
        .filter((ev: any) => ev && typeof ev === 'object')
        .map((ev: any) => ({
          name: String(ev.name || ''),
          timestampUnixMs: normalizeTimestampMs(ev.timeUnixNano || ev.timestampUnixMs),
          attributes: normalizeOtelAttributes(ev.attributes)
        }))
    : undefined;
  const exception = extractSpanException(events, raw.exception);

  // O Java Agent marca status ERROR sem descrição e registra a exceção como evento: usa-a como mensagem
  const statusMessage =
    raw.status?.message ||
    raw.statusMessage ||
    (effectiveStatus === 'ERROR' && exception
      ? [exception.type, exception.message].filter(Boolean).join(': ') || undefined
      : undefined);

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
    httpRoute,
    httpStatusCode,
    dbSystem: dbSystem ? String(dbSystem) : undefined,
    dbStatement: dbStatement ? String(dbStatement) : undefined,
    dbName: dbName ? String(dbName) : undefined,
    attributes,
    events,
    exception
  };
}

function earliestSpan(spans: TraceSpan[]): TraceSpan {
  return spans.reduce((best, s) => (s.startTimeUnixMs < best.startTimeUnixMs ? s : best));
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

  // 1. Span raiz: o que não tem pai. Enquanto ele não chega (o Java Agent exporta os filhos
  // primeiro, porque terminam antes), usa o órfão mais antigo — pai ainda não recebido.
  const spanIdSet = new Set(spans.map((s) => s.spanId));
  const trueRoots = spans.filter((s) => !s.parentSpanId);
  const orphans = spans.filter((s) => s.parentSpanId && !spanIdSet.has(s.parentSpanId));
  const rootSpan =
    trueRoots.length > 0 ? earliestSpan(trueRoots) : orphans.length > 0 ? earliestSpan(orphans) : earliestSpan(spans);

  let earliestStart = Infinity;
  let latestEnd = -Infinity;
  for (const s of spans) {
    if (s.startTimeUnixMs < earliestStart) earliestStart = s.startTimeUnixMs;
    if (s.endTimeUnixMs > latestEnd) latestEnd = s.endTimeUnixMs;
  }
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

  let earliestStart = Infinity;
  let latestEnd = -Infinity;
  for (const s of spans) {
    if (s.startTimeUnixMs < earliestStart) earliestStart = s.startTimeUnixMs;
    if (s.endTimeUnixMs > latestEnd) latestEnd = s.endTimeUnixMs;
  }
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

type TimeInterval = [number, number];

function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  const sorted = intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  const merged: TimeInterval[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

function intervalsLength(intervals: TimeInterval[]): number {
  return intervals.reduce((acc, [start, end]) => acc + (end - start), 0);
}

// Comprimento da interseção entre duas listas de intervalos já mescladas e ordenadas
function overlapLength(a: TimeInterval[], b: TimeInterval[]): number {
  let i = 0;
  let j = 0;
  let total = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i][0], b[j][0]);
    const end = Math.min(a[i][1], b[j][1]);
    if (end > start) total += end - start;
    if (a[i][1] < b[j][1]) i++;
    else j++;
  }
  return total;
}

/**
 * Span de acesso a banco: tem a query ou é um CLIENT com `db.system` (Redis/Mongo não têm statement).
 */
export function isDatabaseSpan(span: TraceSpan): boolean {
  return !!span.dbStatement || (!!span.dbSystem && span.kind === 'CLIENT');
}

/**
 * Decompõe o tempo de parede de um trace entre banco, chamadas externas e processamento da aplicação.
 * Usa a união dos intervalos de cada categoria: queries paralelas ou spans aninhados não contam em
 * dobro, e o banco executado por outro serviço dentro de uma chamada externa conta só como banco.
 */
export function computeTraceTimeBreakdown(spans: TraceSpan[], traceDurationMs?: number): TraceTimeBreakdown {
  if (spans.length === 0) return { totalMs: 0, dbMs: 0, externalMs: 0, appMs: 0 };

  let earliest = Infinity;
  let latest = -Infinity;
  const dbIntervals: TimeInterval[] = [];
  const externalIntervals: TimeInterval[] = [];

  for (const span of spans) {
    const interval: TimeInterval = [span.startTimeUnixMs, span.startTimeUnixMs + Math.max(0, span.durationMs)];
    if (interval[0] < earliest) earliest = interval[0];
    if (interval[1] > latest) latest = interval[1];
    if (isDatabaseSpan(span)) {
      dbIntervals.push(interval);
    } else if (span.kind === 'CLIENT') {
      externalIntervals.push(interval);
    }
  }

  const totalMs = Math.max(0, traceDurationMs ?? latest - earliest);
  const mergedDb = mergeIntervals(dbIntervals);
  const mergedExternal = mergeIntervals(externalIntervals);
  const dbMs = Math.min(totalMs, intervalsLength(mergedDb));
  const externalMs = Math.min(
    totalMs - dbMs,
    Math.max(0, intervalsLength(mergedExternal) - overlapLength(mergedExternal, mergedDb))
  );

  return { totalMs, dbMs, externalMs, appMs: Math.max(0, totalMs - dbMs - externalMs) };
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
 * Recorte de escopo (serviço + janela de tempo pelo início do trace). É o único filtro que o
 * overview agregado respeita, para que todas as métricas do painel falem do mesmo conjunto.
 */
export function matchesTraceScope(trace: TraceSummary, filter?: ApmFilter): boolean {
  if (!filter) return true;
  if (filter.serviceName && filter.serviceName !== 'ALL') {
    if ((trace.serviceName || '').toLowerCase() !== filter.serviceName.toLowerCase()) return false;
  }
  if (filter.startTimeMs !== undefined && trace.startTimeUnixMs < filter.startTimeMs) return false;
  if (filter.endTimeMs !== undefined && trace.startTimeUnixMs > filter.endTimeMs) return false;
  return true;
}

const APM_FILTER_STRING_KEYS = ['serviceName', 'search'] as const;
const APM_FILTER_BOOLEAN_KEYS = ['hasError', 'hasDatabaseQuery'] as const;
const APM_FILTER_NUMBER_KEYS = ['minDurationMs', 'maxDurationMs', 'limit', 'startTimeMs', 'endTimeMs'] as const;

/**
 * Serializa um `ApmFilter` como query string (`?chave=valor`), para a API de consulta do receptor.
 */
export function buildApmFilterQuery(filter?: ApmFilter): string {
  if (!filter) return '';
  const params = new URLSearchParams();
  for (const key of APM_FILTER_STRING_KEYS) {
    const value = filter[key];
    if (value) params.set(key, value);
  }
  for (const key of APM_FILTER_BOOLEAN_KEYS) {
    const value = filter[key];
    if (value !== undefined) params.set(key, String(value));
  }
  for (const key of APM_FILTER_NUMBER_KEYS) {
    const value = filter[key];
    if (value !== undefined && Number.isFinite(value)) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

/**
 * Inverso de `buildApmFilterQuery`: valores ausentes, vazios ou malformados são ignorados.
 */
export function parseApmFilterQuery(params: URLSearchParams): ApmFilter {
  const filter: ApmFilter = {};
  for (const key of APM_FILTER_STRING_KEYS) {
    const value = params.get(key);
    if (value) filter[key] = value;
  }
  for (const key of APM_FILTER_BOOLEAN_KEYS) {
    const value = params.get(key);
    if (value === 'true' || value === 'false') filter[key] = value === 'true';
  }
  for (const key of APM_FILTER_NUMBER_KEYS) {
    const value = params.get(key);
    if (value === null || value.trim() === '') continue;
    const num = Number(value);
    if (Number.isFinite(num)) filter[key] = num;
  }
  return filter;
}

/**
 * Aplica escopo, erro, SQL, faixa de duração e busca textual à lista de traces.
 */
export function filterTraceSummaries(traces: TraceSummary[], filter?: ApmFilter): TraceSummary[] {
  if (!filter) return [...traces];
  const query = filter.search?.trim().toLowerCase();

  return traces.filter((t) => {
    if (!matchesTraceScope(t, filter)) return false;
    if (filter.hasError !== undefined && t.hasError !== filter.hasError) return false;
    if (filter.hasDatabaseQuery !== undefined && t.hasDatabaseQuery !== filter.hasDatabaseQuery) return false;
    if (filter.minDurationMs !== undefined && t.durationMs < filter.minDurationMs) return false;
    if (filter.maxDurationMs !== undefined && t.durationMs > filter.maxDurationMs) return false;
    if (query) {
      const matches =
        t.traceId.toLowerCase().includes(query) ||
        t.rootSpanName.toLowerCase().includes(query) ||
        (!!t.httpRoute && t.httpRoute.toLowerCase().includes(query)) ||
        (!!t.serviceName && t.serviceName.toLowerCase().includes(query));
      if (!matches) return false;
    }
    return true;
  });
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
    const lastSeenAt = list.reduce((max, t) => Math.max(max, t.startTimeUnixMs), 0);

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
  const endpointGroups = new Map<string, { serviceName: string; method: string; route: string; list: TraceSummary[] }>();

  for (const t of traces) {
    const method = t.httpMethod || 'HTTP';
    const route = t.httpRoute || t.rootSpanName;
    // Nomes de span podem conter '::' (ex.: Classe::metodo); a chave nunca é decomposta de volta
    const key = JSON.stringify([t.serviceName, method, route]);
    let group = endpointGroups.get(key);
    if (!group) {
      group = { serviceName: t.serviceName, method, route, list: [] };
      endpointGroups.set(key, group);
    }
    group.list.push(t);
  }

  const result: EndpointMetricsSummary[] = [];

  for (const { serviceName, method, route, list } of endpointGroups.values()) {
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
    const slowest = list.reduce((max, s) => (s.durationMs > max.durationMs ? s : max));

    result.push({
      statement,
      dbSystem: slowest.dbSystem,
      dbName: slowest.dbName,
      executionCount,
      totalDurationMs,
      avgDurationMs,
      maxDurationMs: slowest.durationMs,
      // Aponta para a execução mais lenta: é a que o usuário quer abrir no waterfall
      sampleTraceId: slowest.traceId
    });
  }

  // Ordena por maior tempo acumulado e depois maior pico de duração
  result.sort((a, b) => b.totalDurationMs - a.totalDurationMs || b.maxDurationMs - a.maxDurationMs);
  return result.slice(0, maxQueries);
}

/**
 * Porcentagem do tempo de parede dos traces gasto em banco de dados. Agrupa os spans por trace e
 * soma a união dos intervalos de banco sobre a duração de cada trace — spans sem pai que não são
 * a raiz (ex.: pai ainda não exportado) e spans SERVER aninhados de traces distribuídos não inflam
 * o denominador.
 */
export function computeDatabaseTimeRatio(spans: TraceSpan[]): number {
  if (spans.length === 0) return 0;

  const byTrace = new Map<string, TraceSpan[]>();
  for (const span of spans) {
    let list = byTrace.get(span.traceId);
    if (!list) {
      list = [];
      byTrace.set(span.traceId, list);
    }
    list.push(span);
  }

  let totalMs = 0;
  let dbMs = 0;
  for (const traceSpans of byTrace.values()) {
    const breakdown = computeTraceTimeBreakdown(traceSpans);
    totalMs += breakdown.totalMs;
    dbMs += breakdown.dbMs;
  }

  if (totalMs === 0) return 0;
  const ratio = (dbMs / totalMs) * 100;
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
  const bucketLatencies: number[][] = [];

  for (let i = 0; i < windowMinutes; i++) {
    const bStart = startTime + i * bucketMs;
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
    bucketLatencies.push([]);
  }

  for (const t of traces) {
    if (t.startTimeUnixMs < startTime || t.startTimeUnixMs >= now) continue;
    const idx = Math.floor((t.startTimeUnixMs - startTime) / bucketMs);
    if (idx < 0 || idx >= buckets.length) continue;

    const b = buckets[idx];
    b.requestCount++;
    bucketLatencies[idx].push(t.durationMs);

    const status = t.httpStatusCode;
    if (status && status >= 400 && status < 500) {
      b.clientErrorCount++;
    } else if (t.hasError || (status && status >= 500)) {
      b.serverErrorCount++;
    } else {
      b.successCount++;
    }
  }

  // Calcula percentis para cada bucket preenchido
  for (let i = 0; i < buckets.length; i++) {
    if (bucketLatencies[i].length > 0) {
      const percentiles = computePercentiles(bucketLatencies[i]);
      buckets[i].avgDurationMs = percentiles.avg;
      buckets[i].p95DurationMs = percentiles.p95;
    }
  }

  return buckets;
}

/**
 * Lista os spans na ordem da árvore (pai antes dos filhos) com a profundidade de cada um.
 */
export function flattenTraceTree(nodes: TraceSpanTreeNode[]): Array<{ span: TraceSpan; depth: number }> {
  const out: Array<{ span: TraceSpan; depth: number }> = [];
  const visit = (node: TraceSpanTreeNode) => {
    out.push({ span: node.span, depth: node.depth });
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return out;
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}… (+${value.length - maxLength} caracteres)` : value;
}

function truncateAttributeValues(attributes: Record<string, any>, maxLength: number): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (typeof value === 'string') {
      out[key] = truncateText(value, maxLength);
    } else if (value !== null && typeof value === 'object') {
      out[key] = truncateText(JSON.stringify(value), maxLength);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Versão enxuta de `TraceDetails` para assistentes de IA (MCP): uma única lista de spans na ordem
 * do waterfall, sem a árvore duplicada nem os percentuais de layout, e com textos longos truncados.
 */
export function buildCompactTraceDetails(details: TraceDetails, maxTextLength = 2000) {
  const traceStart = details.summary.startTimeUnixMs;
  return {
    summary: details.summary,
    breakdown: details.breakdown,
    spans: flattenTraceTree(details.rootTree).map(({ span, depth }) => ({
      depth,
      spanId: span.spanId,
      parentSpanId: span.parentSpanId,
      name: span.name,
      kind: span.kind,
      serviceName: span.serviceName,
      offsetMs: span.startTimeUnixMs - traceStart,
      durationMs: span.durationMs,
      status: span.statusCode,
      statusMessage: span.statusMessage,
      http:
        span.httpMethod || span.httpRoute || span.httpStatusCode
          ? { method: span.httpMethod, route: span.httpRoute, url: span.httpUrl, statusCode: span.httpStatusCode }
          : undefined,
      db:
        span.dbStatement || span.dbSystem
          ? {
              system: span.dbSystem,
              name: span.dbName,
              statement: span.dbStatement ? truncateText(span.dbStatement, maxTextLength) : undefined
            }
          : undefined,
      exception: span.exception
        ? {
            type: span.exception.type,
            message: span.exception.message,
            stacktrace: span.exception.stacktrace ? truncateText(span.exception.stacktrace, maxTextLength) : undefined
          }
        : undefined,
      attributes: truncateAttributeValues(span.attributes, 300)
    }))
  };
}

interface MockScenario {
  serviceName: string;
  method: string;
  route: string;
  // Caminho concreto (com IDs) quando `route` é um template JAX-RS
  path?: string;
  status: number;
  durationMs: number;
  db?: { statement: string; table: string; durationMs: number };
  external?: { method: string; url: string; durationMs: number };
  exception?: TraceSpanException;
  weight: number;
}

const MOCK_SCENARIOS: MockScenario[] = [
  {
    serviceName: 'karaf-winthor',
    method: 'GET',
    route: '/winthor/api/v1/pedidos',
    status: 200,
    durationMs: 85,
    db: {
      statement: "SELECT NUMPED, CODFILIAL, POSICAO, VLTOTAL FROM PCPEDC WHERE POSICAO = 'L' AND ROWNUM <= 50",
      table: 'PCPEDC',
      durationMs: 42
    },
    weight: 5
  },
  {
    serviceName: 'karaf-winthor',
    method: 'POST',
    route: '/winthor/api/v1/auth/token',
    status: 200,
    durationMs: 120,
    db: { statement: 'SELECT MATRICULA, NOME, SENHA FROM PCEMPR WHERE MATRICULA = 1', table: 'PCEMPR', durationMs: 38 },
    weight: 2
  },
  {
    serviceName: 'karaf-winthor',
    method: 'GET',
    route: '/winthor/api/v1/estoque/posicao',
    status: 200,
    durationMs: 1250,
    db: {
      statement:
        'SELECT E.CODPROD, P.DESCRICAO, E.QTESTGER, E.QTRESERV FROM PCEST E JOIN PCPRODUT P ON E.CODPROD = P.CODPROD WHERE E.QTESTGER > 0',
      table: 'PCEST',
      durationMs: 1120
    },
    weight: 1
  },
  {
    serviceName: 'karaf-winthor',
    method: 'POST',
    route: '/winthor/api/v1/faturamento/emitir',
    status: 500,
    durationMs: 340,
    db: {
      statement: "INSERT INTO PCNFSAID (NUMTRANSVENDA, NUMNOTA, CODFILIAL) VALUES (982314, 10452, '01')",
      table: 'PCNFSAID',
      durationMs: 290
    },
    exception: {
      type: 'java.sql.SQLIntegrityConstraintViolationException',
      message: 'ORA-00001: restrição exclusiva (WINTHOR.PK_PCNFSAID) violada',
      stacktrace: [
        'java.sql.SQLIntegrityConstraintViolationException: ORA-00001: restrição exclusiva (WINTHOR.PK_PCNFSAID) violada',
        '\tat oracle.jdbc.driver.T4CTTIoer11.processError(T4CTTIoer11.java:629)',
        '\tat oracle.jdbc.driver.T4CPreparedStatement.executeForRows(T4CPreparedStatement.java:1086)',
        '\tat oracle.jdbc.driver.OraclePreparedStatement.executeUpdate(OraclePreparedStatement.java:3765)',
        '\tat br.com.totvs.winthor.faturamento.dao.NotaFiscalDAO.inserir(NotaFiscalDAO.java:212)',
        '\tat br.com.totvs.winthor.faturamento.service.EmissaoService.emitir(EmissaoService.java:87)',
        '\tat br.com.totvs.winthor.faturamento.rest.FaturamentoResource.emitir(FaturamentoResource.java:54)'
      ].join('\n')
    },
    weight: 1
  },
  {
    serviceName: 'karaf-winthor',
    method: 'GET',
    route: '/winthor/api/v1/clientes/{codcli}',
    path: '/winthor/api/v1/clientes/420',
    status: 200,
    durationMs: 65,
    db: {
      statement: 'SELECT CODCLI, CLIENTE, CGC, MUNICENT, ESTENT FROM PCCLIENT WHERE CODCLI = 420',
      table: 'PCCLIENT',
      durationMs: 28
    },
    weight: 3
  },
  {
    serviceName: 'karaf-winthor',
    method: 'GET',
    route: '/winthor/api/v1/produtos/{codprod}',
    path: '/winthor/api/v1/produtos/99999',
    status: 404,
    durationMs: 30,
    db: { statement: 'SELECT CODPROD, DESCRICAO FROM PCPRODUT WHERE CODPROD = 99999', table: 'PCPRODUT', durationMs: 12 },
    weight: 1
  },
  {
    serviceName: 'karaf-winthor',
    method: 'POST',
    route: '/winthor/api/v1/nfe/transmitir',
    status: 200,
    durationMs: 900,
    db: {
      statement: "UPDATE PCNFSAID SET SITUACAONFE = 'A' WHERE NUMTRANSVENDA = 982315",
      table: 'PCNFSAID',
      durationMs: 80
    },
    external: { method: 'POST', url: 'https://nfe.sefaz.homologacao.gov.br/ws/NFeAutorizacao4', durationMs: 600 },
    weight: 1
  },
  {
    serviceName: 'api-gateway',
    method: 'GET',
    route: '/health',
    status: 200,
    durationMs: 12,
    weight: 2
  }
];

/**
 * Gera um lote de traces simulados realistas para Karaf e WinThor (APIs, queries Oracle, chamada
 * HTTP externa, 4xx e 5xx com stacktrace). Cada cenário aparece ao menos uma vez no último minuto e
 * o restante do tráfego se espalha pelos últimos 14 minutos para preencher o gráfico temporal. IDs
 * aleatórios no formato OTel fazem cada clique em "Simular Tráfego" somar requisições novas em vez
 * de sobrescrever as anteriores.
 */
export function generateMockTraces(now: number = Date.now(), random: () => number = Math.random): TraceSpan[] {
  const spans: TraceSpan[] = [];

  const randomHex = (length: number) => {
    let out = '';
    for (let i = 0; i < length; i++) out += Math.floor(random() * 16).toString(16);
    return out;
  };
  const jitter = (base: number) => Math.max(1, Math.round(base * (0.75 + random() * 0.5)));

  const addTrace = (scenario: MockScenario, rootStart: number) => {
    const traceId = randomHex(32);
    const rootSpanId = randomHex(16);
    const totalDurationMs = jitter(scenario.durationMs);
    const rootEnd = rootStart + totalDurationMs;
    const isServerError = scenario.status >= 500;
    const concretePath = scenario.path || scenario.route;

    // Span Raiz (HTTP Server)
    spans.push({
      traceId,
      spanId: rootSpanId,
      name: `${scenario.method} ${scenario.route}`,
      kind: 'SERVER',
      serviceName: scenario.serviceName,
      startTimeUnixMs: rootStart,
      endTimeUnixMs: rootEnd,
      durationMs: totalDurationMs,
      statusCode: isServerError ? 'ERROR' : 'UNSET',
      statusMessage: isServerError && scenario.exception ? `${scenario.exception.type}: ${scenario.exception.message}` : undefined,
      httpMethod: scenario.method,
      httpRoute: scenario.route,
      httpUrl: `http://localhost:8889${concretePath}`,
      httpStatusCode: scenario.status,
      attributes: {
        'http.request.method': scenario.method,
        'http.route': scenario.route,
        'url.path': concretePath,
        'http.response.status_code': scenario.status,
        'user_agent.original': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DevManager/1.0',
        'karaf.bundle.name': 'br.com.totvs.winthor.servicos.api',
        'otel.scope.name': 'io.opentelemetry.servlet-3.0'
      }
    });

    if (scenario.serviceName === 'api-gateway') return;

    // Sub-span interno (CXF Dispatcher)
    const cxfDuration = Math.max(1, Math.round(totalDurationMs * 0.15));
    const cxfStart = rootStart + 2;
    spans.push({
      traceId,
      spanId: randomHex(16),
      parentSpanId: rootSpanId,
      name: 'CXF JAX-RS Resource Handler',
      kind: 'INTERNAL',
      serviceName: scenario.serviceName,
      startTimeUnixMs: cxfStart,
      endTimeUnixMs: cxfStart + cxfDuration,
      durationMs: cxfDuration,
      statusCode: 'UNSET',
      attributes: {
        'code.namespace': 'org.apache.cxf.jaxrs.JAXRSInvoker',
        'cxf.operation': scenario.route.split('/').pop() || 'handle',
        'otel.scope.name': 'io.opentelemetry.jaxrs-2.0-cxf-3.2'
      }
    });

    let cursor = cxfStart + cxfDuration + 3;
    const remaining = () => Math.max(1, rootEnd - 2 - cursor);

    // Sub-span de Banco de Dados (Oracle JDBC)
    if (scenario.db) {
      const dbDuration = Math.min(jitter(scenario.db.durationMs), remaining());
      const operation = scenario.db.statement.split(/\s+/)[0].toUpperCase();
      const exceptionEvent = scenario.exception
        ? [
            {
              name: 'exception',
              timestampUnixMs: cursor + dbDuration,
              attributes: {
                'exception.type': scenario.exception.type,
                'exception.message': scenario.exception.message,
                'exception.stacktrace': scenario.exception.stacktrace
              }
            }
          ]
        : undefined;
      spans.push({
        traceId,
        spanId: randomHex(16),
        parentSpanId: rootSpanId,
        name: `${operation} WINT.${scenario.db.table}`,
        kind: 'CLIENT',
        serviceName: scenario.serviceName,
        startTimeUnixMs: cursor,
        endTimeUnixMs: cursor + dbDuration,
        durationMs: dbDuration,
        statusCode: scenario.exception ? 'ERROR' : 'UNSET',
        statusMessage: scenario.exception ? `${scenario.exception.type}: ${scenario.exception.message}` : undefined,
        dbSystem: 'oracle',
        dbStatement: scenario.db.statement,
        dbName: 'WINT',
        attributes: {
          'db.system': 'oracle',
          'db.name': 'WINT',
          'db.statement': scenario.db.statement,
          'db.operation': operation,
          'db.user': 'WINTHOR',
          'otel.scope.name': 'io.opentelemetry.jdbc'
        },
        events: exceptionEvent,
        exception: scenario.exception
      });
      cursor += dbDuration + 2;
    }

    // Chamada HTTP externa (ex.: SEFAZ)
    if (scenario.external) {
      const extDuration = Math.min(jitter(scenario.external.durationMs), remaining());
      const host = new URL(scenario.external.url).host;
      spans.push({
        traceId,
        spanId: randomHex(16),
        parentSpanId: rootSpanId,
        name: scenario.external.method,
        kind: 'CLIENT',
        serviceName: scenario.serviceName,
        startTimeUnixMs: cursor,
        endTimeUnixMs: cursor + extDuration,
        durationMs: extDuration,
        statusCode: 'UNSET',
        httpMethod: scenario.external.method,
        httpUrl: scenario.external.url,
        httpStatusCode: 200,
        attributes: {
          'http.request.method': scenario.external.method,
          'url.full': scenario.external.url,
          'server.address': host,
          'http.response.status_code': 200,
          'otel.scope.name': 'io.opentelemetry.apache-httpclient-4.3'
        }
      });
    }
  };

  // 1. Um de cada cenário no último minuto (mantém o painel "ao vivo" e garante erro/lento/SQL)
  MOCK_SCENARIOS.forEach((scenario, i) => {
    addTrace(scenario, now - 58_000 + i * 6_000 - scenario.durationMs * 2);
  });

  // 2. Tráfego adicional ponderado espalhado pelos últimos 14 minutos
  const totalWeight = MOCK_SCENARIOS.reduce((acc, s) => acc + s.weight, 0);
  for (let i = 0; i < 28; i++) {
    let pick = random() * totalWeight;
    const scenario = MOCK_SCENARIOS.find((s) => (pick -= s.weight) < 0) || MOCK_SCENARIOS[0];
    const start = now - 60_000 - Math.round(random() * 13 * 60_000) - scenario.durationMs * 2;
    addTrace(scenario, start);
  }

  return spans;
}
