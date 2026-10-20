import { ipcMain } from 'electron';
import type { DelphiBuildRequest, DelphiPipelineRequest } from '../../../shared/types';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Build Delphi e pipeline de publicação. Canais: delphi:* */
export function registerDelphiHandlers(ctx: IpcContext): void {
  const { mainWindow, delphiBuildService } = ctx;
  const sendLog = (chunk: string) => safeSend(mainWindow, 'delphi:log-chunk', chunk);

  ipcMain.handle('delphi:detect', () => delphiBuildService.detectInstallations());
  ipcMain.handle('delphi:find-projects', (_, root?: string) => delphiBuildService.findProjects(root));
  ipcMain.handle('delphi:build', (_, request: DelphiBuildRequest) => delphiBuildService.build(request, sendLog));
  ipcMain.handle('delphi:pipeline', (_, request: DelphiPipelineRequest) =>
    delphiBuildService.runPipeline(request, sendLog)
  );
  ipcMain.handle('delphi:cancel', async () => ({ success: await delphiBuildService.cancel() }));
}
