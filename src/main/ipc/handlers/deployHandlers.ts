import { ipcMain } from 'electron';
import { DeployProfile, DeployStep } from '../../../shared/types';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Perfis de deploy. Canais: deploy:* e pom:* */
export function registerDeployHandlers(ctx: IpcContext): void {
  const { mainWindow, deployService } = ctx;

  ipcMain.handle('deploy:run-profile', async (_, profile: DeployProfile) => {
    return await deployService.executeProfile(
      profile,
      (chunk) => {
        safeSend(mainWindow, 'deploy:log-chunk', chunk);
      },
      (progressEvent) => {
        safeSend(mainWindow, 'deploy:step-progress', progressEvent);
      }
    );
  });

  ipcMain.handle('deploy:run-step', async (_, step: DeployStep, profileName?: string) => {
    return await deployService.executeSingleStep(
      step,
      (chunk) => {
        safeSend(mainWindow, 'deploy:log-chunk', chunk);
      },
      profileName
    );
  });

  ipcMain.handle('deploy:abort', async () => {
    deployService.abortCurrentExecution();
    return { success: true };
  });

  ipcMain.handle('deploy:get-history', async () => {
    return deployService.getHistory();
  });

  ipcMain.handle('deploy:clear-history', async () => {
    deployService.clearHistory();
    return { success: true };
  });

  ipcMain.handle('pom:get-coordinates', async (_, projectPath: string) => {
    return deployService.getPomService().readCoordinates(projectPath);
  });

  ipcMain.handle('pom:list-dependencies', async (_, projectPath: string) => {
    return deployService.getPomService().listDependencies(projectPath);
  });

  ipcMain.handle(
    'pom:update-dependency-version',
    async (
      _,
      targetProjectPath: string,
      dependency: { artifactId: string; newVersion: string; groupId?: string },
      createBackup?: boolean
    ) => {
      return deployService.getPomService().updateDependencyVersion(targetProjectPath, dependency, createBackup);
    }
  );
}
