import { ipcMain } from 'electron';
import { Routine801InstallRequest } from '../../../shared/types';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Rotina 801 (serviços web oficiais do WinThor). Canais: routine801:* */
export function registerRoutine801Handlers(ctx: IpcContext): void {
  const { mainWindow, routine801Service } = ctx;

  ipcMain.handle('routine801:get-installations', async (_, customUrl?: string) => {
    return await routine801Service.fetchInstallations(customUrl);
  });

  ipcMain.handle('routine801:get-updates', async (_, customUrl?: string) => {
    return await routine801Service.fetchUpdates(customUrl);
  });

  ipcMain.handle('routine801:check-server', async (_, customUrl?: string) => {
    return await routine801Service.checkServerHealth(customUrl);
  });

  ipcMain.handle('routine801:install-features', async (_, request: Routine801InstallRequest) => {
    return await routine801Service.installFeatures(request, (chunk) => {
      safeSend(mainWindow, 'karaf:log-chunk', chunk);
    });
  });
}
