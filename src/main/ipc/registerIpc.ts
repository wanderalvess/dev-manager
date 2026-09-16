import { app, ipcMain, shell, BrowserWindow, dialog } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { WindowsService } from '../services/WindowsService';
import { KarafService } from '../services/KarafService';
import { GitAzureService } from '../services/GitAzureService';
import { RoutinesService } from '../services/RoutinesService';
import { ConfigService } from '../services/ConfigService';
import { DocsIndexService, DocSyncService } from '../services/DocsIndexService';
import { ConfluenceSource } from '../services/docSources/ConfluenceSource';
import { JiraSource } from '../services/docSources/JiraSource';
import { DatabaseService } from '../services/DatabaseService';
import { BackupService } from '../services/BackupService';
import { BackupSchedulerService } from '../services/BackupSchedulerService';
import * as cron from 'node-cron';
import { DockerService } from '../services/DockerService';
import { wslService } from '../services/WslService';
import { NetworkService } from '../services/NetworkService';
import { DeployService } from '../services/DeployService';
import { LogWatcherService } from '../services/LogWatcherService';
import { KarafLogPersistenceService } from '../services/KarafLogPersistenceService';
import { AutoUpdateService } from '../services/AutoUpdateService';
import { notifyUser } from '../services/NotificationService';
import {
  AppSettings,
  KarafDeployRequest,
  SelectFileOptions,
  SystemAppInfo,
  EnvironmentAutomationConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  AutomationProfile,
  AutomationStep,
  DocsIndexProgress,
  DatabaseConnectionConfig,
  BackupConfig,
  BackupWebhookConfig,
  ConfluenceSourceConfig,
  JiraSourceConfig,
  DeployProfile,
  DeployStep,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
  LogWatchStatus,
  LogChunkEvent
} from '../../shared/types';
import { isSafeUrl, isSafePath, isValidIdentifier } from '../utils/security';

export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  windowsService: WindowsService,
  karafService: KarafService,
  gitAzureService: GitAzureService,
  routinesService: RoutinesService,
  configService: ConfigService,
  docsIndexService: DocsIndexService,
  databaseService: DatabaseService,
  backupService: BackupService,
  backupSchedulerService: BackupSchedulerService,
  dockerService: DockerService,
  networkService: NetworkService,
  deployService: DeployService,
  logWatcherService: LogWatcherService = new LogWatcherService(),
  karafLogPersistenceService: KarafLogPersistenceService = new KarafLogPersistenceService(),
  autoUpdateService?: AutoUpdateService
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
    const configPath = configService.getConfigFilePath();

    return {
      appName: 'Dev Manager',
      appVersion: app.getVersion(),
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

  ipcMain.handle('system:get-changelog', async (): Promise<string | null> => {
    try {
      const changelogPath = path.join(app.getAppPath(), 'CHANGELOG.md');
      if (!fs.existsSync(changelogPath)) return null;
      return fs.readFileSync(changelogPath, 'utf-8');
    } catch {
      return null;
    }
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
        karafLogPersistenceService.append(chunk);
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
      karafLogPersistenceService.append(chunk);
      mainWindow.webContents.send('karaf:stdout', chunk);
    });
  });

  ipcMain.handle('karaf:get-persisted-logs', async (_, maxChars?: number) => {
    return { output: karafLogPersistenceService.read(maxChars) };
  });

  ipcMain.handle('karaf:clear-persisted-logs', async () => {
    karafLogPersistenceService.clear();
    return { success: true };
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
    const result = await karafService.deploy(request, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
    notifyUser(mainWindow, 'karaf:deploy-result', result, {
      title: result.success ? 'Deploy Karaf concluído' : 'Falha no deploy Karaf',
      body: result.success ? request.featureInstall : result.error || 'Erro desconhecido no deploy'
    });
    return result;
  });

  ipcMain.handle('karaf:exec-diagnostic', async (_, command: string) => {
    return await karafService.executeKarafCommand(command, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle(
    'karaf:build-and-deploy',
    async (_, request: KarafDeployRequest, projectPath: string, skipTests: boolean = true) => {
      const result = await karafService.buildAndDeployMaven(request, projectPath, skipTests, (chunk) => {
        mainWindow.webContents.send('karaf:log-chunk', chunk);
      });
      notifyUser(mainWindow, 'karaf:deploy-result', result, {
        title: result.success ? 'Build + Deploy Karaf concluído' : 'Falha no build/deploy Karaf',
        body: result.success ? request.featureInstall : result.error || 'Erro desconhecido no build/deploy'
      });
      return result;
    }
  );

  ipcMain.handle('karaf:list-deploy-history', async () => {
    return karafService.getDeployHistory();
  });

  ipcMain.handle('karaf:run-maven-build', async (_, projectPath: string, skipTests: boolean = true) => {
    const result = await karafService.runMavenBuild(projectPath, skipTests, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
    if (result.code !== 0) {
      notifyUser(mainWindow, 'karaf:build-result', result, {
        title: 'Falha na compilação Maven',
        body: `Build de "${projectPath}" terminou com código ${result.code}.`
      });
    }
    return result;
  });

  ipcMain.handle('karaf:list-bundles', async (_, credentials?: { user?: string; pass?: string; port?: number }) => {
    return await karafService.listBundlesParsed(credentials);
  });

  ipcMain.handle(
    'karaf:manage-bundle',
    async (
      _,
      action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ) => {
      return await karafService.manageBundle(action, bundleId, credentials, (chunk) => {
        mainWindow.webContents.send('karaf:log-chunk', chunk);
      });
    }
  );

  ipcMain.handle(
    'karaf:get-log',
    async (_, lines?: number, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.getKarafLog(lines, credentials);
    }
  );

  ipcMain.handle(
    'karaf:get-bundle-details',
    async (_, bundleId: string, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.getBundleDetails(bundleId, credentials);
    }
  );

  ipcMain.handle(
    'karaf:check-bundle-deps',
    async (_, bundleId: string, credentials?: { user?: string; pass?: string; port?: number }) => {
      return await karafService.checkBundleDependencies(bundleId, credentials);
    }
  );

  ipcMain.handle(
    'karaf:check-install-deps',
    async (
      _,
      target: { location?: string; symbolicName?: string; version?: string },
      credentials?: { user?: string; pass?: string; port?: number }
    ) => {
      return await karafService.checkInstallDependencies(target, credentials);
    }
  );

  ipcMain.handle('karaf:install-bundle', async (_, request: InstallBundleRequest) => {
    return await karafService.installBundle(request, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:uninstall-bundle', async (_, bundleId: string, credentials?: { user?: string; pass?: string; port?: number }) => {
    return await karafService.uninstallBundle(bundleId, credentials, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:reinstall-bundle', async (_, request: ReinstallBundleRequest) => {
    return await karafService.reinstallBundle(request, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:update-bundle-version', async (_, request: UpdateBundleVersionRequest) => {
    return await karafService.updateBundleVersion(request, (chunk) => {
      mainWindow.webContents.send('karaf:log-chunk', chunk);
    });
  });

  ipcMain.handle('karaf:parse-pom', async (_, projectPath: string) => {
    return karafService.parseProjectPomOrBat(projectPath);
  });

  // --- Orquestrador de Perfis de Deploy (Karaf / Docker / Comando Genérico) ---
  ipcMain.handle('deploy:run-profile', async (_, profile: DeployProfile) => {
    return await deployService.executeProfile(profile, (chunk) => {
      mainWindow.webContents.send('deploy:log-chunk', chunk);
    });
  });

  ipcMain.handle('deploy:run-step', async (_, step: DeployStep, profileName?: string) => {
    return await deployService.executeSingleStep(step, (chunk) => {
      mainWindow.webContents.send('deploy:log-chunk', chunk);
    }, profileName);
  });

  // --- Git & Azure DevOps ---
  ipcMain.handle('git:list-projects', async () => {
    return await gitAzureService.listProjects();
  });

  ipcMain.handle('git:get-project-info', async (_, projectPath: string) => {
    return await gitAzureService.getProjectInfo(projectPath);
  });

  ipcMain.handle('git:build-pr-url', async (_, projectPath: string, targetBranch?: string) => {
    return await gitAzureService.buildPrUrl(projectPath, targetBranch);
  });

  ipcMain.handle('git:exec-command', async (_, projectPath: string, command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop') => {
    return await gitAzureService.executeGitCommand(projectPath, command);
  });

  ipcMain.handle(
    'git:checkout-branch',
    async (_, projectPath: string, branchName: string, createNew?: boolean) => {
      return await gitAzureService.checkoutBranch(projectPath, branchName, createNew);
    }
  );

  ipcMain.handle('git:commit-and-push', async (_, projectPath: string, message: string) => {
    return await gitAzureService.commitAndPush(projectPath, message);
  });

  ipcMain.handle('git:get-commit-history', async (_, projectPath: string, limit?: number) => {
    return await gitAzureService.getCommitHistory(projectPath, limit);
  });

  ipcMain.handle('git:get-status-details', async (_, projectPath: string) => {
    return await gitAzureService.getStatusDetails(projectPath);
  });

  ipcMain.handle('git:get-diff', async (_, projectPath: string, targetFile?: string) => {
    return await gitAzureService.getDiff(projectPath, targetFile);
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

  // --- Índice de Documentação (RAG local) ---
  ipcMain.handle('docs:reindex', async () => {
    return await docsIndexService.reindex((progress: DocsIndexProgress) => {
      mainWindow.webContents.send('docs:index-progress', progress);
    });
  });

  ipcMain.handle('docs:search', async (_, query: string, options?: { sourceLabel?: string; topK?: number }) => {
    return await docsIndexService.search(query, options);
  });

  ipcMain.handle('docs:get-status', async () => {
    return docsIndexService.getStatus();
  });

  ipcMain.handle('docs:test-confluence-connection', async (_, config: ConfluenceSourceConfig) => {
    try {
      const entries = await new ConfluenceSource(config).listEntries();
      return { success: true, message: `Conectado com sucesso: ${entries.length} página(s) encontrada(s).` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao conectar no Confluence.' };
    }
  });

  ipcMain.handle('docs:test-jira-connection', async (_, config: JiraSourceConfig) => {
    try {
      const entries = await new JiraSource(config).listEntries();
      return { success: true, message: `Conectado com sucesso: ${entries.length} issue(s) encontrada(s).` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Falha ao conectar no Jira.' };
    }
  });

  const docSyncService = new DocSyncService(configService, docsIndexService);

  ipcMain.handle('docs:sync', async (_, targetId?: string) => {
    return await docSyncService.syncToTarget(targetId, (progress) => {
      mainWindow.webContents.send('docs:sync-progress', progress);
    });
  });

  ipcMain.handle('docs:open-file', async (_, filePath: string, mode?: 'editor' | 'folder') => {
    const settings = configService.getSettings();
    const allowedBaseDirs = [settings.projectsPath, ...(settings.docFolders || []).map((f) => f.path)].filter(Boolean);
    const isAllowed = allowedBaseDirs.some((base) => isSafePath(filePath, base));
    if (!isAllowed) {
      console.warn('[Segurança] Bloqueada tentativa de abrir arquivo fora das pastas de documentação configuradas:', filePath);
      return false;
    }
    if (mode === 'editor') {
      try {
        await shell.openPath(filePath);
        return true;
      } catch {
        shell.showItemInFolder(filePath);
        return true;
      }
    }
    shell.showItemInFolder(filePath);
    return true;
  });

  ipcMain.handle('docs:read-content', async (_, filePath: string) => {
    const settings = configService.getSettings();
    const allowedBaseDirs = [settings.projectsPath, ...(settings.docFolders || []).map((f) => f.path)].filter(Boolean);
    const isAllowed = allowedBaseDirs.some((base) => isSafePath(filePath, base));
    if (!isAllowed) {
      console.warn('[Segurança] Bloqueada leitura de arquivo fora das pastas permitidas:', filePath);
      return null;
    }
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > 2 * 1024 * 1024) {
          return '(Arquivo muito grande para pré-visualização direta. Abra no editor externo.)';
        }
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch (err) {
      console.error('[Docs] Falha ao ler conteúdo do arquivo:', err);
    }
    return null;
  });

  // --- Configurações ---
  ipcMain.handle('settings:get', async () => {
    return configService.getSettings();
  });

  ipcMain.handle('settings:save', async (_, settings: Partial<AppSettings>) => {
    const saved = configService.saveSettings(settings);
    if ('autoReindexOnChange' in settings) {
      if (settings.autoReindexOnChange) {
        await docsIndexService.startWatching();
      } else {
        docsIndexService.stopWatching();
      }
    }
    return saved;
  });

  ipcMain.handle('settings:export', async (_, sanitizePasswords?: boolean) => {
    return configService.exportSettings(sanitizePasswords ?? true);
  });

  ipcMain.handle('settings:import', async (_, jsonString: string) => {
    return configService.importSettings(jsonString);
  });

  // --- Banco de Dados (Oracle, MySQL, Postgres) ---
  ipcMain.handle('db:test-connection', async (_, config: DatabaseConnectionConfig) => {
    return await databaseService.testConnection(config);
  });

  ipcMain.handle('db:execute-query', async (_, config: DatabaseConnectionConfig, sql: string, maxRows?: number, binds?: Record<string, any>) => {
    return await databaseService.executeQuery(config, sql, maxRows, binds);
  });

  ipcMain.handle('db:explain-plan', async (_, config: DatabaseConnectionConfig, sql: string) => {
    return await databaseService.explainPlan(config, sql);
  });

  ipcMain.handle('db:list-tables', async (_, config: DatabaseConnectionConfig) => {
    return await databaseService.listTables(config);
  });

  ipcMain.handle('db:get-table-columns', async (_, config: DatabaseConnectionConfig, tableName: string) => {
    return await databaseService.getTableColumns(config, tableName);
  });

  ipcMain.handle(
    'db:run-backup',
    async (
      _,
      config: DatabaseConnectionConfig,
      destinationFolder: string,
      oracleDirectory?: string,
      compress?: boolean,
      useCustomCommand?: boolean,
      customCommand?: string
    ) => {
      return await backupSchedulerService.runManualBackup(config, destinationFolder, {
        oracleDirectory,
        compress,
        useCustomCommand,
        customCommand
      });
    }
  );

  ipcMain.handle('db:list-backups', async (_, destinationFolder: string) => {
    return await backupService.listBackups(destinationFolder);
  });

  ipcMain.handle('db:restore-backup', async (_, config: DatabaseConnectionConfig, filePath: string) => {
    return await backupSchedulerService.runManualRestore(config, filePath);
  });

  ipcMain.handle('db:save-backup-config', async (_, config: BackupConfig) => {
    if (config.cronExpression && !cron.validate(config.cronExpression)) {
      return { success: false, message: 'Expressão cron inválida.' };
    }

    const settings = configService.getSettings();
    const existing = settings.backupConfigs || [];
    const previous = existing.find((b) => b.connectionId === config.connectionId);
    const merged: BackupConfig = { ...previous, ...config };
    const updated = [merged, ...existing.filter((b) => b.connectionId !== config.connectionId)];
    configService.saveSettings({ backupConfigs: updated });
    backupSchedulerService.rescheduleAll();

    return { success: true, message: 'Agendamento salvo com sucesso.' };
  });

  ipcMain.handle('db:list-backup-history', async (_, connectionId?: string) => {
    return backupSchedulerService.getHistory(connectionId);
  });

  ipcMain.handle('db:run-restore-drill', async (_, scratchConnection: DatabaseConnectionConfig, filePath: string) => {
    return await backupSchedulerService.runRestoreDrill(scratchConnection, filePath);
  });

  ipcMain.handle('backup:test-webhook', async (_, webhook: BackupWebhookConfig) => {
    return await backupSchedulerService.testWebhook(webhook);
  });

  // --- Gerenciador de Containers (Docker / Podman / WSL) ---
  ipcMain.handle('wsl:list-distros', async () => {
    return await dockerService.checkDockerStatus().then((s) => s.availableDistros || []);
  });

  ipcMain.handle('docker:set-target-wsl-distro', async (_, distro: string | null) => {
    dockerService.setTargetWslDistro(distro);
    return await dockerService.checkDockerStatus();
  });

  ipcMain.handle(
    'docker:start-sequence',
    async (_, containers: { name: string; delay?: number }[]) => {
      if (!Array.isArray(containers)) {
        throw new Error('containers deve ser um array.');
      }
      return await dockerService.startContainerSequence(containers, (step) => {
        mainWindow.webContents.send('docker:sequence-progress', step);
      });
    }
  );

  // --- Ferramentas de Manutenção Oracle (INFR-Docker) ---
  ipcMain.handle(
    'docker:oracle-health',
    async (_, containerName: string, schema?: string, fix?: boolean, user?: string, password?: string) => {
      return await dockerService.execOracleHealth(containerName, schema, fix, user, password);
    }
  );

  ipcMain.handle(
    'docker:oracle-sqlplus',
    async (_, containerName: string, user?: string, password?: string) => {
      return await dockerService.openOracleSqlPlus(containerName, user, password);
    }
  );

  ipcMain.handle(
    'docker:oracle-datapump',
    async (_, params: any) => {
      return await dockerService.execOracleDataPump(params);
    }
  );

  // --- Ambientes do Container Manager & WSL ---
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

  ipcMain.handle('docker:get-status', async () => {
    return await dockerService.checkDockerStatus();
  });
  ipcMain.handle('container:get-status', async () => {
    return await dockerService.checkDockerStatus();
  });

  ipcMain.handle('docker:list-containers', async () => {
    return await dockerService.listContainers();
  });
  ipcMain.handle('container:list-containers', async () => {
    return await dockerService.listContainers();
  });

  ipcMain.handle('docker:start', async (_, containerId: string) => {
    return await dockerService.startContainer(containerId);
  });
  ipcMain.handle('container:start', async (_, containerId: string) => {
    return await dockerService.startContainer(containerId);
  });

  ipcMain.handle('docker:stop', async (_, containerId: string) => {
    return await dockerService.stopContainer(containerId);
  });
  ipcMain.handle('container:stop', async (_, containerId: string) => {
    return await dockerService.stopContainer(containerId);
  });

  ipcMain.handle('docker:restart', async (_, containerId: string) => {
    return await dockerService.restartContainer(containerId);
  });
  ipcMain.handle('container:restart', async (_, containerId: string) => {
    return await dockerService.restartContainer(containerId);
  });

  ipcMain.handle('docker:logs', async (_, containerId: string, lines?: number) => {
    return await dockerService.getContainerLogs(containerId, lines);
  });
  ipcMain.handle('container:logs', async (_, containerId: string, lines?: number) => {
    return await dockerService.getContainerLogs(containerId, lines);
  });

  ipcMain.handle('docker:remove', async (_, containerId: string) => {
    return await dockerService.removeContainer(containerId);
  });
  ipcMain.handle('container:remove', async (_, containerId: string) => {
    return await dockerService.removeContainer(containerId);
  });

  ipcMain.handle('docker:get-stats', async () => {
    return await dockerService.getContainerStats();
  });
  ipcMain.handle('container:get-stats', async () => {
    return await dockerService.getContainerStats();
  });

  ipcMain.handle('docker:open-terminal', async (_, containerId: string, shellName?: string) => {
    return await dockerService.openContainerTerminal(containerId, shellName);
  });
  ipcMain.handle('container:open-terminal', async (_, containerId: string, shellName?: string) => {
    return await dockerService.openContainerTerminal(containerId, shellName);
  });

  ipcMain.handle(
    'docker:compose-up',
    async (_, composeFilePath: string, options?: { profile?: string; detach?: boolean }) => {
      return await dockerService.composeUp(composeFilePath, options, (chunk) => {
        mainWindow.webContents.send('docker:compose-log-chunk', chunk);
      });
    }
  );
  ipcMain.handle(
    'container:compose-up',
    async (_, composeFilePath: string, options?: { profile?: string; detach?: boolean }) => {
      return await dockerService.composeUp(composeFilePath, options, (chunk) => {
        mainWindow.webContents.send('docker:compose-log-chunk', chunk);
      });
    }
  );

  ipcMain.handle('docker:compose-down', async (_, composeFilePath: string, options?: { profile?: string }) => {
    return await dockerService.composeDown(composeFilePath, options, (chunk) => {
      mainWindow.webContents.send('docker:compose-log-chunk', chunk);
    });
  });
  ipcMain.handle('container:compose-down', async (_, composeFilePath: string, options?: { profile?: string }) => {
    return await dockerService.composeDown(composeFilePath, options, (chunk) => {
      mainWindow.webContents.send('docker:compose-log-chunk', chunk);
    });
  });

  ipcMain.handle('docker:compose-status', async (_, composeFilePath: string, profile?: string) => {
    return await dockerService.composeStatus(composeFilePath, profile);
  });
  ipcMain.handle('container:compose-status', async (_, composeFilePath: string, profile?: string) => {
    return await dockerService.composeStatus(composeFilePath, profile);
  });

  // --- Rede & Detecção de IPs (Local e WSL) ---
  ipcMain.handle('network:get-ips', async () => {
    return await networkService.getNetworkIps();
  });

  ipcMain.handle('network:check-http-health', async (_, url: string, timeoutMs?: number) => {
    return await networkService.checkHttpHealth(url, timeoutMs);
  });

  // --- Métricas do Sistema (CPU, RAM, Uptime) ---
  ipcMain.handle('system:get-metrics', async () => {
    return await networkService.getSystemMetrics();
  });

  // --- Leitor e Monitor de Logs em Tempo Real (Tail -f) ---
  ipcMain.handle('logs:start-watch', async (_, sourceId: string, filePath: string, initialLines?: number, encoding?: string) => {
    return await logWatcherService.startWatch(
      sourceId,
      filePath,
      (event: LogChunkEvent) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('logs:chunk', event);
        }
      },
      initialLines,
      (encoding as BufferEncoding) || 'utf-8'
    );
  });

  ipcMain.handle('logs:stop-watch', async (_, sourceId: string) => {
    return logWatcherService.stopWatch(sourceId);
  });

  ipcMain.handle('logs:check-file', async (_, filePath: string, sourceId?: string) => {
    return logWatcherService.checkFile(filePath, sourceId);
  });

  ipcMain.handle('logs:clear-file', async (_, filePath: string) => {
    return await logWatcherService.clearLogFile(filePath);
  });

  // --- Auto-update (electron-updater / GitHub Releases) ---
  ipcMain.handle('update:check', async () => {
    autoUpdateService?.checkForUpdates();
  });

  ipcMain.handle('update:download', async () => {
    autoUpdateService?.downloadUpdate();
  });

  ipcMain.handle('update:install', async () => {
    autoUpdateService?.quitAndInstall();
  });
}
