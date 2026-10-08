import { app, ipcMain, shell, dialog } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { SelectFileOptions, SystemAppInfo } from '../../../shared/types';
import { isSafeUrl } from '../../utils/security';
import type { IpcContext } from '../ipcContext';

/** Sistema, diálogos nativos e informações do app. Canais: dialog:*, shell:*, system:* */
export function registerSystemHandlers(ctx: IpcContext): void {
  const { mainWindow, windowsService, configService, networkService } = ctx;

  // Distingue instalação nova (nunca existiu marcador) de atualização de versão (marcador existia,
  // versão mudou). Onboarding completo (Welcome + Tour) só deve resetar em instalação nova — numa
  // atualização isso só incomoda quem já conhece o app e apaga preferências já escolhidas.
  let isFirstRunSession = false;
  let isAppUpdatedSession = false;
  try {
    const markerPath = path.join(app.getPath('userData'), '.last_seen_version');
    const currentVersion = app.getVersion();
    const markerExisted = fs.existsSync(markerPath);
    const lastVersion = markerExisted ? fs.readFileSync(markerPath, 'utf-8').trim() : null;
    if (!markerExisted) {
      isFirstRunSession = true;
    } else if (lastVersion !== currentVersion) {
      isAppUpdatedSession = true;
    }
    if (!markerExisted || lastVersion !== currentVersion) {
      fs.writeFileSync(markerPath, currentVersion, 'utf-8');
    }
  } catch {
    // Silencioso em caso de restrição de I/O
  }

  ipcMain.handle('dialog:select-directory', async (_, defaultPath?: string) => {
    const validDefault = defaultPath && fs.existsSync(defaultPath) ? defaultPath : os.homedir();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar Diretório',
      defaultPath: validDefault,
      properties: ['openDirectory', 'createDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('dialog:select-file', async (_, options?: SelectFileOptions) => {
    const validDefault = options?.defaultPath && fs.existsSync(options.defaultPath) ? options.defaultPath : os.homedir();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Selecionar Arquivo Executável',
      defaultPath: validDefault,
      filters: options?.filters || [
        { name: 'Executáveis (*.exe)', extensions: ['exe'] },
        { name: 'Scripts e Bat (*.bat, *.cmd)', extensions: ['bat', 'cmd'] },
        { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });

  ipcMain.handle('system:check-path', async (_, targetPath: string) => {
    return configService.checkPath(targetPath);
  });

  ipcMain.handle('system:auto-detect-paths', async () => {
    return configService.autoDetectPaths();
  });

  ipcMain.handle('system:get-mcp-docs', async () => {
    try {
      const candidates = [
        path.join(app.getAppPath(), 'docs', 'MCP_TOOLS.md'),
        path.join(process.cwd(), 'docs', 'MCP_TOOLS.md'),
        path.join(process.resourcesPath, 'docs', 'MCP_TOOLS.md'),
        path.join(process.resourcesPath, 'app.asar.unpacked', 'docs', 'MCP_TOOLS.md'),
        path.join(__dirname, '../../docs/MCP_TOOLS.md'),
        path.join(__dirname, '../../../docs/MCP_TOOLS.md')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          return fs.readFileSync(p, 'utf-8');
        }
      }
      return '# Documentação não encontrada\nNão foi possível localizar o arquivo MCP_TOOLS.md.';
    } catch (err: any) {
      return `# Erro ao ler documentação\n${err.message}`;
    }
  });

  ipcMain.handle('system:get-app-info', async (): Promise<SystemAppInfo> => {
    // Consome as flags: recarregar a janela (Ctrl+R) na mesma sessão não deve reabrir o onboarding
    // nem o "O que há de novo". Lidas antes do await para não perder a ordem entre chamadas concorrentes.
    const isFirstRun = isFirstRunSession;
    const isAppUpdated = isAppUpdatedSession;
    isFirstRunSession = false;
    isAppUpdatedSession = false;

    const isAdmin = await windowsService.checkAdminPrivileges();
    const configPath = configService.getConfigFilePath();

    return {
      appName: 'Hub Manager',
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron || 'N/A',
      nodeVersion: process.versions.node || 'N/A',
      chromeVersion: process.versions.chrome || 'N/A',
      v8Version: process.versions.v8 || 'N/A',
      osPlatform: os.platform(),
      osRelease: os.release(),
      osArch: os.arch(),
      osHostname: os.hostname(),
      totalMemoryMb: Math.round(os.totalmem() / 1024 / 1024),
      freeMemoryMb: Math.round(os.freemem() / 1024 / 1024),
      configPath,
      isAdmin,
      isFirstRun,
      isAppUpdated
    };
  });

  ipcMain.handle('system:get-changelog', async (): Promise<string | null> => {
    try {
      const candidates = [
        path.join(app.getAppPath(), 'CHANGELOG.md'),
        path.join(process.cwd(), 'CHANGELOG.md'),
        path.join(process.resourcesPath, 'CHANGELOG.md'),
        path.join(__dirname, '../../CHANGELOG.md'),
        path.join(__dirname, '../../../CHANGELOG.md')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          return fs.readFileSync(p, 'utf-8');
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  ipcMain.handle('shell:open-external', async (_, url: string) => {
    if (isSafeUrl(url)) {
      await shell.openExternal(url);
      return true;
    }
    console.warn(`[Segurança] URL externa insegura rejeitada no IPC: ${url}`);
    return false;
  });

  ipcMain.handle('system:get-metrics', async () => {
    return await networkService.getSystemMetrics();
  });
}
