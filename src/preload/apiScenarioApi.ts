import { ipcRenderer } from 'electron';
import type {
  ApiScenario,
  ApiScenarioProgress,
  ApiScenarioRunResponse,
  ApiScenarioRunResult,
  ApiScenarioSaveResponse
} from '../shared/apiScenarioTypes';

/** Canais api-scenario:* do preload (Validação de Cenários → Validação de API), isolados para não crescer o index.ts. */
export const apiScenarioApi = {
  apiScenarioList: (): Promise<ApiScenario[]> => ipcRenderer.invoke('api-scenario:list'),
  apiScenarioSave: (scenario: Partial<ApiScenario>): Promise<ApiScenarioSaveResponse> => ipcRenderer.invoke('api-scenario:save', scenario),
  apiScenarioDelete: (id: string): Promise<boolean> => ipcRenderer.invoke('api-scenario:delete', id),
  apiScenarioRun: (input: { id?: string; scenario?: Partial<ApiScenario> }): Promise<ApiScenarioRunResponse> =>
    ipcRenderer.invoke('api-scenario:run', input),
  apiScenarioRunAll: (): Promise<ApiScenarioRunResult[]> => ipcRenderer.invoke('api-scenario:run-all'),
  onApiScenarioProgress: (callback: (progress: ApiScenarioProgress) => void) => {
    const subscription = (_: any, progress: ApiScenarioProgress) => callback(progress);
    ipcRenderer.on('api-scenario:progress', subscription);
    return () => {
      ipcRenderer.removeListener('api-scenario:progress', subscription);
    };
  }
};
