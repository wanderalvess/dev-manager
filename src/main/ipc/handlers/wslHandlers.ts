import { ipcMain } from 'electron';
import { wslService } from '../../services/WslService';
import type { IpcContext } from '../ipcContext';

/** WSL, snapshots e INFR-Docker. Canais: infr:*, wsl:* */
export function registerWslHandlers(ctx: IpcContext): void {
  const { dockerService } = ctx;

  ipcMain.handle('wsl:list-distros', async () => {
    return await dockerService.checkDockerStatus().then((s) => s.availableDistros || []);
  });

  ipcMain.handle('wsl:start-docker-daemon', async (_, distro: string) => {
    return await wslService.startDockerDaemon(distro);
  });

  ipcMain.handle('wsl:terminate-distro', async (_, distro: string) => {
    return await wslService.terminateDistro(distro);
  });

  ipcMain.handle('wsl:open-terminal', async (_, distro: string) => {
    return await wslService.openWslTerminal(distro);
  });

  ipcMain.handle('wsl:get-distro-ip', async (_, distro?: string) => {
    return await wslService.getDistroIp(distro);
  });

  ipcMain.handle('wsl:open-dumps-folder', async (_, distro?: string) => {
    return await wslService.openDumpsFolder(distro);
  });

  ipcMain.handle('wsl:list-dmp-files', async (_, distro?: string) => {
    return await wslService.listDmpFiles(distro);
  });

  ipcMain.handle('wsl:generate-md5', (_, text: string) => {
    return wslService.generateMd5(text);
  });

  ipcMain.handle('wsl:check-wsh-prerequisites', async (_, distro?: string) => {
    return await wslService.checkWshPrerequisites(distro);
  });

  ipcMain.handle('wsl:open-opt-folder', async (_, distro?: string) => {
    return await wslService.openWslOptFolder(distro);
  });

  ipcMain.handle('wsl:get-environments', async () => {
    return wslService.loadContainerManagerConfig();
  });

  ipcMain.handle('wsl:save-environment', async (_, env: any) => {
    if (!env || !env.name) {
      throw new Error('Dados de ambiente inválidos.');
    }
    return wslService.saveContainerManagerEnvironment(env);
  });

  ipcMain.handle('wsl:delete-environment', async (_, id: string) => {
    return wslService.deleteContainerManagerEnvironment(id);
  });

  ipcMain.handle('wsl:get-snapshots-dir', () => {
    return wslService.getSnapshotsDir();
  });

  ipcMain.handle('wsl:set-snapshots-dir', (_, dir: string) => {
    return wslService.setSnapshotsDir(dir);
  });

  ipcMain.handle('wsl:list-snapshots', async (_, dir?: string) => {
    return await wslService.listSnapshots(dir);
  });

  ipcMain.handle('wsl:import-snapshot', async (_, params: { distroName: string; installDir: string; tarPath: string }) => {
    return await wslService.importSnapshot(params.distroName, params.installDir, params.tarPath);
  });

  ipcMain.handle('wsl:export-snapshot', async (_, params: { distroName: string; outputPath: string }) => {
    return await wslService.exportSnapshot(params.distroName, params.outputPath);
  });

  ipcMain.handle('wsl:unregister-distro', async (_, distroName: string) => {
    return await wslService.unregisterDistro(distroName);
  });

  ipcMain.handle('infr:check-scripts', async (_, customPath?: string) => {
    return await wslService.checkInfrDockerScripts(customPath);
  });

  ipcMain.handle('infr:run-setup-script', async (_, { scriptType, options }: { scriptType: 'oracle' | 'wta' | 'wsh'; options: any }) => {
    return await wslService.runInfrSetupScript(scriptType, options);
  });
}
