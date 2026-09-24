import http from 'http';
import zlib from 'zlib';
import { promisify } from 'util';
import {
  DEFAULT_APM_OTLP_PORT,
  TraceSpan,
  TraceSummary,
  TraceDetails,
  ApmFilter,
  ApmReceiverStatus,
  ObservabilityOverview,
  ServiceMetricsSummary
} from '../../shared/types';
import {
  parseOtlpTracesPayload,
  decodeOtlpTraceBody,
  OtlpBodyFormat,
  buildTraceSummary,
  buildTraceTree,
  computeTraceTimeBreakdown,
  computePercentiles,
  matchesTraceScope,
  filterTraceSummaries,
  aggregateServiceMetrics,
  aggregateEndpointMetrics,
  aggregateSlowQueries,
  computeDatabaseTimeRatio,
  aggregateTimeSeriesBuckets,
  generateMockTraces
} from '../utils/apmUtils';

const gunzipAsync = promisify(zlib.gunzip);
const inflateAsync = promisify(zlib.inflate);

/** Limite do corpo de um export OTLP, antes e depois de descomprimir. */
export const MAX_OTLP_BODY_BYTES = 25 * 1024 * 1024;

/** Rotas de ingestão aceitas tanto pelo receptor embutido quanto pelo servidor web. */
export const OTLP_TRACE_INGEST_PATHS = ['/v1/traces', '/api/otlp/v1/traces', '/api/telemetry/spans', '/api/telemetry/traces'];

/** Falha de ingestão com o status HTTP que o exportador deve receber. */
export class ApmIngestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = 'ApmIngestError';
  }
}

export interface OtlpIngestResult {
  format: OtlpBodyFormat;
  ingestedSpans: number;
  updatedTraces: number;
}

export interface ApmServiceOptions {
  /** Teto de spans somando todos os traces do buffer (protege a memória do processo principal). */
  maxSpans?: number;
  /** Teto de spans por trace; spans excedentes são descartados e contabilizados em `droppedSpans`. */
  maxSpansPerTrace?: number;
}

interface TraceEntry {
  spans: TraceSpan[];
  spanIndexById: Map<string, number>;
  summary: TraceSummary;
}

export class ApmService {
  private readonly maxTraces: number;
  private readonly maxSpans: number;
  private readonly maxSpansPerTrace: number;
  // Map preserva a ordem de inserção e cada trace atualizado é reinserido no fim:
  // o primeiro da iteração é sempre o menos recentemente atualizado (despejo LRU em O(1))
  private traces = new Map<string, TraceEntry>();
  private bufferedSpanCount = 0;

  // Servidor receptor HTTP embutido
  private httpServer: http.Server | null = null;
  private currentPort = DEFAULT_APM_OTLP_PORT;
  private isListening = false;
  private lastReceiverError?: string;

  // Estatísticas do receptor
  private totalIngestedSpansCount = 0;
  private totalIngestedTracesCount = 0;
  private droppedSpansCount = 0;

  // Callback para emitir eventos de novo trace em tempo real (IPC ou WebSocket)
  public onNewTrace?: (trace: TraceSummary) => void;

  constructor(maxTraces = 5000, options: ApmServiceOptions = {}) {
    this.maxTraces = Math.max(500, maxTraces);
    this.maxSpans = Math.max(1, options.maxSpans ?? 100_000);
    this.maxSpansPerTrace = Math.max(1, options.maxSpansPerTrace ?? 2_000);
  }

  /**
   * Inicia o receptor HTTP OTLP leve (por padrão na porta 4318 da convenção OpenTelemetry).
   * Se a porta estiver em uso (ex.: um OTel Collector, Jaeger ou SigNoz local), registra o erro
   * no status do receptor sem travar o app. Porta 0 escolhe uma porta livre.
   */
  public async startReceiver(port = DEFAULT_APM_OTLP_PORT, host = '127.0.0.1'): Promise<boolean> {
    if (this.httpServer && this.isListening) {
      return true;
    }

    this.currentPort = port;

    return new Promise((resolve) => {
      try {
        const server = http.createServer((req, res) => this.handleReceiverRequest(req, res));

        server.on('error', (err: any) => {
          this.isListening = false;
          this.lastReceiverError = err?.code === 'EADDRINUSE' ? `Porta ${this.currentPort} já em uso` : err?.message;
          console.warn(`[ApmService] Receptor OTLP na porta ${this.currentPort}: ${this.lastReceiverError}`);
          resolve(false);
        });

        server.listen(port, host, () => {
          const address = server.address();
          if (address && typeof address === 'object') this.currentPort = address.port;
          this.httpServer = server;
          this.isListening = true;
          this.lastReceiverError = undefined;
          console.log(`[ApmService] Receptor OpenTelemetry (OTLP/HTTP) ativo em http://${host}:${this.currentPort}/v1/traces`);
          resolve(true);
        });
      } catch (err: any) {
        this.isListening = false;
        this.lastReceiverError = err?.message;
        resolve(false);
      }
    });
  }

  /**
   * Encerra o listener HTTP.
   */
  public async stopReceiver(): Promise<void> {
    if (!this.httpServer) return;
    return new Promise((resolve) => {
      this.httpServer?.close(() => {
        this.httpServer = null;
        this.isListening = false;
        resolve();
      });
    });
  }

  private handleReceiverRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // Headers CORS para suportar apps web locais instrumentadas
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Content-Encoding, Authorization, x-api-key, traceparent');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const urlPath = req.url?.split('?')[0] || '';

    // Rota de Healthcheck do receptor
    if (req.method === 'GET' && (urlPath === '/' || urlPath === '/health')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'DevManager-APM-Receiver', port: this.currentPort }));
      return;
    }

    if (req.method === 'POST' && OTLP_TRACE_INGEST_PATHS.includes(urlPath)) {
      this.handleTraceExport(req, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint não encontrado', url: urlPath }));
  }

  private handleTraceExport(req: http.IncomingMessage, res: http.ServerResponse): void {
    const declaredLength = Number(req.headers['content-length']);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_OTLP_BODY_BYTES) {
      this.rejectOversizedPayload(req, res);
      return;
    }

    const chunks: Buffer[] = [];
    let totalLen = 0;
    let rejected = false;

    req.on('data', (chunk: Buffer) => {
      if (rejected) return;
      totalLen += chunk.length;
      if (totalLen > MAX_OTLP_BODY_BYTES) {
        rejected = true;
        chunks.length = 0;
        this.rejectOversizedPayload(req, res);
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (rejected) return;
      const contentType = req.headers['content-type'];
      const contentEncoding = req.headers['content-encoding'];
      this.ingestOtlpBody(Buffer.concat(chunks), contentType, Array.isArray(contentEncoding) ? contentEncoding[0] : contentEncoding)
        .then((result) => {
          if (result.format === 'protobuf') {
            // ExportTraceServiceResponse vazio = sucesso total no OTLP/Protobuf
            res.writeHead(200, { 'Content-Type': 'application/x-protobuf' });
            res.end(Buffer.alloc(0));
          } else {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'success', ingestedSpans: result.ingestedSpans, updatedTraces: result.updatedTraces }));
          }
        })
        .catch((err: any) => {
          const statusCode = err instanceof ApmIngestError ? err.statusCode : 400;
          console.warn('[ApmService] Falha ao processar payload OTLP:', err?.message);
          res.writeHead(statusCode, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Payload OTLP inválido', message: err?.message }));
        });
    });

    req.on('error', () => {
      // Cliente abortou o envio; não há a quem responder
    });
  }

  // 413 é não-retentável para os exportadores OTLP; derrubar a conexão sem resposta faria o
  // exportador reenviar o mesmo lote gigante em loop.
  private rejectOversizedPayload(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(413, { 'Content-Type': 'application/json', Connection: 'close' });
    res.end(
      JSON.stringify({ error: `Payload OTLP excede o limite de ${MAX_OTLP_BODY_BYTES / (1024 * 1024)}MB` }),
      () => req.destroy()
    );
  }

  /**
   * Decodifica (gzip/deflate, JSON ou Protobuf) e ingere o corpo de um export OTLP/HTTP.
   * Usado pelo receptor embutido e pelas rotas do servidor web. Quem já descomprimiu o corpo
   * (ex.: `express.raw`) não deve repassar `contentEncoding`.
   */
  public async ingestOtlpBody(body: Buffer, contentType?: string, contentEncoding?: string): Promise<OtlpIngestResult> {
    const decompressed = await this.decompressOtlpBody(body, contentEncoding);

    let decoded: { format: OtlpBodyFormat; payload: unknown };
    try {
      decoded = decodeOtlpTraceBody(decompressed, contentType);
    } catch (err: any) {
      throw new ApmIngestError(err?.message || 'Payload OTLP inválido', 400);
    }

    return { format: decoded.format, ...this.ingestOtlpJson(decoded.payload) };
  }

  private async decompressOtlpBody(body: Buffer, contentEncoding?: string): Promise<Buffer> {
    const encoding = (contentEncoding || '').trim().toLowerCase();
    if (!encoding || encoding === 'identity') return body;

    // Teto na saída: sem ele, alguns KB de gzip viram GBs em memória (zip bomb)
    const zlibOptions = { maxOutputLength: MAX_OTLP_BODY_BYTES };
    try {
      if (encoding === 'gzip' || encoding === 'x-gzip') return await gunzipAsync(body, zlibOptions);
      if (encoding === 'deflate') return await inflateAsync(body, zlibOptions);
    } catch (err: any) {
      if (err?.code === 'ERR_BUFFER_TOO_LARGE') {
        throw new ApmIngestError(`Payload OTLP descomprimido excede ${MAX_OTLP_BODY_BYTES / (1024 * 1024)}MB`, 413);
      }
      throw new ApmIngestError(`Falha ao descomprimir payload (${encoding}): ${err?.message}`, 400);
    }
    throw new ApmIngestError(`Content-Encoding não suportado: ${encoding}`, 415);
  }

  /**
   * Ingere payload JSON padrão OpenTelemetry ou simplificado.
   */
  public ingestOtlpJson(payload: any): { ingestedSpans: number; updatedTraces: number } {
    const spans = parseOtlpTracesPayload(payload);
    return this.ingestSpans(spans);
  }

  /**
   * Ingere spans já parseados no buffer em memória.
   */
  public ingestSpans(spans: TraceSpan[]): { ingestedSpans: number; updatedTraces: number } {
    if (!spans || spans.length === 0) {
      return { ingestedSpans: 0, updatedTraces: 0 };
    }

    const affectedTraceIds = new Set<string>();
    let ingested = 0;

    for (const span of spans) {
      if (!span?.traceId || !span.spanId) continue;
      const tId = span.traceId;

      let entry = this.traces.get(tId);
      if (entry) {
        this.traces.delete(tId);
        this.traces.set(tId, entry);
      } else {
        entry = { spans: [], spanIndexById: new Map(), summary: buildTraceSummary(tId, []) };
        this.traces.set(tId, entry);
        this.totalIngestedTracesCount++;
      }

      // Substitui se o spanId já existir (ex: re-emissão de fim de span)
      const existingIdx = entry.spanIndexById.get(span.spanId);
      if (existingIdx !== undefined) {
        entry.spans[existingIdx] = span;
      } else if (entry.spans.length >= this.maxSpansPerTrace) {
        this.droppedSpansCount++;
        continue;
      } else {
        entry.spanIndexById.set(span.spanId, entry.spans.length);
        entry.spans.push(span);
        this.bufferedSpanCount++;
        this.totalIngestedSpansCount++;
      }

      ingested++;
      affectedTraceIds.add(tId);
    }

    this.evictBeyondLimits();

    // Atualiza summaries dos traces afetados e notifica ouvintes
    for (const tId of affectedTraceIds) {
      const entry = this.traces.get(tId);
      if (!entry) continue; // despejado neste mesmo lote por exceder os limites
      entry.summary = buildTraceSummary(tId, entry.spans);

      if (this.onNewTrace) {
        try {
          this.onNewTrace(entry.summary);
        } catch {
          // Ignora erro em listener
        }
      }
    }

    return {
      ingestedSpans: ingested,
      updatedTraces: affectedTraceIds.size
    };
  }

  private evictBeyondLimits(): void {
    while (this.traces.size > this.maxTraces || (this.bufferedSpanCount > this.maxSpans && this.traces.size > 1)) {
      const leastRecentId = this.traces.keys().next().value as string | undefined;
      if (leastRecentId === undefined) break;
      this.bufferedSpanCount -= this.traces.get(leastRecentId)?.spans.length || 0;
      this.traces.delete(leastRecentId);
    }
  }

  private scopedEntries(filter?: ApmFilter): TraceEntry[] {
    const entries: TraceEntry[] = [];
    for (const entry of this.traces.values()) {
      if (matchesTraceScope(entry.summary, filter)) entries.push(entry);
    }
    return entries;
  }

  /**
   * Retorna resumo geral de métricas do sistema e status do receptor.
   * Só o escopo do filtro (serviço e janela de tempo) é aplicado, a todas as métricas por igual.
   */
  public getOverview(filter?: ApmFilter): ObservabilityOverview {
    const entries = this.scopedEntries(filter);
    const summaries = entries.map((e) => e.summary);

    let totalSpans = 0;
    const scopedSpans: TraceSpan[] = [];
    for (const entry of entries) {
      totalSpans += entry.spans.length;
      for (const s of entry.spans) scopedSpans.push(s);
    }

    const percentiles = computePercentiles(summaries.map((t) => t.durationMs));

    const errorCount = summaries.filter((t) => t.hasError).length;
    const errorRate = summaries.length > 0 ? Math.round((errorCount / summaries.length) * 1000) / 10 : 0;

    // Calcular RPS dos últimos 60 segundos
    const now = Date.now();
    const recentCount = summaries.filter((t) => now - t.startTimeUnixMs <= 60_000).length;
    const requestsPerSecond = Math.round((recentCount / 60) * 10) / 10;

    return {
      totalTraces: summaries.length,
      totalSpans,
      requestsPerSecond,
      errorRate,
      avgLatencyMs: percentiles.avg,
      p50LatencyMs: percentiles.p50,
      p95LatencyMs: percentiles.p95,
      p99LatencyMs: percentiles.p99,
      services: aggregateServiceMetrics(summaries),
      topEndpoints: aggregateEndpointMetrics(summaries).slice(0, 10),
      slowQueries: aggregateSlowQueries(scopedSpans, 20),
      timeSeries: aggregateTimeSeriesBuckets(summaries, 15, now),
      dbTimePercentage: computeDatabaseTimeRatio(scopedSpans),
      receiverStatus: this.getReceiverStatus()
    };
  }

  /**
   * Retorna lista de traces com filtros aplicados (mais recentes primeiro).
   */
  public getTraces(filter?: ApmFilter): TraceSummary[] {
    const summaries = filterTraceSummaries(
      Array.from(this.traces.values(), (e) => e.summary),
      filter
    );

    // Ordenação mais recente primeiro
    summaries.sort((a, b) => b.startTimeUnixMs - a.startTimeUnixMs);

    const limit = filter?.limit && filter.limit > 0 ? filter.limit : 200;
    return summaries.slice(0, limit);
  }

  /**
   * Retorna os detalhes completos de um trace específico, incluindo a árvore hierárquica
   * e a decomposição do tempo entre banco, chamadas externas e aplicação.
   */
  public getTraceDetails(traceId: string): TraceDetails | null {
    const entry = this.traces.get(traceId);
    if (!entry || entry.spans.length === 0) return null;

    return {
      summary: entry.summary,
      spans: entry.spans,
      rootTree: buildTraceTree(entry.spans),
      breakdown: computeTraceTimeBreakdown(entry.spans, entry.summary.durationMs)
    };
  }

  /**
   * Retorna lista de serviços monitorados e suas métricas agregadas.
   */
  public getServices(): ServiceMetricsSummary[] {
    return aggregateServiceMetrics(Array.from(this.traces.values(), (e) => e.summary));
  }

  /**
   * Retorna o status operacional do receptor OTLP.
   */
  public getReceiverStatus(): ApmReceiverStatus {
    return {
      listening: this.isListening,
      port: this.currentPort,
      error: this.lastReceiverError,
      totalIngestedSpans: this.totalIngestedSpansCount,
      totalIngestedTraces: this.totalIngestedTracesCount,
      bufferSize: this.traces.size,
      maxBufferSize: this.maxTraces,
      droppedSpans: this.droppedSpansCount
    };
  }

  /**
   * Limpa o buffer de traces e métricas da memória.
   */
  public clear(): void {
    this.traces.clear();
    this.bufferedSpanCount = 0;
    this.totalIngestedSpansCount = 0;
    this.totalIngestedTracesCount = 0;
    this.droppedSpansCount = 0;
  }

  /**
   * Gera e ingere um lote de dados de demonstração realistas.
   */
  public generateDemoData(): { generatedSpans: number; generatedTraces: number } {
    const mockSpans = generateMockTraces();
    const res = this.ingestSpans(mockSpans);
    return {
      generatedSpans: res.ingestedSpans,
      generatedTraces: res.updatedTraces
    };
  }
}
