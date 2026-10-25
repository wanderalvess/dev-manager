import { ipcMain } from 'electron';
import type { IntegrationBatchTraceRequest } from '../../../shared/integrationTypes';
import type { IpcContext } from '../ipcContext';

/** Rastreio de Integração ponta a ponta (decisão 0003). Canais: integration:* */
export function registerIntegrationHandlers(ctx: IpcContext): void {
  const { integrationTraceService } = ctx;

  ipcMain.handle('integration:check-readiness', () => integrationTraceService.checkReadiness());
  ipcMain.handle('integration:list-flows', () => integrationTraceService.listFlows());
  ipcMain.handle('integration:trace-batch', (_, request: IntegrationBatchTraceRequest) =>
    integrationTraceService.traceBatch(request)
  );
  ipcMain.handle('integration:list-traces', () => integrationTraceService.listTraces());
  ipcMain.handle('integration:get-trace', (_, id: string) => integrationTraceService.getTrace(id));
  ipcMain.handle('integration:delete-trace', (_, id: string) => integrationTraceService.deleteTrace(id));
}
