import { ipcMain } from 'electron';
import { LogChunkEvent } from '../../../shared/types';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Leitor de logs em tempo real. Canais: logs:* */
export function registerLogsHandlers(ctx: IpcContext): void {
  const { mainWindow, logWatcherService } = ctx;

  ipcMain.handle('logs:start-watch', async (_, sourceId: string, filePath: string, initialLines?: number, encoding?: string) => {
    return await logWatcherService.startWatch(
      sourceId,
      filePath,
      (event: LogChunkEvent) => {
        if (!mainWindow.isDestroyed()) {
          safeSend(mainWindow, 'logs:chunk', event);
        }
      },
      initialLines,
      (encoding as BufferEncoding) || 'utf-8'
    );
  });

  ipcMain.handle('logs:stop-watch', async (_, sourceId: string) => {
    return logWatcherService.stopWatch(sourceId);
  });

  ipcMain.handle('logs:check-file', async (_, filePath: string, sourceId?: string) => {
    return logWatcherService.checkFile(filePath, sourceId);
  });

  ipcMain.handle('logs:clear-file', async (_, filePath: string) => {
    return await logWatcherService.clearLogFile(filePath);
  });
}
