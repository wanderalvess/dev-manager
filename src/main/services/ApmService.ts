import http from 'http';
import zlib from 'zlib';
import {
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
  buildTraceSummary,
  buildTraceTree,
  computePercentiles,
  aggregateServiceMetrics,
  aggregateEndpointMetrics,
  aggregateSlowQueries,
  computeDatabaseTimeRatio,
  aggregateTimeSeriesBuckets,
  generateMockTraces
} from '../utils/apmUtils';
import { decodeOtlpProtobufTraces } from '../utils/otlpProtobufUtils';

export class ApmService {
  private maxTraces: number;
  // traceId -> lista de spans
  private tracesMap = new Map<string, TraceSpan[]>();
  // traceId -> summary cacheado
  private summariesMap = new Map<string, TraceSummary>();

  // Servidor receptor HTTP embutido
  private httpServer: http.Server | null = null;
  private currentPort = 4318;
  private isListening = false;
  private lastReceiverError?: string;

  // Estatísticas do receptor
  private totalIngestedSpansCount = 0;
  private totalIngestedTracesCount = 0;

  // Callback para emitir eventos de novo trace em tempo real (IPC ou WebSocket)
  public onNewTrace?: (trace: TraceSummary) => void;

  constructor(maxTraces = 5000) {
    this.maxTraces = Math.max(500, maxTraces);
  }

  /**
   * Inicia o receptor HTTP OTLP leve (por padrão na porta 4318 da convenção OpenTelemetry).
   * Em caso de porta em uso, tenta portas alternativas ou registra aviso sem travar o app.
   */
  public async startReceiver(port = 4318): Promise<boolean> {
    if (this.httpServer && this.isListening) {
      return true;
    }

    this.currentPort = port;

    return new Promise((resolve) => {
      try {
        const server = http.createServer((req, res) => {
          // Headers CORS para suportar apps web locais instrumentadas
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, traceparent');

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

          // Rotas de ingestão OTLP e simplificadas
          const isTraceEndpoint =
            urlPath === '/v1/traces' ||
            urlPath === '/api/otlp/v1/traces' ||
            urlPath === '/api/telemetry/spans' ||
            urlPath === '/api/telemetry/traces';

          if (req.method === 'POST' && isTraceEndpoint) {
            const chunks: Buffer[] = [];
            let totalLen = 0;
            // Limita payload máximo a 25MB
            req.on('data', (chunk: Buffer) => {
              chunks.push(chunk);
              totalLen += chunk.length;
              if (totalLen > 25 * 1024 * 1024) {
                req.destroy();
              }
            });

            req.on('end', () => {
              try {
                let buffer = Buffer.concat(chunks);
                const encoding = (req.headers['content-encoding'] || '').toLowerCase();
                if (encoding === 'gzip') {
                  buffer = zlib.gunzipSync(buffer);
                } else if (encoding === 'deflate') {
                  buffer = zlib.inflateSync(buffer);
                }

                const contentType = (req.headers['content-type'] || '').toLowerCase();
                const isProtobuf =
                  contentType.includes('application/x-protobuf') ||
                  (buffer.length > 0 && buffer[0] !== 0x7b /* não começa com '{' */);

                let parsed: any;
                if (isProtobuf) {
                  parsed = decodeOtlpProtobufTraces(buffer);
                } else {
                  const rawBody = buffer.toString('utf-8');
                  parsed = JSON.parse(rawBody || '{}');
                }

                const result = this.ingestOtlpJson(parsed);

                if (isProtobuf) {
                  // Responde com Content-Type application/x-protobuf e buffer vazio (ExportTraceServiceResponse 200)
                  res.writeHead(200, { 'Content-Type': 'application/x-protobuf' });
                  res.end(Buffer.alloc(0));
                } else {
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ status: 'success', ...result }));
                }
              } catch (err: any) {
                console.warn('[ApmService] Falha ao processar payload OTLP:', err?.message);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Payload OTLP inválido', message: err?.message }));
              }
            });
            return;
          }

          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Endpoint não encontrado', url: urlPath }));
        });

        server.on('error', (err: any) => {
          this.isListening = false;
          this.lastReceiverError = err?.code === 'EADDRINUSE' ? `Porta ${this.currentPort} já em uso` : err?.message;
          console.warn(`[ApmService] Receptor OTLP na porta ${this.currentPort}: ${this.lastReceiverError}`);
          resolve(false);
        });

        server.listen(port, '127.0.0.1', () => {
          this.httpServer = server;
          this.isListening = true;
          this.lastReceiverError = undefined;
          console.log(`[ApmService] Receptor OpenTelemetry (OTLP/HTTP) ativo em http://127.0.0.1:${port}/v1/traces`);
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

  /**
   * Ingere payload JSON padrão OpenTelemetry ou simplificado.
   */
  public ingestOtlpJson(payload: any): { ingestedSpans: number; updatedTraces: number } {
    const spans = parseOtlpTracesPayload(payload);
    return this.ingestSpans(spans);
  }

  /**
   * Ingere spans já parseados no ring buffer em memória.
   */
  public ingestSpans(spans: TraceSpan[]): { ingestedSpans: number; updatedTraces: number } {
    if (!spans || spans.length === 0) {
      return { ingestedSpans: 0, updatedTraces: 0 };
    }

    const affectedTraceIds = new Set<string>();

    for (const span of spans) {
      if (!span.traceId || !span.spanId) continue;
      const tId = span.traceId;

      if (!this.tracesMap.has(tId)) {
        // Se excedeu o limite máximo, remove o trace mais antigo
        if (this.tracesMap.size >= this.maxTraces) {
          this.evictOldestTrace();
        }
        this.tracesMap.set(tId, []);
        this.totalIngestedTracesCount++;
      }

      const traceSpans = this.tracesMap.get(tId)!;
      // Substitui se o spanId já existir (ex: re-emissão de fim de span)
      const existingIdx = traceSpans.findIndex((s) => s.spanId === span.spanId);
      if (existingIdx >= 0) {
        traceSpans[existingIdx] = span;
      } else {
        traceSpans.push(span);
        this.totalIngestedSpansCount++;
      }

      affectedTraceIds.add(tId);
    }

    // Atualiza summaries dos traces afetados e notifica ouvintes
    for (const tId of affectedTraceIds) {
      const traceSpans = this.tracesMap.get(tId) || [];
      const summary = buildTraceSummary(tId, traceSpans);
      this.summariesMap.set(tId, summary);

      if (this.onNewTrace) {
        try {
          this.onNewTrace(summary);
        } catch {
          // Ignora erro em listener
        }
      }
    }

    return {
      ingestedSpans: spans.length,
      updatedTraces: affectedTraceIds.size
    };
  }

  /**
   * Remove o trace mais antigo do buffer para manter tamanho fixo.
   */
  private evictOldestTrace(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, summary] of this.summariesMap.entries()) {
      if (summary.startTimeUnixMs < oldestTime) {
        oldestTime = summary.startTimeUnixMs;
        oldestId = id;
      }
    }

    if (!oldestId && this.tracesMap.size > 0) {
      oldestId = this.tracesMap.keys().next().value || null;
    }

    if (oldestId) {
      this.tracesMap.delete(oldestId);
      this.summariesMap.delete(oldestId);
    }
  }

  /**
   * Retorna resumo geral de métricas do sistema e status do receptor.
   */
  public getOverview(filter?: ApmFilter): ObservabilityOverview {
    const traces = this.getTraces({ ...filter, limit: 1000 });
    const allSummaries = Array.from(this.summariesMap.values());

    const totalTraces = allSummaries.length;
    let totalSpans = 0;
    const allSpans: TraceSpan[] = [];
    for (const spans of this.tracesMap.values()) {
      totalSpans += spans.length;
      for (const s of spans) allSpans.push(s);
    }

    const latencies = traces.map((t) => t.durationMs);
    const percentiles = computePercentiles(latencies);

    const errorCount = traces.filter((t) => t.hasError).length;
    const errorRate = traces.length > 0 ? Math.round((errorCount / traces.length) * 1000) / 10 : 0;

    // Calcular RPS dos últimos 60 segundos
    const now = Date.now();
    const recentTraces = allSummaries.filter((t) => now - t.startTimeUnixMs <= 60_000);
    const requestsPerSecond = Math.round((recentTraces.length / 60) * 10) / 10;

    const services = aggregateServiceMetrics(traces);
    const topEndpoints = aggregateEndpointMetrics(traces).slice(0, 10);
    const slowQueries = aggregateSlowQueries(allSpans, 20);
    const dbTimePercentage = computeDatabaseTimeRatio(allSpans);
    const timeSeries = aggregateTimeSeriesBuckets(allSummaries, 15, now);

    return {
      totalTraces,
      totalSpans,
      requestsPerSecond,
      errorRate,
      avgLatencyMs: percentiles.avg,
      p50LatencyMs: percentiles.p50,
      p95LatencyMs: percentiles.p95,
      p99LatencyMs: percentiles.p99,
      services,
      topEndpoints,
      slowQueries,
      timeSeries,
      dbTimePercentage,
      receiverStatus: this.getReceiverStatus()
    };
  }

  /**
   * Retorna lista de traces com filtros aplicados (mais recentes primeiro).
   */
  public getTraces(filter?: ApmFilter): TraceSummary[] {
    let summaries = Array.from(this.summariesMap.values());

    if (filter) {
      if (filter.serviceName && filter.serviceName !== 'ALL') {
        const sTarget = filter.serviceName.toLowerCase();
        summaries = summaries.filter((t) => (t.serviceName || '').toLowerCase() === sTarget);
      }

      if (filter.hasError !== undefined) {
        summaries = summaries.filter((t) => t.hasError === filter.hasError);
      }

      if (filter.hasDatabaseQuery !== undefined) {
        summaries = summaries.filter((t) => t.hasDatabaseQuery === filter.hasDatabaseQuery);
      }

      if (filter.minDurationMs !== undefined) {
        summaries = summaries.filter((t) => t.durationMs >= filter.minDurationMs!);
      }

      if (filter.maxDurationMs !== undefined) {
        summaries = summaries.filter((t) => t.durationMs <= filter.maxDurationMs!);
      }

      if (filter.search && filter.search.trim()) {
        const query = filter.search.trim().toLowerCase();
        summaries = summaries.filter(
          (t) =>
            t.traceId.toLowerCase().includes(query) ||
            t.rootSpanName.toLowerCase().includes(query) ||
            (t.httpRoute && t.httpRoute.toLowerCase().includes(query)) ||
            (t.serviceName && t.serviceName.toLowerCase().includes(query))
        );
      }
    }

    // Ordenação mais recente primeiro
    summaries.sort((a, b) => b.startTimeUnixMs - a.startTimeUnixMs);

    const limit = filter?.limit && filter.limit > 0 ? filter.limit : 200;
    return summaries.slice(0, limit);
  }

  /**
   * Retorna os detalhes completos de um trace específico, incluindo a árvore hierárquica.
   */
  public getTraceDetails(traceId: string): TraceDetails | null {
    const spans = this.tracesMap.get(traceId);
    if (!spans || spans.length === 0) return null;

    const summary = this.summariesMap.get(traceId) || buildTraceSummary(traceId, spans);
    const rootTree = buildTraceTree(spans);

    return {
      summary,
      spans,
      rootTree
    };
  }

  /**
   * Retorna lista de serviços monitorados e suas métricas agregadas.
   */
  public getServices(): ServiceMetricsSummary[] {
    const allSummaries = Array.from(this.summariesMap.values());
    return aggregateServiceMetrics(allSummaries);
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
      bufferSize: this.tracesMap.size,
      maxBufferSize: this.maxTraces
    };
  }

  /**
   * Limpa o buffer de traces e métricas da memória.
   */
  public clear(): void {
    this.tracesMap.clear();
    this.summariesMap.clear();
    this.totalIngestedSpansCount = 0;
    this.totalIngestedTracesCount = 0;
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
