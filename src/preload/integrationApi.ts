import { ipcRenderer } from 'electron';
import type {
  IntegrationBatchTraceRequest,
  IntegrationBatchTraceResponse,
  IntegrationFlowDefinition,
  IntegrationReadinessResult,
  IntegrationTraceListItem,
  IntegrationTraceResult
} from '../shared/integrationTypes';

/** Canais integration:* do preload (Rastreio de Integração ponta a ponta), isolados para não crescer o index.ts. */
export const integrationApi = {
  integrationCheckReadiness: (): Promise<IntegrationReadinessResult> => ipcRenderer.invoke('integration:check-readiness'),
  integrationListFlows: (): Promise<IntegrationFlowDefinition[]> => ipcRenderer.invoke('integration:list-flows'),
  integrationTraceBatch: (request: IntegrationBatchTraceRequest): Promise<IntegrationBatchTraceResponse> =>
    ipcRenderer.invoke('integration:trace-batch', request),
  integrationRefreshTrace: (id: string): Promise<IntegrationBatchTraceResponse> => ipcRenderer.invoke('integration:refresh-trace', id),
  integrationListTraces: (): Promise<IntegrationTraceListItem[]> => ipcRenderer.invoke('integration:list-traces'),
  integrationGetTrace: (id: string): Promise<IntegrationTraceResult | null> => ipcRenderer.invoke('integration:get-trace', id),
  integrationDeleteTrace: (id: string): Promise<boolean> => ipcRenderer.invoke('integration:delete-trace', id)
};
