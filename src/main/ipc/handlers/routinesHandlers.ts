import { ipcMain } from 'electron';
import { RoutineDownloadRequest, BatchRoutineDownloadRequest } from '../../../shared/types';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Catálogo e lançador de rotinas. Canais: routines:* */
export function registerRoutinesHandlers(ctx: IpcContext): void {
  const { mainWindow, routinesService, configService } = ctx;

  ipcMain.handle('routines:list', async () => {
    return routinesService.listRoutines();
  });

  ipcMain.handle('routines:launch', async (_, fullPath: string, forceDirect?: boolean) => {
    return routinesService.launchRoutine(fullPath, forceDirect);
  });

  ipcMain.handle('routines:check-karaf-status', async () => {
    return routinesService.checkKarafWtaStatus();
  });

  ipcMain.handle('routines:launch-mapped', async (_, id: string) => {
    return routinesService.launchMappedProgram(id);
  });

  ipcMain.handle('routines:toggle-favorite', async (_, routineId: string) => {
    return configService.toggleFavoriteRoutine(routineId);
  });

  ipcMain.handle('routines:download-ccw', async (_, req: RoutineDownloadRequest) => {
    return routinesService.downloadAndInstallRoutine(req);
  });

  ipcMain.handle(
    'routines:install-local',
    async (_, filePath: string, routineCodeOrName?: string, targetModule?: string, backupExisting?: boolean) => {
      return routinesService.installRoutineFromFile(filePath, routineCodeOrName, targetModule, backupExisting);
    }
  );

  ipcMain.handle('routines:get-ccw-catalog', async (_, authCookie?: string) => {
    return routinesService.getCcwCatalog(authCookie);
  });

  ipcMain.handle('routines:get-ccw-download-url', async (_, routineName: string, winthorVersion?: string) => {
    return routinesService.getCcwRoutineDownloadLink(routineName, winthorVersion);
  });

  ipcMain.handle('routines:list-backups', async (_, routineIdOrName: string, moduleFolder?: string) => {
    return routinesService.listRoutineBackups(routineIdOrName, moduleFolder);
  });

  ipcMain.handle('routines:restore-backup', async (_, backupFilePath: string, targetRoutinePath: string) => {
    return routinesService.restoreRoutineBackup(backupFilePath, targetRoutinePath);
  });

  ipcMain.handle('routines:delete-backup', async (_, backupFilePath: string) => {
    return routinesService.deleteRoutineBackup(backupFilePath);
  });

  ipcMain.handle('routines:get-version', async (_, filePath: string) => {
    return routinesService.getExecutableVersion(filePath);
  });

  ipcMain.handle('routines:batch-download', async (_, request: BatchRoutineDownloadRequest) => {
    return routinesService.downloadRoutinesBatch(request, (progress) => {
      safeSend(mainWindow, 'routines:batch-progress', progress);
    });
  });
}
