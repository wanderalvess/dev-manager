import { app, BrowserWindow, Tray, Menu, nativeImage, shell, session, Notification } from 'electron';
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
import { OracleTracerCaptureService } from './services/OracleTracerCaptureService';
import { BackupService } from './services/BackupService';
import { BackupSchedulerService } from './services/BackupSchedulerService';
import { DockerService } from './services/DockerService';
import { NetworkService } from './services/NetworkService';
import { DeployService } from './services/DeployService';
import { LogWatcherService } from './services/LogWatcherService';
import { KarafLogPersistenceService } from './services/KarafLogPersistenceService';
import { AutoUpdateService } from './services/AutoUpdateService';
import { LlmService } from './services/LlmService';
import { Routine801Service } from './services/Routine801Service';
import { ApmService, getApmReceiverHandlePath } from './services/ApmService';
import { registerIpcHandlers } from './ipc/registerIpc';
import { notifyUser } from './services/NotificationService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof (globalThis as any).__dirname === 'undefined') {
  (globalThis as any).__dirname = __dirname;
}
if (typeof (globalThis as any).__filename === 'undefined') {
  (globalThis as any).__filename = __filename;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function getAppIconPath(): string | undefined {
  const possibleIcons = [
    path.join(app.getAppPath(), 'dist/icon.png'),
    path.join(app.getAppPath(), 'dist/favicon.ico'),
    path.join(__dirname, '../../dist/icon.png'),
    path.join(__dirname, '../../public/icon.png'),
    path.join(process.cwd(), 'dist/icon.png'),
    path.join(process.cwd(), 'build/icon.ico'),
    path.join(process.cwd(), 'build/icon.png'),
    path.join(process.cwd(), 'public/icon.png')
  ];
  return possibleIcons.find((p) => fs.existsSync(p));
}

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

  const iconPath = getAppIconPath();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1000,
    minHeight: 650,
    title: 'Dev Manager',
    icon: iconPath,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    autoHideMenuBar: true,
    backgroundColor: '#0B0F17'
  });

  // Iniciar sempre em tela cheia (maximizada)
  mainWindow.maximize();
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
  });

  const configService = new ConfigService();
  const karafService = new KarafService(configService);
  const databaseService = new DatabaseService(configService);
  const oracleTracerCaptureService = new OracleTracerCaptureService(databaseService);
  const backupService = new BackupService(configService);
  const backupSchedulerService = new BackupSchedulerService(configService, backupService);
  backupSchedulerService.onResult = (connectionName, result) => {
    mainWindow?.webContents.send('backup:schedule-result', { connectionName, result });
    // Notificação do sistema operacional: garante visibilidade mesmo com a janela
    // minimizada/em segundo plano, quando o webContents.send acima passa despercebido.
    if (Notification.isSupported()) {
      new Notification({
        title: result.success ? 'Backup agendado concluído' : 'Falha no backup agendado',
        body: `${connectionName}: ${result.message}`
      }).show();
    }
  };
  const networkService = new NetworkService();
  const windowsService = new WindowsService(configService, karafService, databaseService, networkService);
  const gitAzureService = new GitAzureService(configService, karafService);
  const routinesService = new RoutinesService(configService);
  const docsIndexService = new DocsIndexService(configService, gitAzureService);
  docsIndexService.onWatchReindexComplete = (status) => {
    notifyUser(mainWindow, 'docs:reindex-complete', status, {
      title: 'Documentação reindexada',
      body: `Índice do RAG atualizado automaticamente (${status.totalChunks} trechos).`
    });
  };
  if (configService.getSettings().autoReindexOnChange) {
    docsIndexService.startWatching();
  }
  const dockerService = new DockerService();
  const deployService = new DeployService(configService, karafService, dockerService, windowsService, networkService);
  const logWatcherService = new LogWatcherService();
  const karafLogPersistenceService = new KarafLogPersistenceService();
  const autoUpdateService = new AutoUpdateService((status) => {
    mainWindow?.webContents.send('update:status', status);
  });
  const llmService = new LlmService(configService, docsIndexService);
  const routine801Service = new Routine801Service(configService, karafService);
  const apmService = new ApmService(5000, { configService, queryHandleFile: getApmReceiverHandlePath() });
  apmService.onNewTrace = (summary) => {
    mainWindow?.webContents.send('apm:new-trace', summary);
  };
  apmService.startReceiver().catch((err) => {
    console.warn('[ApmService] Falha ao iniciar receptor OTLP no boot:', err);
  });

  registerIpcHandlers(
    mainWindow,
    windowsService,
    karafService,
    gitAzureService,
    routinesService,
    configService,
    docsIndexService,
    databaseService,
    backupService,
    backupSchedulerService,
    dockerService,
    networkService,
    deployService,
    logWatcherService,
    karafLogPersistenceService,
    autoUpdateService,
    llmService,
    routine801Service,
    apmService,
    oracleTracerCaptureService
  );

  backupSchedulerService.rescheduleAll();
  autoUpdateService.checkForUpdates();
  // Rechecagem periódica: cobre o app que fica dias aberto sem reiniciar, sem depender só do check no boot.
  const AUTO_UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
  const autoUpdateInterval = setInterval(() => autoUpdateService.checkForUpdates(), AUTO_UPDATE_CHECK_INTERVAL_MS);

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
      let trayIcon: Electron.NativeImage;
      const appIconPath = getAppIconPath();
      if (appIconPath && fs.existsSync(appIconPath)) {
        trayIcon = nativeImage.createFromPath(appIconPath).resize({ width: 16, height: 16 });
      } else {
        trayIcon = nativeImage.createEmpty();
      }
      tray = new Tray(trayIcon);
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
    logWatcherService.stopAll();
    clearInterval(autoUpdateInterval);
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
