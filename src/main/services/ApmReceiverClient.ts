import fs from 'fs';
import {
  ApmFilter,
  ApmReceiverStatus,
  ObservabilityOverview,
  ServiceMetricsSummary,
  TraceDetails,
  TraceSummary
} from '../../shared/types';
import { httpRequest } from '../utils/httpRequest';
import { buildApmFilterQuery } from '../utils/apmUtils';
import { APM_QUERY_PATH_PREFIX, APM_QUERY_TOKEN_HEADER, ApmReceiverHandle } from './ApmService';

/** Falha ao consultar o receptor do app, com mensagem pronta para o usuário ou o assistente de IA. */
export class ApmReceiverUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApmReceiverUnavailableError';
  }
}

const NO_RECEIVER_MESSAGE =
  'Nenhum receptor APM do Hub Manager está ativo: abra o app desktop (ou rode `npm run server`) ' +
  'para receber spans OpenTelemetry e consultá-los por aqui.';

/**
 * Consulta o buffer de traces do processo dono do receptor OTLP (app desktop ou servidor web)
 * pela API de consulta que ele publica. Usado por quem não recebe spans — o servidor MCP roda em
 * outro processo, então seu próprio ApmService nunca teria dados.
 */
export class ApmReceiverClient {
  constructor(
    private readonly handleFile: string,
    private readonly timeoutMs = 3000
  ) {}

  private readHandle(): ApmReceiverHandle {
    let raw: string;
    try {
      raw = fs.readFileSync(this.handleFile, 'utf-8');
    } catch {
      throw new ApmReceiverUnavailableError(NO_RECEIVER_MESSAGE);
    }
    try {
      const parsed = JSON.parse(raw);
      if (Number.isInteger(parsed?.port) && parsed.port > 0 && typeof parsed?.token === 'string' && parsed.token) {
        return { port: parsed.port, token: parsed.token };
      }
    } catch {
      // cai na mensagem abaixo
    }
    throw new ApmReceiverUnavailableError(`${NO_RECEIVER_MESSAGE} (arquivo de acesso ${this.handleFile} ilegível)`);
  }

  private async request<T>(route: string): Promise<{ status: number; body?: T }> {
    const { port, token } = this.readHandle();
    let response;
    try {
      response = await httpRequest(`http://127.0.0.1:${port}${APM_QUERY_PATH_PREFIX}${route}`, {
        method: 'GET',
        headers: { [APM_QUERY_TOKEN_HEADER]: token, Accept: 'application/json' },
        timeout: this.timeoutMs
      });
    } catch (err: any) {
      throw new ApmReceiverUnavailableError(
        `O receptor APM do Hub Manager (porta ${port}) não respondeu (${err?.message}). ${NO_RECEIVER_MESSAGE}`
      );
    }

    if (response.status === 404) return { status: 404 };
    if (response.status === 401) {
      throw new ApmReceiverUnavailableError(
        `O receptor da porta ${port} recusou o token de acesso: outro processo pode ter reaberto o receptor. Tente novamente.`
      );
    }
    if (!response.ok) {
      throw new ApmReceiverUnavailableError(`O receptor APM da porta ${port} respondeu HTTP ${response.status}.`);
    }
    return { status: response.status, body: JSON.parse(await response.text()) as T };
  }

  private async get<T>(route: string): Promise<T> {
    const { status, body } = await this.request<T>(route);
    if (status === 404 || body === undefined) {
      // Um coletor de terceiros (ex.: OTel Collector) na porta responde 404 para as rotas do Hub Manager
      throw new ApmReceiverUnavailableError(`A porta registrada não serve a API de consulta do Hub Manager. ${NO_RECEIVER_MESSAGE}`);
    }
    return body;
  }

  getOverview(filter?: ApmFilter): Promise<ObservabilityOverview> {
    return this.get<ObservabilityOverview>(`overview${buildApmFilterQuery(filter)}`);
  }

  getTraces(filter?: ApmFilter): Promise<TraceSummary[]> {
    return this.get<TraceSummary[]>(`traces${buildApmFilterQuery(filter)}`);
  }

  async getTraceDetails(traceId: string): Promise<TraceDetails | null> {
    const { status, body } = await this.request<TraceDetails>(`traces/${encodeURIComponent(traceId)}`);
    return status === 404 ? null : (body ?? null);
  }

  getServices(): Promise<ServiceMetricsSummary[]> {
    return this.get<ServiceMetricsSummary[]>('services');
  }

  getReceiverStatus(): Promise<ApmReceiverStatus> {
    return this.get<ApmReceiverStatus>('status');
  }
}
