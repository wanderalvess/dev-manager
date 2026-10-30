import type {
  ApiScenario,
  ApiScenarioProgress,
  ApiScenarioRunResponse,
  ApiScenarioRunResult,
  ApiScenarioSaveResponse
} from '../../../../shared/apiScenarioTypes';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais api-scenario:* (Validação de Cenários → Validação de API). */
export function createApiScenarioApi({ apiFetch, wsManager }: BridgeDeps) {
  const post = <T>(url: string, body: unknown) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
  return {
    apiScenarioList: () => apiFetch<ApiScenario[]>('/api/api-scenarios'),
    apiScenarioSave: (scenario: Partial<ApiScenario>) => post<ApiScenarioSaveResponse>('/api/api-scenarios', scenario),
    apiScenarioDelete: async (id: string) =>
      (await apiFetch<{ success: boolean }>(`/api/api-scenarios/${encodeURIComponent(id)}`, { method: 'DELETE' })).success,
    apiScenarioRun: (input: { id?: string; scenario?: Partial<ApiScenario> }) => post<ApiScenarioRunResponse>('/api/api-scenarios/run', input),
    apiScenarioRunAll: () => post<ApiScenarioRunResult[]>('/api/api-scenarios/run-all', {}),
    onApiScenarioProgress: (callback: (progress: ApiScenarioProgress) => void) => wsManager.subscribe('api-scenario:progress', callback)
  } satisfies Partial<ElectronAPI>;
}
