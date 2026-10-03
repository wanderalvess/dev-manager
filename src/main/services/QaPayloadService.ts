import {
  DatabaseConnectionConfig,
  QaApiFetchRequest,
  QaApiFetchResult,
  QaCorePayloadItem,
  QaCoreSearchFilter,
  QaCoreSearchResult
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { DatabaseService } from './DatabaseService';
import { buildCoreSearchSql, parseCoreJsonItem } from '../utils/qaPayloadUtils';
import { httpRequest } from '../utils/httpRequest';
import {
  validateApiFetchRequest,
  extractJsonByPath,
  formatPayloadAsPrettyJson
} from '../utils/qaApiFetchUtils';

/**
 * Serviço responsável por buscar e recuperar payloads JSON de transações
 * de integração recepcionadas na tabela PCINTEGRACAOCORE do Oracle.
 */
export class QaPayloadService {
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService
  ) {}

  /**
   * Resolve a conexão de banco a ser utilizada (preferencialmente Oracle).
   */
  private resolveConnection(connectionId?: string): DatabaseConnectionConfig | null {
    const settings = this.configService.getSettings();
    const connections = settings.databaseConnections || [];

    if (connectionId) {
      const found = connections.find((c) => c.id === connectionId);
      if (found) return this.databaseService.resolveConnectionConfig(found);
    }

    const firstOracle = connections.find((c) => c.type === 'oracle');
    if (firstOracle) return this.databaseService.resolveConnectionConfig(firstOracle);

    return connections.length > 0 ? this.databaseService.resolveConnectionConfig(connections[0]) : null;
  }

  /**
   * Executa busca na tabela PCINTEGRACAOCORE e retorna os payloads JSON encontrados.
   */
  public async searchPayloads(
    filter: QaCoreSearchFilter,
    connectionId?: string
  ): Promise<QaCoreSearchResult> {
    const conn = this.resolveConnection(connectionId);
    if (!conn) {
      return {
        success: false,
        totalFound: 0,
        items: [],
        error: 'Nenhuma conexão Oracle selecionada ou configurada no Dev Manager.'
      };
    }

    try {
      const { sql, binds } = buildCoreSearchSql(filter);
      const limit = Math.min(Math.max(1, filter.limit || 15), 50);

      const queryResult = await this.databaseService.executeQuery(conn, sql, limit, binds);

      if (!queryResult.success) {
        return {
          success: false,
          totalFound: 0,
          items: [],
          error: queryResult.error || 'Falha ao executar consulta na tabela PCINTEGRACAOCORE.'
        };
      }

      const rows = queryResult.rows || [];
      const items: QaCorePayloadItem[] = [];

      for (const row of rows) {
        // DADOSTRANSFORMADOS pode vir com casing do Oracle (DADOSTRANSFORMADOS ou dadostransformados)
        const rawContent =
          row.DADOSTRANSFORMADOS !== undefined
            ? row.DADOSTRANSFORMADOS
            : row.dadostransformados !== undefined
              ? row.dadostransformados
              : Object.values(row)[0];

        const rowId = row.ROW_ID || row.row_id || undefined;
        const parsed = parseCoreJsonItem(rawContent, rowId);
        if (parsed) {
          items.push(parsed);
        }
      }

      return {
        success: true,
        totalFound: items.length,
        items
      };
    } catch (err: any) {
      return {
        success: false,
        totalFound: 0,
        items: [],
        error: err?.message || 'Erro inesperado ao consultar payloads na PCINTEGRACAOCORE.'
      };
    }
  }

  /**
   * Executa requisição HTTP a um endpoint REST externo e recupera o payload JSON.
   */
  public async fetchPayloadFromApi(request: QaApiFetchRequest): Promise<QaApiFetchResult> {
    const validation = validateApiFetchRequest(request);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error || 'Requisição inválida.'
      };
    }

    const start = Date.now();
    const method = (request.method || 'GET').toUpperCase();
    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      ...(request.headers || {})
    };

    if (method === 'POST' && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await httpRequest(request.url.trim(), {
        method,
        headers,
        body: request.body,
        timeout: Math.min(Math.max(1000, request.timeoutMs || 15000), 60000)
      });

      const durationMs = Date.now() - start;
      const rawText = await response.text();

      let parsedData: any = rawText;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        // Mantém como rawText se não for JSON válido
      }

      if (!response.ok) {
        return {
          success: false,
          statusCode: response.status,
          durationMs,
          error: `Endpoint retornou status HTTP ${response.status} (${response.statusText}).`,
          rawJson: typeof parsedData === 'object' ? formatPayloadAsPrettyJson(parsedData) : rawText
        };
      }

      const extracted = extractJsonByPath(parsedData, request.jsonPath);
      if (extracted === undefined) {
        return {
          success: false,
          statusCode: response.status,
          durationMs,
          error: `Caminho JSON "${request.jsonPath}" não foi encontrado no retorno da API.`,
          data: parsedData,
          rawJson: formatPayloadAsPrettyJson(parsedData)
        };
      }

      return {
        success: true,
        statusCode: response.status,
        durationMs,
        data: extracted,
        rawJson: formatPayloadAsPrettyJson(parsedData),
        extractedJson: formatPayloadAsPrettyJson(extracted)
      };
    } catch (err: any) {
      return {
        success: false,
        durationMs: Date.now() - start,
        error: err?.message || 'Falha ao conectar ao endpoint da API externa.'
      };
    }
  }
}

