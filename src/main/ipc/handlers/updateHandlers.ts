import { ipcMain } from 'electron';
import type { IpcContext } from '../ipcContext';

/** Auto-update. Canais: update:* */
export function registerUpdateHandlers(ctx: IpcContext): void {
  const { autoUpdateService } = ctx;

  ipcMain.handle('update:check', async () => {
    autoUpdateService?.checkForUpdates();
  });

  ipcMain.handle('update:download', async () => {
    autoUpdateService?.downloadUpdate();
  });

  ipcMain.handle('update:install', async () => {
    autoUpdateService?.quitAndInstall();
  });
}
