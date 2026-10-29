import { ipcMain } from 'electron';
import type { AuthLockoutRunRequest } from '../../../shared/authLockoutTypes';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Teste de bloqueio de login do WinThor (Homologação → Bloqueio de Login). Canais: auth-lockout:* */
export function registerAuthLockoutHandlers(ctx: IpcContext): void {
  const { mainWindow, authLockoutTestService } = ctx;

  ipcMain.handle('auth-lockout:get-defaults', () => authLockoutTestService.getDefaults());
  ipcMain.handle('auth-lockout:run', (_, request: AuthLockoutRunRequest) =>
    authLockoutTestService.run(request, (progress) => safeSend(mainWindow, 'auth-lockout:progress', progress))
  );
  ipcMain.handle('auth-lockout:abort', () => authLockoutTestService.abort());
}
