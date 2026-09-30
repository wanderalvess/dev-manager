import {
  TraceSummary,
  TraceDetails,
  TraceSpan,
  getApmOtlpEndpoint,
  buildOtelJavaAgentProperties,
  DEFAULT_APM_SERVICE_NAME
} from '../../../shared/types';

export type FilterPreset = 'ALL' | 'ERRORS' | 'SLOW' | 'DB' | 'SLOW_QUERIES' | 'SLOW_ENDPOINTS';
export type LatencyBracket = 'ALL' | 'FAST' | 'NORMAL' | 'SLOW' | 'CRITICAL';
export type TraceSortOrder = 'time' | 'duration';
export type SpanTierCategory = 'http' | 'java' | 'jdbc';

export interface SpanTierInfo {
  category: SpanTierCategory;
  label: string;
  fullLabel: string;
  badgeClass: string;
  barColor: string;
  borderColor: string;
  textColor: string;
  bgLight: string;
  isSlow: boolean;
}

/**
 * Categoriza um span em uma das 3 camadas principais da régua de tempo visual:
 * - Requisição HTTP (Entrada/Saída/Chamadas HTTP externas)
 * - Processamento Java (JVM / OSGi / Handlers CXF / Lógica de negócio)
 * - Queries JDBC (Banco de dados Oracle / PostgreSQL / MySQL)
 */
export function categorizeSpan(span: TraceSpan): SpanTierInfo {
  const isSlow = (span.durationMs || 0) >= 300;

  // 1. Queries JDBC no banco de dados
  if (span.dbStatement || (span.dbSystem && span.kind === 'CLIENT')) {
    return {
      category: 'jdbc',
      label: 'JDBC',
      fullLabel: 'Queries JDBC (Banco)',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      barColor: 'bg-amber-500',
      borderColor: 'border-amber-500/40',
      textColor: 'text-amber-700 dark:text-amber-400',
      bgLight: 'bg-amber-500/10',
      isSlow
    };
  }

  // 2. Processamento Java (spans internos, controllers, handlers, OSGi, serialização)
  if (
    span.kind === 'INTERNAL' ||
    span.attributes['code.namespace'] ||
    span.attributes['karaf.bundle.name'] ||
    span.attributes['cxf.operation']
  ) {
    return {
      category: 'java',
      label: 'Java',
      fullLabel: 'Processamento Java',
      badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
      barColor: 'bg-purple-500',
      borderColor: 'border-purple-500/40',
      textColor: 'text-purple-700 dark:text-purple-400',
      bgLight: 'bg-purple-500/10',
      isSlow
    };
  }

  // 3. Camada de Requisição HTTP (Server, Gateway, HTTP Clients externos)
  return {
    category: 'http',
    label: 'HTTP',
    fullLabel: 'Requisição HTTP',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
    barColor: 'bg-sky-500',
    borderColor: 'border-sky-500/40',
    textColor: 'text-sky-700 dark:text-sky-400',
    bgLight: 'bg-sky-500/10',
    isSlow
  };
}

export interface LatencySpectrumData {
  fast: number; // < 100ms
  normal: number; // 100 - 400ms
  slow: number; // 400 - 1000ms
  critical: number; // > 1000ms
  fastPct: number;
  normalPct: number;
  slowPct: number;
  criticalPct: number;
}

export interface TimeBudgetData {
  totalMs: number;
  dbMs: number;
  dbPct: number;
  clientHttpMs: number;
  clientPct: number;
  appPct: number;
  // Métricas explícitas da régua visual Waterfall (HTTP / Java / JDBC)
  httpMs: number;
  httpPct: number;
  javaMs: number;
  javaPct: number;
  jdbcMs: number;
  jdbcPct: number;
  httpSpansCount: number;
  javaSpansCount: number;
  jdbcSpansCount: number;
  hasDbBottleneck: boolean;
  hasJavaBottleneck: boolean;
  hasHttpBottleneck: boolean;
  topBottleneck: 'db' | 'app' | 'ext' | 'none' | 'jdbc' | 'java' | 'http';
  primaryBottleneck?: 'jdbc' | 'java' | 'http' | 'none';
}

/**
 * Calcula a distribuição percentual e contagem de requisições por faixas de latência.
 */
export function computeLatencySpectrum(traces: TraceSummary[]): LatencySpectrumData {
  let fast = 0;
  let normal = 0;
  let slow = 0;
  let critical = 0;

  for (const t of traces) {
    if (t.durationMs < 100) fast++;
    else if (t.durationMs < 400) normal++;
    else if (t.durationMs < 1000) slow++;
    else critical++;
  }

  const total = traces.length || 1;
  return {
    fast,
    normal,
    slow,
    critical,
    fastPct: (fast / total) * 100,
    normalPct: (normal / total) * 100,
    slowPct: (slow / total) * 100,
    criticalPct: (critical / total) * 100
  };
}

/**
 * Converte a decomposição de tempo calculada no backend em percentuais e durações exatas
 * para a régua de tempo visual do Waterfall: Requisição HTTP, Processamento Java e Queries JDBC no banco.
 */
export function computeTimeBudget(traceDetails: TraceDetails | null): TimeBudgetData | null {
  if (!traceDetails?.spans || traceDetails.spans.length === 0 || !traceDetails.breakdown) return null;
  const { totalMs, dbMs: dbTime, externalMs: clientHttpTime } = traceDetails.breakdown;
  const total = Math.max(1, totalMs || 1);

  // Valores da régua semântica
  const jdbcMs = traceDetails.breakdown.jdbcMs ?? dbTime;
  const rawHttpMs = traceDetails.breakdown.httpMs ?? clientHttpTime;
  const rawJavaMs = traceDetails.breakdown.javaMs ?? traceDetails.breakdown.appMs;

  const jdbcPct = Math.min(100, Math.round((jdbcMs / total) * 100));
  const httpPct = Math.min(100 - jdbcPct, Math.round((rawHttpMs / total) * 100));
  const javaPct = Math.max(0, 100 - jdbcPct - httpPct);

  // Contagem de spans por tier
  let httpSpansCount = 0;
  let javaSpansCount = 0;
  let jdbcSpansCount = 0;

  for (const span of traceDetails.spans) {
    const tier = categorizeSpan(span).category;
    if (tier === 'jdbc') jdbcSpansCount++;
    else if (tier === 'java') javaSpansCount++;
    else httpSpansCount++;
  }

  const rawDbPct = Math.round((dbTime / total) * 100);
  const rawClientPct = Math.round((clientHttpTime / total) * 100);
  const rawAppPct = Math.max(0, 100 - rawDbPct - rawClientPct);

  let topBottleneck: 'db' | 'app' | 'ext' | 'none' | 'jdbc' | 'java' | 'http' = 'none';
  if (rawDbPct >= 50 || jdbcPct >= 50) {
    topBottleneck = 'db';
  } else if (rawAppPct >= 50 || javaPct >= 50) {
    topBottleneck = 'app';
  } else if (rawClientPct >= 50 || httpPct >= 50) {
    topBottleneck = 'ext';
  }

  let primaryBottleneck: 'jdbc' | 'java' | 'http' | 'none' = 'none';
  if (jdbcPct >= 50) {
    primaryBottleneck = 'jdbc';
  } else if (javaPct >= 50) {
    primaryBottleneck = 'java';
  } else if (httpPct >= 50) {
    primaryBottleneck = 'http';
  }

  return {
    totalMs: total,
    dbMs: jdbcMs,
    dbPct: jdbcPct,
    clientHttpMs: rawHttpMs,
    clientPct: httpPct,
    appPct: javaPct,
    httpMs: rawHttpMs,
    httpPct,
    javaMs: rawJavaMs,
    javaPct,
    jdbcMs,
    jdbcPct,
    httpSpansCount,
    javaSpansCount,
    jdbcSpansCount,
    hasDbBottleneck: jdbcPct >= 50,
    hasJavaBottleneck: javaPct >= 50,
    hasHttpBottleneck: httpPct >= 50,
    topBottleneck,
    primaryBottleneck
  };
}

/**
 * Incorpora traces recebidos em tempo real à lista exibida: substitui versões antigas do mesmo
 * trace (ex.: o span raiz chegou depois dos filhos), mantém a ordem por início (mais recente
 * primeiro) — um trace antigo que recebeu um span atrasado não pula para o topo — e respeita o limite.
 */
export function mergeLiveTraces(current: TraceSummary[], incoming: TraceSummary[], limit: number): TraceSummary[] {
  if (incoming.length === 0) return current;
  const byId = new Map<string, TraceSummary>();
  for (const t of current) byId.set(t.traceId, t);
  for (const t of incoming) byId.set(t.traceId, t);
  return Array.from(byId.values())
    .sort((a, b) => b.startTimeUnixMs - a.startTimeUnixMs)
    .slice(0, Math.max(1, limit));
}

/**
 * Texto completo da exceção de um span para copiar (tipo, mensagem e stacktrace).
 */
export function formatSpanErrorForClipboard(span: TraceSpan): string {
  const headline = [span.exception?.type, span.exception?.message].filter(Boolean).join(': ');
  const stacktrace = span.exception?.stacktrace;
  // O stacktrace Java já começa com "Tipo: mensagem"; repetir a linha só polui a cópia
  if (stacktrace) return headline && !stacktrace.startsWith(headline) ? `${headline}\n${stacktrace}` : stacktrace;
  return headline || span.statusMessage || '';
}

/**
 * Snippets da tela "Como Conectar", montados a partir da porta real do receptor e do nome de
 * serviço configurado (`apmServiceName`), para o comando copiado já sair com os valores do usuário.
 */
export function buildApmSetupSnippets(port: number, serviceName: string = DEFAULT_APM_SERVICE_NAME) {
  const endpoint = getApmOtlpEndpoint(port);
  const agentOptions = ['-javaagent:opentelemetry-javaagent.jar', ...buildOtelJavaAgentProperties(port, serviceName)];
  const curlBody = '[{"traceId":"trace-manual-01","spanId":"span-manual-01","name":"GET /api/v1/ping","serviceName":"meu-servico","durationMs":42,"httpStatusCode":200}]';

  return {
    endpoint,
    tracesUrl: `${endpoint}/v1/traces`,
    karafDisplay: `set JAVA_OPTS=%JAVA_OPTS% ${agentOptions.join(' ^\n  ')}`,
    karafCopy: `set JAVA_OPTS=%JAVA_OPTS% ${agentOptions.join(' ')}`,
    curlDisplay: [
      `curl -X POST ${endpoint}/v1/traces \\`,
      '  -H "Content-Type: application/json" \\',
      `  -d '${curlBody}'`
    ].join('\n'),
    // Aspas duplas escapadas: o cmd.exe do Windows não reconhece aspas simples
    curlCopy: `curl -X POST ${endpoint}/v1/traces -H "Content-Type: application/json" -d "${curlBody.replace(/"/g, '\\"')}"`,
    powershellCopy: `Invoke-RestMethod -Uri "${endpoint}/v1/traces" -Method POST -ContentType "application/json" -Body '{"resourceSpans":[{"resource":{"attributes":[{"key":"service.name","value":{"stringValue":"winthor-teste"}}]},"scopeSpans":[{"spans":[{"traceId":"4bf92f3577b34da6a3ce929d0e0e4736","spanId":"00f067aa0ba902b7","name":"GET /teste-cockpit","kind":2,"startTimeUnixNano":"1711200000000000000","endTimeUnixNano":"1711200000085000000","status":{"code":1}}]}]}]}'`,
    nodeDisplay: [
      "const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');",
      'const traceExporter = new OTLPTraceExporter({',
      `  url: '${endpoint}/v1/traces',`,
      '});'
    ].join('\n')
  };
}

/**
 * Detecção de lentidão agregada no conjunto de traces (endpoints lentos, contagem de queries lentas).
 */
export interface DetectedSlowSummary {
  slowTracesCount: number;
  criticalTracesCount: number;
  slowDbTracesCount: number;
  topSlowEndpoints: Array<{ route: string; method: string; maxDurationMs: number; avgDurationMs: number; count: number }>;
}

export function detectSlowSummary(traces: TraceSummary[]): DetectedSlowSummary {
  let slowTracesCount = 0;
  let criticalTracesCount = 0;
  let slowDbTracesCount = 0;

  const endpointMap = new Map<string, { route: string; method: string; durations: number[] }>();

  for (const t of traces) {
    if (t.durationMs >= 1000) criticalTracesCount++;
    if (t.durationMs >= 400) slowTracesCount++;
    if (t.hasDatabaseQuery && t.durationMs >= 300) slowDbTracesCount++;

    const key = `${t.httpMethod || 'HTTP'} ${t.httpRoute || t.rootSpanName}`;
    let ep = endpointMap.get(key);
    if (!ep) {
      ep = { route: t.httpRoute || t.rootSpanName, method: t.httpMethod || 'HTTP', durations: [] };
      endpointMap.set(key, ep);
    }
    ep.durations.push(t.durationMs);
  }

  const slowEndpoints = Array.from(endpointMap.values())
    .map((ep) => {
      const maxDurationMs = Math.max(...ep.durations);
      const avgDurationMs = Math.round(ep.durations.reduce((a, b) => a + b, 0) / ep.durations.length);
      return { route: ep.route, method: ep.method, maxDurationMs, avgDurationMs, count: ep.durations.length };
    })
    .filter((ep) => ep.maxDurationMs >= 350 || ep.avgDurationMs >= 250)
    .sort((a, b) => b.maxDurationMs - a.maxDurationMs)
    .slice(0, 10);

  return {
    slowTracesCount,
    criticalTracesCount,
    slowDbTracesCount,
    topSlowEndpoints: slowEndpoints
  };
}

/**
 * Filtra lista de traces com suporte a busca textual, presets de estado, faixas de latência e ordenação.
 */
export function filterTraces(
  traces: TraceSummary[],
  options: {
    searchText?: string;
    preset?: FilterPreset;
    latencyBracket?: LatencyBracket;
    selectedService?: string;
    sortOrder?: TraceSortOrder;
  }
): TraceSummary[] {
  const { searchText, preset = 'ALL', latencyBracket = 'ALL', selectedService = 'ALL', sortOrder = 'time' } = options;
  const query = searchText?.trim().toLowerCase();

  const filtered = traces.filter((trace) => {
    // 1. Filtro por serviço
    if (selectedService !== 'ALL' && trace.serviceName !== selectedService) {
      return false;
    }

    // 2. Filtro por preset
    if (preset === 'ERRORS' && !trace.hasError) return false;
    if (preset === 'SLOW' && trace.durationMs < 400) return false;
    if (preset === 'DB' && !trace.hasDatabaseQuery) return false;
    if (preset === 'SLOW_QUERIES' && (!trace.hasDatabaseQuery || trace.durationMs < 250)) return false;
    if (preset === 'SLOW_ENDPOINTS' && trace.durationMs < 400) return false;

    // 3. Filtro por espectro de latência
    if (latencyBracket === 'FAST' && trace.durationMs >= 100) return false;
    if (latencyBracket === 'NORMAL' && (trace.durationMs < 100 || trace.durationMs >= 400)) return false;
    if (latencyBracket === 'SLOW' && (trace.durationMs < 400 || trace.durationMs >= 1000)) return false;
    if (latencyBracket === 'CRITICAL' && trace.durationMs < 1000) return false;

    // 4. Busca textual livre
    if (query) {
      const matchRoute = (trace.httpRoute || trace.rootSpanName || '').toLowerCase().includes(query);
      const matchTraceId = trace.traceId.toLowerCase().includes(query);
      const matchService = trace.serviceName.toLowerCase().includes(query);
      const matchMethod = (trace.httpMethod || '').toLowerCase().includes(query);
      if (!matchRoute && !matchTraceId && !matchService && !matchMethod) {
        return false;
      }
    }

    return true;
  });

  if (sortOrder === 'duration') {
    filtered.sort((a, b) => b.durationMs - a.durationMs);
  }

  return filtered;
}

/**
 * Retorna classe semântica de cor e fundo para o método HTTP compatível com tema claro e escuro.
 */
export function getMethodBadgeClass(method?: string): string {
  switch (method?.toUpperCase()) {
    case 'GET':
      return 'text-sky-700 dark:text-sky-400 bg-sky-500/15 border-sky-500/30 dark:border-sky-800/60 dark:bg-sky-950/40';
    case 'POST':
      return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30 dark:border-emerald-800/60 dark:bg-emerald-950/40';
    case 'PUT':
    case 'PATCH':
      return 'text-amber-700 dark:text-amber-400 bg-amber-500/15 border-amber-500/30 dark:border-amber-800/60 dark:bg-amber-950/40';
    case 'DELETE':
      return 'text-rose-700 dark:text-rose-400 bg-rose-500/15 border-rose-500/30 dark:border-rose-800/60 dark:bg-rose-950/40';
    default:
      return 'text-muted-foreground bg-muted/40 border-border/60';
  }
}

/**
 * Retorna classe semântica de cor para código HTTP e erro com alto contraste no claro e escuro.
 */
export function getStatusBadgeClass(code?: number, hasError?: boolean): string {
  if (hasError || (code && code >= 500)) {
    return 'text-rose-700 dark:text-rose-400 bg-rose-500/15 border-rose-500/30 dark:border-rose-800/50';
  }
  if (code && code >= 400) {
    return 'text-amber-700 dark:text-amber-400 bg-amber-500/15 border-amber-500/30 dark:border-amber-800/50';
  }
  if (code && code >= 300) {
    return 'text-sky-700 dark:text-sky-400 bg-sky-500/15 border-sky-500/30 dark:border-sky-800/50';
  }
  return 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30 dark:border-emerald-800/50';
}

/**
 * Navegação de teclado por traces (seta acima / abaixo / j / k).
 */
export function findNextTraceId(
  traces: TraceSummary[],
  currentTraceId: string | null,
  direction: 'next' | 'prev'
): string | null {
  if (traces.length === 0) return null;
  if (!currentTraceId) return traces[0].traceId;

  const currentIndex = traces.findIndex((t) => t.traceId === currentTraceId);
  if (currentIndex === -1) return traces[0].traceId;

  if (direction === 'next') {
    const nextIdx = Math.min(traces.length - 1, currentIndex + 1);
    return traces[nextIdx].traceId;
  } else {
    const prevIdx = Math.max(0, currentIndex - 1);
    return traces[prevIdx].traceId;
  }
}

/**
 * Realce simples e seguro de palavras-chave SQL para exibição em cockpit.
 * Retorna lista de spans com estilo semântico para keywords WinThor/Oracle.
 */
export function splitSqlTokens(sql: string): Array<{ text: string; isKeyword: boolean }> {
  if (!sql) return [];

  const KEYWORDS = new Set([
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
    'ON', 'GROUP', 'BY', 'ORDER', 'ASC', 'DESC', 'INSERT', 'INTO', 'VALUES',
    'UPDATE', 'SET', 'DELETE', 'IN', 'NOT', 'NULL', 'IS', 'LIKE', 'BETWEEN',
    'HAVING', 'LIMIT', 'OFFSET', 'ROWNUM', 'UNION', 'ALL', 'AS', 'CASE', 'WHEN',
    'THEN', 'ELSE', 'END', 'EXISTS', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT'
  ]);

  // As alternativas cobrem todo caractere (identificador, número, símbolo, espaço): um trecho sem
  // alternativa seria pulado pelo exec e sumiria da exibição (ex.: os números de VALUES (1, 2))
  const regex = /([A-Za-z_][A-Za-z0-9_]*|\d+|[^\sA-Za-z0-9_]+|\s+)/g;
  const tokens: Array<{ text: string; isKeyword: boolean }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(sql)) !== null) {
    const word = match[0];
    const isKeyword = KEYWORDS.has(word.toUpperCase());
    tokens.push({ text: word, isKeyword });
  }

  return tokens;
}
