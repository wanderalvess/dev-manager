import { ipcMain } from 'electron';
import { AppSettings } from '../../../shared/types';
import type { IpcContext } from '../ipcContext';

/** Configurações. Canais: settings:* */
export function registerSettingsHandlers(ctx: IpcContext): void {
  const { configService, docsIndexService } = ctx;

  ipcMain.handle('settings:get', async () => {
    return configService.sanitizeSecrets(configService.getSettings());
  });

  ipcMain.handle('settings:save', async (_, settings: Partial<AppSettings>) => {
    // A preservação de senhas/tokens existentes (quando o renderer ecoa de volta o valor
    // sanitizado/vazio recebido de settings:get) é responsabilidade do próprio
    // ConfigService.saveSettings — assim os três transportes (IPC/REST/MCP) se comportam
    // igual e um novo campo de segredo não precisa ser listado em 3 arquivos.
    const saved = configService.saveSettings(settings);
    if ('autoReindexOnChange' in settings) {
      if (settings.autoReindexOnChange) {
        await docsIndexService.startWatching();
      } else {
        docsIndexService.stopWatching();
      }
    }
    return configService.sanitizeSecrets(saved);
  });

  ipcMain.handle('settings:export', async (_, sanitizePasswords?: boolean) => {
    return configService.exportSettings(sanitizePasswords ?? true);
  });

  ipcMain.handle('settings:import', async (_, jsonString: string) => {
    return configService.importSettings(jsonString);
  });
}
