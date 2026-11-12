import { app, BrowserWindow, Menu, nativeImage, Tray } from 'electron';
import fs from 'fs';
import path from 'path';

export function getAppIconPath(baseDir: string): string | undefined {
  const possibleIcons = [
    path.join(app.getAppPath(), 'dist/icon.png'),
    path.join(app.getAppPath(), 'dist/favicon.ico'),
    path.join(baseDir, '../../dist/icon.png'),
    path.join(baseDir, '../../public/icon.png'),
    path.join(process.cwd(), 'dist/icon.png'),
    path.join(process.cwd(), 'build/icon.ico'),
    path.join(process.cwd(), 'build/icon.png'),
    path.join(process.cwd(), 'public/icon.png')
  ];
  return possibleIcons.find((p) => fs.existsSync(p));
}

export interface AppTrayOptions {
  baseDir: string;
  getMainWindow: () => BrowserWindow | null;
  onPrepareDevEnv: () => void;
  onLaunchIde: () => void;
  onLaunchServerDebug: () => void;
}

export function createAppTray(options: AppTrayOptions): Tray | null {
  try {
    let trayIcon: Electron.NativeImage;
    const appIconPath = getAppIconPath(options.baseDir);
    if (appIconPath && fs.existsSync(appIconPath)) {
      trayIcon = nativeImage.createFromPath(appIconPath).resize({ width: 16, height: 16 });
    } else {
      trayIcon = nativeImage.createEmpty();
    }

    const tray = new Tray(trayIcon);
    tray.setToolTip('Hub Manager');

    const focusWindow = () => {
      const win = options.getMainWindow();
      if (win && !win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
      }
    };

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Abrir Hub Manager',
        click: focusWindow
      },
      { type: 'separator' },
      {
        label: '⚡ Preparar Ambiente Dev',
        click: options.onPrepareDevEnv
      },
      {
        label: '💻 Abrir IDE / Editor',
        click: options.onLaunchIde
      },
      {
        label: '🐛 Iniciar Servidor Debug',
        click: options.onLaunchServerDebug
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
    tray.on('double-click', focusWindow);
    return tray;
  } catch (err) {
    console.warn('Não foi possível inicializar Tray da bandeja:', err);
    return null;
  }
}
