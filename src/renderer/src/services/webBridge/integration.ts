import type {
  IntegrationBatchTraceRequest,
  IntegrationBatchTraceResponse,
  IntegrationFlowDefinition,
  IntegrationReadinessResult,
  IntegrationTraceListItem,
  IntegrationTraceResult
} from '../../../../shared/integrationTypes';
import type {
  WshDependenciesResponse,
  WshLayoutRequest,
  WshLayoutResponse,
  WshRoutesResponse,
  WshSearchRequest,
  WshSearchResponse
} from '../../../../shared/wshMonitorTypes';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST) dos canais: Rastreio de Integração ponta a ponta. */
export function createIntegrationApi({ apiFetch }: BridgeDeps) {
  const post = <T>(url: string, body: unknown) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
  return {
    integrationCheckReadiness: (): Promise<IntegrationReadinessResult> => post('/api/integration/readiness', {}),

    integrationListFlows: (): Promise<IntegrationFlowDefinition[]> => apiFetch('/api/integration/flows'),

    integrationTraceBatch: (request: IntegrationBatchTraceRequest): Promise<IntegrationBatchTraceResponse> =>
      post('/api/integration/trace', request),

    integrationRefreshTrace: (id: string): Promise<IntegrationBatchTraceResponse> =>
      post(`/api/integration/traces/${encodeURIComponent(id)}/refresh`, {}),

    integrationListTraces: (): Promise<IntegrationTraceListItem[]> => apiFetch('/api/integration/traces'),

    integrationGetTrace: async (id: string): Promise<IntegrationTraceResult | null> => {
      try {
        return await apiFetch<IntegrationTraceResult>(`/api/integration/traces/${encodeURIComponent(id)}`);
      } catch {
        return null;
      }
    },

    integrationDeleteTrace: async (id: string): Promise<boolean> => {
      const result = await apiFetch<{ success: boolean }>(`/api/integration/traces/${encodeURIComponent(id)}`, { method: 'DELETE' });
      return result.success;
    },

    integrationWshRoutes: (): Promise<WshRoutesResponse> => apiFetch('/api/integration/wsh/routes'),

    integrationWshSearch: (request: WshSearchRequest): Promise<WshSearchResponse> => post('/api/integration/wsh/search', request),

    integrationWshDependencies: (route: string): Promise<WshDependenciesResponse> => post('/api/integration/wsh/dependencies', { route }),

    integrationWshLayout: (request: WshLayoutRequest): Promise<WshLayoutResponse> => post('/api/integration/wsh/layout', request)
  } satisfies Partial<ElectronAPI>;
}
