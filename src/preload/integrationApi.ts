import { ipcRenderer } from 'electron';
import type {
  IntegrationBatchTraceRequest,
  IntegrationBatchTraceResponse,
  IntegrationFlowDefinition,
  IntegrationReadinessResult,
  IntegrationTraceListItem,
  IntegrationTraceResult
} from '../shared/integrationTypes';
import type {
  WshDependenciesResponse,
  WshLayoutRequest,
  WshLayoutResponse,
  WshRoutesResponse,
  WshScheduleResponse,
  WshSearchRequest,
  WshSearchResponse
} from '../shared/wshMonitorTypes';
import type { OnlineOrderLogRequest, OnlineOrderLogResponse } from '../shared/onlineOrderLog';

/** Canais integration:* do preload (Rastreio de Integração ponta a ponta), isolados para não crescer o index.ts. */
export const integrationApi = {
  integrationCheckReadiness: (): Promise<IntegrationReadinessResult> => ipcRenderer.invoke('integration:check-readiness'),
  integrationListFlows: (): Promise<IntegrationFlowDefinition[]> => ipcRenderer.invoke('integration:list-flows'),
  integrationTraceBatch: (request: IntegrationBatchTraceRequest): Promise<IntegrationBatchTraceResponse> =>
    ipcRenderer.invoke('integration:trace-batch', request),
  integrationRefreshTrace: (id: string): Promise<IntegrationBatchTraceResponse> => ipcRenderer.invoke('integration:refresh-trace', id),
  integrationListTraces: (): Promise<IntegrationTraceListItem[]> => ipcRenderer.invoke('integration:list-traces'),
  integrationGetTrace: (id: string): Promise<IntegrationTraceResult | null> => ipcRenderer.invoke('integration:get-trace', id),
  integrationDeleteTrace: (id: string): Promise<boolean> => ipcRenderer.invoke('integration:delete-trace', id),
  integrationWshRoutes: (): Promise<WshRoutesResponse> => ipcRenderer.invoke('integration:wsh-routes'),
  integrationWshSearch: (request: WshSearchRequest): Promise<WshSearchResponse> => ipcRenderer.invoke('integration:wsh-search', request),
  integrationWshDependencies: (route: string): Promise<WshDependenciesResponse> => ipcRenderer.invoke('integration:wsh-dependencies', route),
  integrationWshLayout: (request: WshLayoutRequest): Promise<WshLayoutResponse> => ipcRenderer.invoke('integration:wsh-layout', request),
  integrationWshSchedule: (route: string): Promise<WshScheduleResponse> => ipcRenderer.invoke('integration:wsh-schedule', route),
  integrationOnlineOrders: (request: OnlineOrderLogRequest): Promise<OnlineOrderLogResponse> =>
    ipcRenderer.invoke('integration:online-orders', request)
};
