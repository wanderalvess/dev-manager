import { ipcMain } from 'electron';
import type { IpcContext } from '../ipcContext';

/** Rastreio de Integração ponta a ponta (decisão 0003). Canais: integration:* */
export function registerIntegrationHandlers(ctx: IpcContext): void {
  const { integrationTraceService } = ctx;

  ipcMain.handle('integration:check-readiness', () => integrationTraceService.checkReadiness());
}
