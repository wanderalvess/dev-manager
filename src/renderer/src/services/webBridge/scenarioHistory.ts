import type { ScenarioRunKind, ScenarioRunListItem, ScenarioRunRecord } from '../../../../shared/scenarioHistoryTypes';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST) dos canais scenario-history:* (Validação de Cenários → Histórico). */
export function createScenarioHistoryApi({ apiFetch }: BridgeDeps) {
  return {
    scenarioHistoryList: (kind?: ScenarioRunKind) =>
      apiFetch<ScenarioRunListItem[]>(`/api/scenario-history${kind ? `?kind=${encodeURIComponent(kind)}` : ''}`),
    scenarioHistoryGet: async (id: string) => {
      try {
        return await apiFetch<ScenarioRunRecord>(`/api/scenario-history/${encodeURIComponent(id)}`);
      } catch {
        return null;
      }
    },
    scenarioHistoryDelete: async (id: string) =>
      (await apiFetch<{ success: boolean }>(`/api/scenario-history/${encodeURIComponent(id)}`, { method: 'DELETE' })).success,
    scenarioHistoryClear: async () => (await apiFetch<{ removed: number }>('/api/scenario-history', { method: 'DELETE' })).removed
  } satisfies Partial<ElectronAPI>;
}
