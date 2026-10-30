import { ipcRenderer } from 'electron';
import type { ScenarioRunKind, ScenarioRunListItem, ScenarioRunRecord } from '../shared/scenarioHistoryTypes';

/** Canais scenario-history:* do preload (Validação de Cenários → Histórico), isolados para não crescer o index.ts. */
export const scenarioHistoryApi = {
  scenarioHistoryList: (kind?: ScenarioRunKind): Promise<ScenarioRunListItem[]> => ipcRenderer.invoke('scenario-history:list', kind),
  scenarioHistoryGet: (id: string): Promise<ScenarioRunRecord | null> => ipcRenderer.invoke('scenario-history:get', id),
  scenarioHistoryDelete: (id: string): Promise<boolean> => ipcRenderer.invoke('scenario-history:delete', id),
  scenarioHistoryClear: (): Promise<number> => ipcRenderer.invoke('scenario-history:clear')
};
