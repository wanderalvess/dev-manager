import { ipcMain } from 'electron';
import type { IpcContext } from '../ipcContext';
import type { AiUsagePeriod, UsageSummaryQuery } from '../../../shared/types';

/** Métricas locais de uso (issue #12). Canais: usage:* */
export function registerUsageHandlers(ctx: IpcContext): void {
  const { usageMetricsService, aiUsageService } = ctx;

  ipcMain.handle('usage:get-summary', async (_, query?: UsageSummaryQuery) => {
    return usageMetricsService.getSummary(query);
  });

  ipcMain.handle('usage:get-days', async () => {
    return usageMetricsService.getDays();
  });

  ipcMain.handle('usage:clear', async () => {
    usageMetricsService.clear();
    aiUsageService.clear();
  });

  ipcMain.handle('usage:get-ai', async (_, period?: AiUsagePeriod) => {
    return aiUsageService.getReport(period);
  });
}
