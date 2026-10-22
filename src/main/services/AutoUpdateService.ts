import { autoUpdater } from 'electron-updater';
import { UpdateStatus } from '../../shared/types';
import {
  compareVersions,
  formatUpdateErrorMessage,
  GithubRelease,
  pickPortableAsset
} from '../utils/releaseVersion';

const LATEST_RELEASE_API = 'https://api.github.com/repos/wanderalvess/dev-manager/releases/latest';

export interface AutoUpdateOptions {
  /**
   * Build portátil (electron-builder define PORTABLE_EXECUTABLE_FILE). O electron-updater não
   * atualiza o .exe portátil, então nesse modo a checagem vai direto na API do GitHub Releases e o
   * "download" abre o .exe novo no navegador.
   */
  portable?: boolean;
  currentVersion?: string;
  openExternal?: (url: string) => void | Promise<void>;
  fetchImpl?: typeof fetch;
}

/**
 * Encapsula o `autoUpdater` (singleton) do electron-updater, configurado para publicar via
 * GitHub Releases (ver `publish` em electron-builder.json5). `autoDownload = false` para o
 * download só começar quando o usuário pedir explicitamente (update:download), não silenciosamente
 * em segundo plano assim que uma versão nova é detectada.
 */
export class AutoUpdateService {
  private manualDownloadUrl: string | null = null;

  constructor(
    private readonly onStatus: (status: UpdateStatus) => void,
    private readonly options: AutoUpdateOptions = {}
  ) {
    autoUpdater.autoDownload = false;

    autoUpdater.on('checking-for-update', () => onStatus({ status: 'checking' }));
    autoUpdater.on('update-available', (info) => onStatus({ status: 'available', version: info.version }));
    autoUpdater.on('update-not-available', () => onStatus({ status: 'not-available' }));
    autoUpdater.on('download-progress', (progress) => onStatus({ status: 'downloading', percent: progress.percent }));
    autoUpdater.on('update-downloaded', (info) => onStatus({ status: 'downloaded', version: info.version }));
    autoUpdater.on('error', (err) => onStatus({ status: 'error', message: formatUpdateErrorMessage(err) }));
  }

  /** Verifica se há uma versão nova publicada no GitHub Releases. Sem efeito em builds não empacotadas (dev). */
  public checkForUpdates(): void {
    if (this.options.portable) {
      void this.checkPortable();
      return;
    }
    autoUpdater.checkForUpdates().catch((err) => {
      this.onStatus({ status: 'error', message: formatUpdateErrorMessage(err) });
    });
  }

  public downloadUpdate(): void {
    if (this.options.portable) {
      if (this.manualDownloadUrl) void this.options.openExternal?.(this.manualDownloadUrl);
      return;
    }
    autoUpdater.downloadUpdate().catch((err) => {
      this.onStatus({ status: 'error', message: formatUpdateErrorMessage(err) });
    });
  }

  /** Fecha o app e instala a atualização já baixada (só faz sentido após 'update-downloaded'). */
  public quitAndInstall(): void {
    if (this.options.portable) return;
    autoUpdater.quitAndInstall();
  }

  private async checkPortable(): Promise<void> {
    this.onStatus({ status: 'checking' });
    try {
      const doFetch = this.options.fetchImpl ?? fetch;
      const res = await doFetch(LATEST_RELEASE_API, {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'hub-manager' }
      });
      if (!res.ok) throw new Error(`GitHub respondeu HTTP ${res.status}`);
      const release = (await res.json()) as GithubRelease;
      const current = this.options.currentVersion ?? '0.0.0';
      if (compareVersions(release.tag_name, current) <= 0) {
        this.manualDownloadUrl = null;
        this.onStatus({ status: 'not-available' });
        return;
      }
      this.manualDownloadUrl = pickPortableAsset(release)?.browser_download_url ?? release.html_url;
      this.onStatus({ status: 'available', version: release.tag_name.replace(/^v/i, ''), manual: true });
    } catch (err) {
      this.onStatus({ status: 'error', message: formatUpdateErrorMessage(err) });
    }
  }
}
