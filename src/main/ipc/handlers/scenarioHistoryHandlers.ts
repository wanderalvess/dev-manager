import { ipcMain } from 'electron';
import type { ScenarioRunKind } from '../../../shared/scenarioHistoryTypes';
import type { IpcContext } from '../ipcContext';

/** Histórico da Validação de Cenários. Canais: scenario-history:* */
export function registerScenarioHistoryHandlers(ctx: IpcContext): void {
  const { scenarioHistoryService } = ctx;
  ipcMain.handle('scenario-history:list', (_, kind?: ScenarioRunKind) => scenarioHistoryService.list(kind));
  ipcMain.handle('scenario-history:get', (_, id: string) => scenarioHistoryService.get(id));
  ipcMain.handle('scenario-history:delete', (_, id: string) => scenarioHistoryService.remove(id));
  ipcMain.handle('scenario-history:clear', () => scenarioHistoryService.clear());
}
