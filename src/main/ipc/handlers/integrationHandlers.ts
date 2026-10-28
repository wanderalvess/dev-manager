import { ipcMain } from 'electron';
import type { IntegrationBatchTraceRequest } from '../../../shared/integrationTypes';
import type { WshLayoutRequest, WshSearchRequest } from '../../../shared/wshMonitorTypes';
import type { IpcContext } from '../ipcContext';

/** Rastreio de Integração ponta a ponta (decisão 0003). Canais: integration:* */
export function registerIntegrationHandlers(ctx: IpcContext): void {
  const { integrationTraceService } = ctx;

  ipcMain.handle('integration:check-readiness', () => integrationTraceService.checkReadiness());
  ipcMain.handle('integration:list-flows', () => integrationTraceService.listFlows());
  ipcMain.handle('integration:trace-batch', (_, request: IntegrationBatchTraceRequest) =>
    integrationTraceService.traceBatch(request)
  );
  // Reconsulta do modo ao vivo: fora das métricas de uso de propósito (acompanhar não é um uso novo)
  ipcMain.handle('integration:refresh-trace', (_, id: string) => integrationTraceService.refreshTrace(id));
  ipcMain.handle('integration:list-traces', () => integrationTraceService.listTraces());
  ipcMain.handle('integration:get-trace', (_, id: string) => integrationTraceService.getTrace(id));
  ipcMain.handle('integration:delete-trace', (_, id: string) => integrationTraceService.deleteTrace(id));
  // Monitor do WSH: só leitura no Oracle; consultar não é uma automação nova, por isso fica fora das métricas de uso
  ipcMain.handle('integration:wsh-routes', () => integrationTraceService.listWshRoutes());
  ipcMain.handle('integration:wsh-search', (_, request: WshSearchRequest) => integrationTraceService.searchWsh(request));
  ipcMain.handle('integration:wsh-dependencies', (_, route: string) => integrationTraceService.checkWshDependencies(route));
  ipcMain.handle('integration:wsh-layout', (_, request: WshLayoutRequest) => integrationTraceService.explainWshLayout(request));
  ipcMain.handle('integration:wsh-schedule', (_, route: string) => integrationTraceService.checkWshSchedule(route));
}
