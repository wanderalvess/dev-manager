import { autoUpdater } from 'electron-updater';
import { UpdateStatus } from '../../shared/types';

/**
 * Encapsula o `autoUpdater` (singleton) do electron-updater, configurado para publicar via
 * GitHub Releases (ver `publish` em electron-builder.json5). `autoDownload = false` para o
 * download só começar quando o usuário pedir explicitamente (update:download), não silenciosamente
 * em segundo plano assim que uma versão nova é detectada.
 */
export class AutoUpdateService {
  constructor(onStatus: (status: UpdateStatus) => void) {
    autoUpdater.autoDownload = false;

    autoUpdater.on('checking-for-update', () => onStatus({ status: 'checking' }));
    autoUpdater.on('update-available', (info) => onStatus({ status: 'available', version: info.version }));
    autoUpdater.on('update-not-available', () => onStatus({ status: 'not-available' }));
    autoUpdater.on('download-progress', (progress) => onStatus({ status: 'downloading', percent: progress.percent }));
    autoUpdater.on('update-downloaded', (info) => onStatus({ status: 'downloaded', version: info.version }));
    autoUpdater.on('error', (err) => onStatus({ status: 'error', message: err?.message || String(err) }));
  }

  /** Verifica se há uma versão nova publicada no GitHub Releases. Sem efeito em builds não empacotadas (dev). */
  public checkForUpdates(): void {
    autoUpdater.checkForUpdates().catch(() => {
      // Erros já são reportados via evento 'error' acima; evita unhandled rejection.
    });
  }

  public downloadUpdate(): void {
    autoUpdater.downloadUpdate().catch(() => {
      // Erros já são reportados via evento 'error' acima.
    });
  }

  /** Fecha o app e instala a atualização já baixada (só faz sentido após 'update-downloaded'). */
  public quitAndInstall(): void {
    autoUpdater.quitAndInstall();
  }
}
