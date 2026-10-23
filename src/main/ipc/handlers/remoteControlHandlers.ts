import { ipcMain } from 'electron';
import type { IpcContext } from '../ipcContext';

/** Controle remoto pelo celular (só desktop). Canais: remote:* */
export function registerRemoteControlHandlers(ctx: IpcContext): void {
  const { remoteControlService } = ctx;

  ipcMain.handle('remote:get-status', async () => remoteControlService.getStatus());
  ipcMain.handle('remote:start', async () => remoteControlService.start());
  ipcMain.handle('remote:stop', async () => remoteControlService.stop());
  ipcMain.handle('remote:regenerate-key', async () => remoteControlService.regenerateKey());
}
