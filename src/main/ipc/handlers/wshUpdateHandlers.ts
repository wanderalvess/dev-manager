import { ipcMain } from 'electron';
import { wslService } from '../../services/WslService';
import { WshUpdateService } from '../../services/wsh/WshUpdateService';
import { safeSend } from '../../utils/ipcSend';
import type { WshUpdateRequest } from '../../../shared/wshUpdate';
import type { IpcContext } from '../ipcContext';

/** Atualização do jar do WSH de um container. Canais: wsh-update:* */
export function registerWshUpdateHandlers(ctx: IpcContext): void {
  const service = new WshUpdateService(async () => (await wslService.findDockerWslDistro()) || undefined);
  const { mainWindow } = ctx;
  const progress = (p: unknown) => safeSend(mainWindow, 'wsh-update:progress', p);

  ipcMain.handle('wsh-update:inspect', async (_, req: WshUpdateRequest) => service.inspect(req));
  ipcMain.handle('wsh-update:probe', async (_, version: string) => service.probe(version));
  ipcMain.handle('wsh-update:prepare', async (_, req: WshUpdateRequest) => service.prepare(req, progress));
  ipcMain.handle('wsh-update:apply', async (_, req: WshUpdateRequest) => service.apply(req, progress));
  ipcMain.handle('wsh-update:rollback', async (_, req: WshUpdateRequest & { backup?: string }) => service.rollback(req, progress));
}
