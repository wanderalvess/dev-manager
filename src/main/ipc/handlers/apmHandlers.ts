import { ipcMain } from 'electron';
import { ApmFilter } from '../../../shared/types';
import type { IpcContext } from '../ipcContext';

/** APM e observabilidade (OpenTelemetry). Canais: apm:* */
export function registerApmHandlers(ctx: IpcContext): void {
  const { apmService } = ctx;

  ipcMain.handle('apm:get-overview', async (_, filter?: ApmFilter) => {
    return apmService.getOverview(filter);
  });

  ipcMain.handle('apm:get-traces', async (_, filter?: ApmFilter) => {
    return apmService.getTraces(filter);
  });

  ipcMain.handle('apm:get-trace-details', async (_, traceId: string) => {
    return apmService.getTraceDetails(traceId);
  });

  ipcMain.handle('apm:get-services', async () => {
    return apmService.getServices();
  });

  ipcMain.handle('apm:get-receiver-status', async () => {
    return apmService.getReceiverStatus();
  });

  ipcMain.handle('apm:clear', async () => {
    apmService.clear();
    return { success: true };
  });

  ipcMain.handle('apm:generate-demo', async () => {
    return apmService.generateDemoData();
  });

  ipcMain.handle('apm:change-receiver-port', async (_, port: number) => {
    return apmService.changeReceiverPort(port);
  });
}
