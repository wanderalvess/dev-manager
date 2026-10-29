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
import { lookupBatch, PdvSyncClient } from './integration/pdvSyncClient';
import { toPdvSyncSettings } from '../../shared/pdvSyncConfig';
import { TraceHistoryStore } from './integration/traceHistoryStore';
import { effectiveLayer, hubDefaultsFrom } from '../../shared/integrationInheritance';
import { buildWshSearch, toWshItem, toWshRoute, validateWshSearch, WSH_ROUTES_SQL } from './integration/wshMonitorQuery';
import {
  WSH_DEPENDENCY_PERIOD_DAYS,
  type WshDependenciesResponse,
  type WshLayoutRequest,
  type WshLayoutResponse,
  type WshRoutesResponse,
  type WshScheduleResponse,
  type WshSearchRequest,
  type WshSearchResponse
} from '../../shared/wshMonitorTypes';
import { buildDependencyQuery, dependencyFlows, toDependencies } from './integration/wshDependencyQuery';
import { buildLayoutQuery, toRouteLayouts, validateLayoutRequest } from './integration/wshLayoutQuery';
import { FLOW_STEPS_SQL, SCHEDULE_FLOWS_SQL, SCHEDULE_MAX_ROWS, SCHEDULES_SQL, toScheduleInfo } from './integration/wshScheduleQuery';
import { attachRuns } from './integration/wshExecutionQuery';
import type { OnlineOrderLogRequest, OnlineOrderLogResponse } from '../../shared/onlineOrderLog';
import { searchOrderLog } from './integration/onlineOrderLogQuery';
import { createReadinessDeps } from './integration/readinessDeps';

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

  /**
   * Camadas na ordem da cadeia, como o pré-voo e o rastreio as usam: as que ainda não foram salvas entram vazias,
   * e a camada WinThor completa o que ficou em branco com a URL, o login e a pasta do Karaf já salvos em outras telas.
   */
  public getLayers(): IntegrationLayerConfig[] {
    const settings = this.configService.getSettings();
    const defaults = hubDefaultsFrom(settings);
    return INTEGRATION_LAYER_ORDER.map((layer) =>
      effectiveLayer(settings.integrationLayers?.find((entry) => entry.layer === layer) ?? { layer }, defaults)
    );
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
    const { configService, databaseService, networkService, windowsService, httpClientService } = this;
    return createReadinessDeps({ configService, databaseService, networkService, windowsService, httpClientService });
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

  // --- Monitor do WSH: o que o WSH gravou na PCINTEGRACAOCORE, lido só do Oracle ---

  /** O WSH grava no mesmo Oracle da retaguarda: vale a conexão escolhida na camada WinThor. */
  private wshConnection() {
    const connectionId = this.getLayers().find((layer) => layer.layer === 'winthor')?.dbConnectionId;
    return connectionId ? this.configService.getSettings().databaseConnections?.find((c) => c.id === connectionId) : undefined;
  }

  private static readonly NO_WSH_CONNECTION =
    'Escolha a conexão Oracle da camada WinThor em Configurações → Integração ponta a ponta (é onde o WSH grava as integrações).';

  /** Rotas de busca que já gravaram alguma integração, para o filtro do monitor. */
  public async listWshRoutes(): Promise<WshRoutesResponse> {
    const connection = this.wshConnection();
    if (!connection) return { success: false, error: IntegrationTraceService.NO_WSH_CONNECTION };
    const result = await this.databaseService.executeQuery(connection, WSH_ROUTES_SQL, 500);
    if (!result.success) return { success: false, error: result.error || 'Falha ao listar as rotas do WSH.' };
    return { success: true, routes: (result.rows ?? []).map(toWshRoute) };
  }

  /** Integrações do WSH filtradas por rota, trecho do IDEXTERNO, status e período. Só leitura. */
  public async searchWsh(request: Partial<WshSearchRequest>): Promise<WshSearchResponse> {
    const validation = validateWshSearch(request);
    if (!validation.ok) return { success: false, error: validation.error };
    const connection = this.wshConnection();
    if (!connection) return { success: false, error: IntegrationTraceService.NO_WSH_CONNECTION };
    const { sql, binds } = buildWshSearch(validation.value, Date.now());
    const result = await this.databaseService.executeQuery(connection, sql, validation.value.limit, binds);
    if (!result.success) return { success: false, error: result.error || 'Falha ao consultar a PCINTEGRACAOCORE.' };
    return {
      success: true,
      items: (result.rows ?? []).map(toWshItem),
      limit: validation.value.limit,
      lookbackHours: validation.value.lookbackHours
    };
  }

  /** Última integração de cada fluxo do qual a rota depende (catálogo de fluxos do WSH). Rota sem dependências volta vazia. */
  public async checkWshDependencies(routeName: string): Promise<WshDependenciesResponse> {
    const { flow, dependencies } = dependencyFlows(String(routeName ?? ''));
    const empty = { success: true as const, ...(flow ? { flowId: flow.id } : {}), dependencies: [], periodDays: WSH_DEPENDENCY_PERIOD_DAYS };
    if (dependencies.length === 0) return empty;
    const connection = this.wshConnection();
    if (!connection) return { success: false, error: IntegrationTraceService.NO_WSH_CONNECTION };
    const { sql, binds } = buildDependencyQuery(dependencies, Date.now());
    const result = await this.databaseService.executeQuery(connection, sql, dependencies.length, binds);
    if (!result.success) return { success: false, error: result.error || 'Falha ao consultar as dependências do fluxo.' };
    return { ...empty, dependencies: toDependencies(dependencies, result.rows ?? []) };
  }

  /** Nível 2 do "Como resolver": as regras do JOLT das rotas do item que montam os campos recusados. Só leitura. */
  public async explainWshLayout(request: Partial<WshLayoutRequest>): Promise<WshLayoutResponse> {
    const validation = validateLayoutRequest(request);
    if (!validation.ok) return { success: false, error: validation.error };
    const connection = this.wshConnection();
    if (!connection) return { success: false, error: IntegrationTraceService.NO_WSH_CONNECTION };
    const { sql, binds } = buildLayoutQuery(validation.value.routes);
    const result = await this.databaseService.executeQuery(connection, sql, validation.value.routes.length, binds);
    if (!result.success) return { success: false, error: result.error || 'Falha ao ler o layout das rotas do WSH.' };
    return { success: true, layouts: toRouteLayouts(validation.value, result.rows ?? []) };
  }

  /** Fluxos que usam a rota, passos ativos e o intervalo do agendamento como estão neste ambiente. Só leitura. */
  public async checkWshSchedule(routeName: string): Promise<WshScheduleResponse> {
    const route = String(routeName ?? '').trim();
    if (!route) return { success: false, error: 'Informe a rota.' };
    const connection = this.wshConnection();
    if (!connection) return { success: false, error: IntegrationTraceService.NO_WSH_CONNECTION };
    const run = (sql: string) => this.databaseService.executeQuery(connection, sql, SCHEDULE_MAX_ROWS);
    const [steps, schedules, links] = await Promise.all([run(FLOW_STEPS_SQL), run(SCHEDULES_SQL), run(SCHEDULE_FLOWS_SQL)]);
    const failed = [steps, schedules, links].find((result) => !result.success);
    if (failed) return { success: false, error: failed.error || 'Falha ao ler o agendamento do WSH.' };
    const info = toScheduleInfo(route, steps.rows ?? [], schedules.rows ?? [], links.rows ?? []);
    return { success: true, info: await attachRuns(info, (sql, maxRows, binds) => this.databaseService.executeQuery(connection, sql, maxRows, binds)) };
  }

  // --- Online do PDV: o que o WTA gravou ao receber os pedidos do PDVOmni, no mesmo Oracle ---

  /** Linhas da PCLOGPEDIDOAPI por pedido, status e período: inclusão, alteração e cancelamento, aceito ou rejeitado. Só leitura. */
  public searchOnlineOrders(request: Partial<OnlineOrderLogRequest>): Promise<OnlineOrderLogResponse> {
    const connection = this.wshConnection();
    if (!connection) return Promise.resolve({ success: false, error: IntegrationTraceService.NO_WSH_CONNECTION });
    return searchOrderLog(request, (sql, maxRows, binds) => this.databaseService.executeQuery(connection, sql, maxRows, binds), Date.now());
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
