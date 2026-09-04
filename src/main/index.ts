import { app, BrowserWindow, Tray, Menu, nativeImage, shell, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ConfigService } from './services/ConfigService';
import { WindowsService } from './services/WindowsService';
import { KarafService } from './services/KarafService';
import { GitAzureService } from './services/GitAzureService';
import { RoutinesService } from './services/RoutinesService';
import { DocsIndexService } from './services/DocsIndexService';
import { DatabaseService } from './services/DatabaseService';
import { DockerService } from './services/DockerService';
import { NetworkService } from './services/NetworkService';
import { registerIpcHandlers } from './ipc/registerIpc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createWindow() {
  const possiblePreload = [
    path.join(app.getAppPath(), 'dist-electron/preload/index.cjs'),
    path.join(__dirname, '../preload/index.cjs'),
    path.join(process.cwd(), 'dist-electron/preload/index.cjs'),
    path.join(__dirname, '../preload/index.js'),
    path.join(process.cwd(), 'dist-electron/preload/index.js')
  ];

  const preloadPath = possiblePreload.find((p) => fs.existsSync(p)) || possiblePreload[0];
  console.log('[Electron] Carregando Preload:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1000,
    minHeight: 650,
    title: 'Dev Manager',
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    autoHideMenuBar: true,
    backgroundColor: '#0B0F17'
  });

  const configService = new ConfigService();
  const karafService = new KarafService(configService);
  const windowsService = new WindowsService(configService, karafService);
  const gitAzureService = new GitAzureService(configService, karafService);
  const routinesService = new RoutinesService(configService);
  const docsIndexService = new DocsIndexService(configService, gitAzureService);
  const databaseService = new DatabaseService();
  const dockerService = new DockerService();
  const networkService = new NetworkService();

  registerIpcHandlers(
    mainWindow,
    windowsService,
    karafService,
    gitAzureService,
    routinesService,
    configService,
    docsIndexService,
    databaseService,
    dockerService,
    networkService
  );

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  // Bloquear navegação remota arbitrária no webContents
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const isAllowed = !app.isPackaged ? url.startsWith(devUrl) : url.startsWith('file://');
    if (!isAllowed) {
      event.preventDefault();
      console.warn('[Segurança] Tentativa de navegação não autorizada bloqueada:', url);
    }
  });

  // Controlar abertura de novas janelas (redirecionar apenas HTTP/HTTPS para o navegador nativo)
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

  // Atalho F12 ou Ctrl+Shift+I para DevTools (somente em desenvolvimento)
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

  // Tray Icon na barra de notificações
  if (!tray) {
    try {
      const icon = nativeImage.createEmpty();
      tray = new Tray(icon);
      tray.setToolTip('Dev Manager');

      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Abrir Dev Manager',
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        },
        { type: 'separator' },
        {
          label: '⚡ Preparar Ambiente Dev',
          click: () => {
            windowsService.resetEnvironment('embedded', (log) => {
              if (mainWindow) mainWindow.webContents.send('env:log-event', log);
            });
          }
        },
        {
          label: '💻 Abrir IDE / Editor',
          click: () => windowsService.launchIntelliJ()
        },
        {
          label: '🐛 Iniciar Servidor Debug',
          click: () => windowsService.launchServerDebug()
        },
        { type: 'separator' },
        {
          label: 'Sair do Aplicativo',
          click: () => {
            app.quit();
          }
        }
      ]);

      tray.setContextMenu(contextMenu);
      tray.on('double-click', () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    } catch (err) {
      console.warn('Não foi possível inicializar Tray da bandeja:', err);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Rejeitar solicitações de permissões não autorizadas do SO (câmera, microfone, geolocalização)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

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
