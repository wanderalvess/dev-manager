import { app, BrowserWindow, Tray, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { bootstrapServices, type BootstrappedApp } from './bootstrapServices';
import { createAppTray, getAppIconPath } from './appTray';
import { safeSend } from './utils/ipcSend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = __dirname;
}
if (typeof (globalThis as any).__filename === 'undefined') {
  (globalThis as any).__filename = __filename;
}

// Mantém a pasta userData original ("dev-manager") para preservar dados locais após a renomeação para "hub-manager".
try {
  app.setPath('userData', path.join(app.getPath('appData'), 'dev-manager'));
} catch (err) {
  console.warn('[Electron] Não foi possível fixar a pasta userData:', (err as Error).message);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let bootstrappedApp: BootstrappedApp | null = null;

function resolvePreloadPath(): string {
  const candidates = [
    path.join(app.getAppPath(), 'dist-electron/preload/index.cjs'),
    path.join(__dirname, '../preload/index.cjs'),
    path.join(process.cwd(), 'dist-electron/preload/index.cjs'),
    path.join(__dirname, '../preload/index.js'),
    path.join(process.cwd(), 'dist-electron/preload/index.js')
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function createWindow(): void {
  const preloadPath = resolvePreloadPath();
  console.log('[Electron] Carregando Preload:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1000,
    minHeight: 650,
    title: 'Hub Manager',
    icon: getAppIconPath(__dirname),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    autoHideMenuBar: true,
    backgroundColor: '#0B0F17'
  });

  mainWindow.maximize();
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAllowed = !app.isPackaged ? url.startsWith(devUrl) : url.startsWith('file://');
    if (!isAllowed) {
      event.preventDefault();
      console.warn('[Segurança] Tentativa de navegação não autorizada bloqueada:', url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    } else {
      console.warn('[Segurança] Tentativa de abertura de URL insegura bloqueada:', url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Electron] Falha ao carregar frontend (${errorCode}): ${errorDescription}`);
  });

  if (!app.isPackaged) {
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow?.webContents.toggleDevTools();
      }
    });
  }

  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    } else {
      mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    }
  }

  if (!tray && bootstrappedApp) {
    const winSvc = bootstrappedApp.windowsService;
    tray = createAppTray({
      baseDir: __dirname,
      getMainWindow: () => mainWindow,
      onPrepareDevEnv: () => {
        winSvc.resetEnvironment('embedded', (log) => {
          if (mainWindow) safeSend(mainWindow, 'env:log-event', log);
        });
      },
      onLaunchIde: () => winSvc.launchIntelliJ(),
      onLaunchServerDebug: () => winSvc.launchServerDebug()
    });
  }

  mainWindow.on('closed', () => {
    bootstrappedApp?.logWatcherService.stopAll();
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    callback(permission === 'display-capture');
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => permission === 'display-capture');

  if (!bootstrappedApp) {
    bootstrappedApp = bootstrapServices(() => mainWindow);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
