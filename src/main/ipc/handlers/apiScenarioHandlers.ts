import { ipcMain } from 'electron';
import type { ApiScenario } from '../../../shared/apiScenarioTypes';
import type { ApiScenarioRunInput } from '../../services/ApiScenarioService';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Validação de Cenários → Validação de API. Canais: api-scenario:* */
export function registerApiScenarioHandlers(ctx: IpcContext): void {
  const { mainWindow, apiScenarioService } = ctx;
  const progress = (data: unknown) => safeSend(mainWindow, 'api-scenario:progress', data);

  ipcMain.handle('api-scenario:list', () => apiScenarioService.list());
  ipcMain.handle('api-scenario:save', (_, scenario: Partial<ApiScenario>) => apiScenarioService.save(scenario));
  ipcMain.handle('api-scenario:delete', (_, id: string) => apiScenarioService.delete(id));
  ipcMain.handle('api-scenario:run', (_, input: ApiScenarioRunInput) => apiScenarioService.run(input, progress));
  ipcMain.handle('api-scenario:run-all', () => apiScenarioService.runAll(progress));
}
