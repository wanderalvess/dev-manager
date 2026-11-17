import { ipcMain } from 'electron';
import type { TerminalCreateRequest } from '../../../shared/terminalTypes';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Terminal integrado (shells do sistema operacional + WSL + SSH). Canais: terminal:* */
export function registerTerminalHandlers(ctx: IpcContext): void {
  const { mainWindow, configService, terminalSessionService } = ctx;

  ipcMain.handle('terminal:list-profiles', async () => {
    return await terminalSessionService.listProfiles();
  });

  ipcMain.handle('terminal:create-session', async (_, req: TerminalCreateRequest) => {
    const defaultCwd = configService.getSettings().projectsDir;
    return terminalSessionService.createSession(
      req,
      defaultCwd,
      (evt) => safeSend(mainWindow, 'terminal:data', evt),
      (evt) => safeSend(mainWindow, 'terminal:exit', evt)
    );
  });

  ipcMain.handle('terminal:send-input', async (_, sessionId: string, input: string) => {
    return terminalSessionService.writeInput(sessionId, input);
  });

  ipcMain.handle('terminal:interrupt-session', async (_, sessionId: string) => {
    return await terminalSessionService.interruptSession(sessionId);
  });

  ipcMain.handle('terminal:close-session', async (_, sessionId: string) => {
    return terminalSessionService.closeSession(sessionId);
  });
}
