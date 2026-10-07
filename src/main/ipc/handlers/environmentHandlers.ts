import { ipcMain } from 'electron';
import {
  EnvironmentAutomationConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  AutomationProfile,
  AutomationStep
} from '../../../shared/types';
import { isValidIdentifier } from '../../utils/security';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Ambiente e perfis de automação. Canais: env:*, profile:* */
export function registerEnvironmentHandlers(ctx: IpcContext): void {
  const { mainWindow, windowsService, configService, karafLogPersistenceService } = ctx;

  ipcMain.handle('env:check-admin', async () => {
    return await windowsService.checkAdminPrivileges();
  });

  ipcMain.handle('env:get-services-status', async (_, customServices?: TrackedServiceConfig[]) => {
    return await windowsService.getAllServicesStatus(customServices);
  });

  ipcMain.handle('env:get-processes-status', async (_, customProcesses?: TrackedProcessConfig[]) => {
    return await windowsService.getProcessesStatus(customProcesses);
  });

  ipcMain.handle('env:check-ports', async () => {
    return await windowsService.checkPorts();
  });

  ipcMain.handle('env:start-service', async (_, serviceName: string) => {
    return await windowsService.startService(serviceName);
  });

  ipcMain.handle('env:stop-service', async (_, serviceName: string) => {
    return await windowsService.stopService(serviceName);
  });

  ipcMain.handle('env:batch-start-services', async (_, serviceNames: string[]) => {
    const validNames = (serviceNames || []).filter(isValidIdentifier);
    return await windowsService.batchStartServices(validNames);
  });

  ipcMain.handle('env:batch-stop-services', async (_, serviceNames: string[]) => {
    const validNames = (serviceNames || []).filter(isValidIdentifier);
    return await windowsService.batchStopServices(validNames);
  });

  ipcMain.handle('env:batch-kill-processes', async (_, processNames: string[]) => {
    const validNames = (processNames || []).filter(isValidIdentifier);
    return await windowsService.batchKillProcesses(validNames);
  });

  ipcMain.handle('env:launch-intellij', async () => {
    return await windowsService.launchIntelliJ();
  });

  ipcMain.handle('env:launch-server-debug', async () => {
    return windowsService.launchServerDebug();
  });

  ipcMain.handle('env:reset-environment', async (_, options?: 'embedded' | 'external' | EnvironmentAutomationConfig) => {
    return await windowsService.resetEnvironment(
      options || 'embedded',
      (log) => {
        safeSend(mainWindow, 'env:log-event', log);
      },
      (chunk) => {
        karafLogPersistenceService.append(chunk);
        safeSend(mainWindow, 'karaf:stdout', chunk);
      }
    );
  });

  ipcMain.handle('profile:run', async (_, profile: AutomationProfile) => {
    return await windowsService.executeProfile(
      profile,
      (log) => {
        safeSend(mainWindow, 'env:log-event', log);
      },
      (stepIndex, totalSteps, step) => {
        safeSend(mainWindow, 'profile:step-progress', { stepIndex, totalSteps, step });
      }
    );
  });

  ipcMain.handle('profile:stop', async (_, profile: AutomationProfile) => {
    return await windowsService.stopProfile(profile, (log) => {
      safeSend(mainWindow, 'env:log-event', log);
    });
  });

  ipcMain.handle('profile:run-step', async (_, step: AutomationStep, profileName?: string) => {
    return await windowsService.runProfileStep(step, profileName, (log) => {
      safeSend(mainWindow, 'env:log-event', log);
    });
  });

  ipcMain.handle('profile:stop-step', async (_, step: AutomationStep) => {
    return await windowsService.stopProfileStep(step, (log) => {
      safeSend(mainWindow, 'env:log-event', log);
    });
  });

  ipcMain.handle('profile:restart-step', async (_, step: AutomationStep, profileName?: string) => {
    return await windowsService.restartProfileStep(step, profileName, (log) => {
      safeSend(mainWindow, 'env:log-event', log);
    });
  });

  ipcMain.handle('profile:kill-port', async (_, port: number) => {
    return await windowsService.killPortProcess(port);
  });

  ipcMain.handle('profile:save-all', async (_, profiles: AutomationProfile[], activeProfileId?: string) => {
    return configService.saveSettings({
      automationProfiles: profiles,
      activeProfileId: activeProfileId
    });
  });
}
