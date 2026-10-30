import { ipcMain } from 'electron';
import type { IpcContext } from '../ipcContext';
import type { HttpProbeRequest } from '../../../shared/types';

/** Rede. Canais: network:* */
export function registerNetworkHandlers(ctx: IpcContext): void {
  const { networkService } = ctx;

  ipcMain.handle('network:get-ips', async () => {
    return await networkService.getNetworkIps();
  });

  ipcMain.handle('network:check-http-health', async (_, url: string, timeoutMs?: number) => {
    return await networkService.checkHttpHealth(url, timeoutMs);
  });

  ipcMain.handle('network:probe-http', async (_, req: HttpProbeRequest) => {
    return await networkService.probeHttpEndpoint(req);
  });
}
