import { ipcMain, shell, BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { WindowsService } from '../services/WindowsService';
import { KarafService } from '../services/KarafService';
import { GitAzureService } from '../services/GitAzureService';
import { RoutinesService } from '../services/RoutinesService';
import { ConfigService } from '../services/ConfigService';
import {
  AppSettings,
  KarafDeployRequest,
  SelectFileOptions,
  SystemAppInfo,
  EnvironmentAutomationConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  AutomationProfile,
  AutomationStep
} from '../../shared/types';
import { isSafeUrl, isValidIdentifier } from '../utils/security';

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  windowsService: WindowsService,
  karafService: KarafService,
  gitAzureService: GitAzureService,
  routinesService: RoutinesService,
  configService: ConfigService
) {
  // --- Diálogos Nativos do Sistema & Verificação de Caminhos ---
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

  ipcMain.handle('system:get-app-info', async (): Promise<SystemAppInfo> => {
    const isAdmin = await windowsService.checkAdminPrivileges();
    const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const configPath = path.join(appData, 'dev-manager', 'config.json');

    return {
      appName: 'Dev Manager',
      appVersion: '1.0.0',
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
      isAdmin
    };
  });

  // --- Gestor de Ambiente ---
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
        mainWindow.webContents.send('env:log-event', log);
      },
      (chunk) => {
        mainWindow.webContents.send('karaf:stdout', chunk);
      }
    );
  });

  // --- Orquestrador de Perfis de Automação ---
  ipcMain.handle('profile:run', async (_, profile: AutomationProfile) => {
    return await windowsService.executeProfile(
      profile,
      (log) => {
        mainWindow.webContents.send('env:log-event', log);
      },
      (stepIndex, totalSteps, step) => {
        mainWindow.webContents.send('profile:step-progress', { stepIndex, totalSteps, step });
      }
    );
  });

  ipcMain.handle('profile:stop', async (_, profile: AutomationProfile) => {
    return await windowsService.stopProfile(profile, (log) => {
      mainWindow.webContents.send('env:log-event', log);
    });
  });

  ipcMain.handle('profile:run-step', async (_, step: AutomationStep, profileName?: string) => {
    return await windowsService.runProfileStep(step, profileName, (log) => {
      mainWindow.webContents.send('env:log-event', log);
    });
  });

  ipcMain.handle('profile:stop-step', async (_, step: AutomationStep) => {
    return await windowsService.stopProfileStep(step, (log) => {
      mainWindow.webContents.send('env:log-event', log);
    });
  });

  ipcMain.handle('profile:restart-step', async (_, step: AutomationStep, profileName?: string) => {
    return await windowsService.restartProfileStep(step, profileName, (log) => {
      mainWindow.webContents.send('env:log-event', log);
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

  // --- Karaf Deployer & Console Embutido ---
  ipcMain.handle('karaf:start-embedded', async () => {
    return karafService.startEmbeddedKarafDebug((chunk) => {
      mainWindow.webContents.send('karaf:stdout', chunk);
    });
  });

  ipcMain.handle('karaf:send-input', async (_, input: string) => {
    return karafService.sendEmbeddedInput(input);
  });

  ipcMain.handle('karaf:stop-embedded', async () => {
    return await karafService.stopEmbeddedKaraf();
  });

  ipcMain.handle('karaf:is-embedded-running', async () => {
    return karafService.isEmbeddedRunning();
  });

  ipcMain.handle('karaf:deploy', async (_, request: KarafDeployRequest) => {
    return await karafService.deploy(request, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:exec-diagnostic', async (_, command: string) => {
    return await karafService.executeKarafCommand(command, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle(
    'karaf:build-and-deploy',
    async (_, request: KarafDeployRequest, projectPath: string, skipTests: boolean = true) => {
      return await karafService.buildAndDeployMaven(request, projectPath, skipTests, (chunk) => {
        mainWindow.webContents.send('karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle('karaf:run-maven-build', async (_, projectPath: string, skipTests: boolean = true) => {
    return await karafService.runMavenBuild(projectPath, skipTests, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:parse-pom', async (_, projectPath: string) => {
    return karafService.parseProjectPomOrBat(projectPath);
  });

  // --- Git & Azure DevOps ---
  ipcMain.handle('git:list-projects', async () => {
    return await gitAzureService.listProjects();
  });

  ipcMain.handle('git:get-project-info', async (_, projectPath: string) => {
    return await gitAzureService.getProjectInfo(projectPath);
  });

  ipcMain.handle('git:build-pr-url', async (_, projectPath: string, targetBranch?: string) => {
    return await gitAzureService.buildAzurePrUrl(projectPath, targetBranch);
  });

  ipcMain.handle('git:exec-command', async (_, projectPath: string, command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop') => {
    return await gitAzureService.executeGitCommand(projectPath, command);
  });

  ipcMain.handle('shell:open-external', async (_, url: string) => {
    if (isSafeUrl(url)) {
      await shell.openExternal(url);
      return true;
    }
    console.warn(`[Segurança] URL externa insegura rejeitada no IPC: ${url}`);
    return false;
  });

  // --- Lançador de Rotinas ---
  ipcMain.handle('routines:list', async () => {
    return routinesService.listRoutines();
  });

  ipcMain.handle('routines:launch', async (_, fullPath: string) => {
    return routinesService.launchRoutine(fullPath);
  });

  ipcMain.handle('routines:launch-mapped', async (_, id: string) => {
    return routinesService.launchMappedProgram(id);
  });

  ipcMain.handle('routines:toggle-favorite', async (_, routineId: string) => {
    return configService.toggleFavoriteRoutine(routineId);
  });

  // --- Configurações ---
  ipcMain.handle('settings:get', async () => {
    return configService.getSettings();
  });

  ipcMain.handle('settings:save', async (_, settings: Partial<AppSettings>) => {
    return configService.saveSettings(settings);
  });
}
