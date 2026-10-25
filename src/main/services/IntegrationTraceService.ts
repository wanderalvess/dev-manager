import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  INTEGRATION_LAYER_ORDER,
  type IntegrationBatchTraceRequest,
  type IntegrationBatchTraceResponse,
  type IntegrationLayerConfig,
  type IntegrationLayerReadiness,
  type IntegrationReadinessResult,
  type IntegrationTraceListItem,
  type IntegrationTraceResult
} from '../../shared/integrationTypes';
import type { ApmFilter, TraceSummary } from '../../shared/types';
import { checkPortOpen } from '../utils/network';
import { isInsideDir, isLogFilePath } from '../utils/security';
import { getAppDataDir, type ConfigService } from './ConfigService';
import type { DatabaseService } from './DatabaseService';
import type { HttpClientService } from './HttpClientService';
import type { LogWatcherService } from './LogWatcherService';
import type { NetworkService } from './NetworkService';
import type { WindowsService } from './WindowsService';
import { validateBatchRequest } from '../../shared/integrationBatchRequest';
import { runBatchTrace, type BatchTraceDeps } from './integration/batchTrace';
import { runPlannedCheck, type ReadinessDeps } from './integration/readinessChecks';
import { deriveLayerStatus, planLayerChecks } from './integration/readinessPlan';
import { checkPdvSyncLogin, lookupBatch, PdvSyncClient } from './integration/pdvSyncClient';
import { toPdvSyncSettings } from '../../shared/pdvSyncConfig';
import { TraceHistoryStore } from './integration/traceHistoryStore';

/**
 * Fonte dos traces do APM. No app e no servidor web é o próprio `ApmService` (síncrono); no MCP, que
 * roda em outro processo, é o `ApmReceiverClient` (assíncrono). O service aceita os dois.
 */
export interface ApmTraceSource {
  getTraces: (filter?: ApmFilter) => TraceSummary[] | Promise<TraceSummary[]>;
}

export interface IntegrationTraceExtras {
  logWatcherService: Pick<LogWatcherService, 'readLastLines'>;
  apmTraces: ApmTraceSource;
}

/** Quantas linhas do fim de cada log são lidas para procurar o lote (o leitor ainda limita a 512 KB). */
const LOG_LINES_TO_SCAN = 5000;

/**
 * Rastreio de Integração ponta a ponta (decisão 0003): WinThor → WSH → CH → PDV.
 * Fase 1: pré-voo das camadas. Fase parcial: rastreio de um lote por SQL, logs e APM, sem a API
 * do CH. Só lê: as consultas de evidência são recusadas se escreverem.
 *
 * Sem estado em memória: tudo vem do `config.json` e o histórico vai para arquivo, então o mesmo
 * service roda igual no app, no servidor web e no MCP sem disputar recurso com ninguém.
 */
export class IntegrationTraceService {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    private readonly networkService: NetworkService,
    private readonly windowsService: WindowsService,
    private readonly httpClientService: HttpClientService,
    private readonly extras: IntegrationTraceExtras
  ) {}

  /** Camadas na ordem da cadeia; as que ainda não foram salvas entram vazias. */
  public getLayers(): IntegrationLayerConfig[] {
    const saved = this.configService.getSettings().integrationLayers;
    return INTEGRATION_LAYER_ORDER.map((layer) => saved?.find((entry) => entry.layer === layer) ?? { layer });
  }

  /** Confere cada camada configurada. As camadas (e as verificações dentro delas) rodam em paralelo. */
  public async checkReadiness(): Promise<IntegrationReadinessResult> {
    const deps = this.createReadinessDeps();
    const layers = await Promise.all(this.getLayers().map((layer) => this.checkLayer(layer, deps)));
    return { checkedAt: Date.now(), layers };
  }

  private async checkLayer(layer: IntegrationLayerConfig, deps: ReadinessDeps): Promise<IntegrationLayerReadiness> {
    const checks = await Promise.all(planLayerChecks(layer).map((planned) => runPlannedCheck(planned, deps)));
    return { layer: layer.layer, status: deriveLayerStatus(checks), checks };
  }

  private createReadinessDeps(): ReadinessDeps {
    return {
      getServiceState: (name) => this.windowsService.getServiceStatus(name),
      isProcessRunning: (name) => this.windowsService.isProcessRunning(name),
      isPortOpen: (host, port) => checkPortOpen(port, host, 1500),
      checkHealth: (url) => this.networkService.checkHttpHealth(url, 5000),
      testDb: async (connectionId) => {
        const connection = this.configService.getSettings().databaseConnections?.find((c) => c.id === connectionId);
        return connection ? this.databaseService.testConnection(connection) : null;
      },
      loginWinthor: (url, user, password) =>
        this.httpClientService.loginWinThor({ loginUrl: url, login: user, senha: password }),
      loginPdvSync: (credentials) => checkPdvSyncLogin(credentials),
      statLog: async (filePath) => {
        try {
          const stat = await fs.promises.stat(filePath);
          return { exists: stat.isFile(), modifiedAt: stat.mtimeMs, sizeBytes: stat.size };
        } catch {
          return { exists: false };
        }
      }
    };
  }

  // --- Rastreio parcial de um lote ---

  /** Os fluxos ativos, para a tela, a API e o MCP escolherem o que rastrear. */
  public listFlows() {
    return (this.configService.getSettings().integrationFlows ?? []).filter((flow) => flow.enabled !== false);
  }

  /** Rastreia um lote já executado e guarda o resultado no histórico. Entrada inválida volta como erro legível, nunca exceção. */
  public traceBatch(request: Partial<IntegrationBatchTraceRequest>): Promise<IntegrationBatchTraceResponse> {
    return this.runAndSave(request);
  }

  /**
   * Reconsulta um rastreio do histórico (modo ao vivo): mesmo lote e parâmetros, mesmo id e uma única tentativa no banco
   * do PDV. Sobrescreve a entrada em vez de criar outra, e não passa pelas métricas de uso (é acompanhamento, não um uso novo).
   */
  public async refreshTrace(id: string): Promise<IntegrationBatchTraceResponse> {
    const previous = await this.history().get(id);
    if (!previous) return { success: false, error: 'Rastreio não encontrado no histórico.' };
    return this.runAndSave(
      {
        flowId: previous.flowId,
        batchNumber: previous.batchNumber,
        lookbackMinutes: previous.request?.lookbackMinutes,
        branchId: previous.request?.branchId
      },
      previous.id
    );
  }

  private async runAndSave(request: Partial<IntegrationBatchTraceRequest>, refreshId?: string): Promise<IntegrationBatchTraceResponse> {
    const validation = validateBatchRequest(request);
    if (!validation.ok) return { success: false, error: validation.error };

    const flow = this.listFlows().find((entry) => entry.id === validation.value.flowId);
    if (!flow) return { success: false, error: 'Fluxo não encontrado ou desativado em Configurações → Integração ponta a ponta.' };

    const layers = Object.fromEntries(this.getLayers().map((layer) => [layer.layer, layer]));
    const trace = await runBatchTrace(
      { request: validation.value, flow, layers, ...(refreshId ? { refresh: { id: refreshId } } : {}) },
      this.createBatchDeps()
    );
    try {
      await this.history().save(trace);
    } catch (error) {
      trace.notes = [...(trace.notes ?? []), `O rastreio não pôde ser salvo no histórico: ${(error as Error).message}`];
    }
    return { success: true, trace };
  }

  private createBatchDeps(): BatchTraceDeps {
    return {
      now: () => Date.now(),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      newId: () => `t-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`,
      runQuery: async (connectionId, sql, binds) => {
        const connection = this.configService.getSettings().databaseConnections?.find((c) => c.id === connectionId);
        if (!connection) return null;
        const result = await this.databaseService.executeQuery(connection, sql, 200, binds);
        return { success: result.success, rows: result.rows, error: result.error };
      },
      getTraces: async (filter) => this.extras.apmTraces.getTraces(filter),
      lookupPdvSync: async (batchNumber, branchId) => {
        // `null` avisa o rastreio que a camada CH não tem o PDVSync configurado por inteiro
        const settings = toPdvSyncSettings(this.getLayers().find((layer) => layer.layer === 'ch'));
        return settings ? lookupBatch(new PdvSyncClient(settings.credentials, settings.target), batchNumber, branchId) : null;
      },
      readLogLines: async (filePath) => {
        // Mesma regra do pré-voo e do visualizador de logs: só arquivo de log, nunca a pasta de dados do app (config.json e chave)
        if (!isLogFilePath(filePath) || isInsideDir(filePath, getAppDataDir()) || !fs.existsSync(filePath)) return null;
        return (await this.extras.logWatcherService.readLastLines(filePath, LOG_LINES_TO_SCAN)).lines;
      }
    };
  }

  // --- Histórico ---

  private history(): TraceHistoryStore {
    return new TraceHistoryStore(path.join(path.dirname(this.configService.getConfigFilePath()), 'integration-traces'));
  }

  public listTraces(): Promise<IntegrationTraceListItem[]> {
    return this.history().list();
  }

  public getTrace(id: string): Promise<IntegrationTraceResult | null> {
    return this.history().get(id);
  }

  public deleteTrace(id: string): Promise<boolean> {
    return this.history().remove(id);
  }
}
