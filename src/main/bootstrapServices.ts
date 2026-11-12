import { app, BrowserWindow, Notification, shell } from 'electron';
import path from 'path';
import { registerIpcHandlers } from './ipc/registerIpc';
import { AiUsageService } from './services/AiUsageService';
import { ApiScenarioService } from './services/ApiScenarioService';
import { ApmService, getApmReceiverHandlePath } from './services/ApmService';
import { AuthLockoutTestService } from './services/AuthLockoutTestService';
import { AutoUpdateService } from './services/AutoUpdateService';
import { AzurePipelineService } from './services/AzurePipelineService';
import { BackupSchedulerService } from './services/BackupSchedulerService';
import { BackupService } from './services/BackupService';
import { ConfigService, getAppDataDir } from './services/ConfigService';
import { DatabaseService } from './services/DatabaseService';
import { DelphiBuildService } from './services/DelphiBuildService';
import { DeployService } from './services/DeployService';
import { DockerService } from './services/DockerService';
import { DocsIndexService } from './services/DocsIndexService';
import { GitAzureService } from './services/GitAzureService';
import { HttpClientService } from './services/HttpClientService';
import { HttpCollectionService } from './services/HttpCollectionService';
import { IntegrationTraceService } from './services/IntegrationTraceService';
import { KarafLogPersistenceService } from './services/KarafLogPersistenceService';
import { KarafService } from './services/KarafService';
import { LlmService } from './services/LlmService';
import { LogWatcherService } from './services/LogWatcherService';
import { NetworkService } from './services/NetworkService';
import { notifyUser } from './services/NotificationService';
import { OracleTracerCaptureService } from './services/OracleTracerCaptureService';
import { QaPayloadService } from './services/QaPayloadService';
import { QaRegressionService } from './services/QaRegressionService';
import { RemoteControlService } from './services/RemoteControlService';
import { createRemoteBackend } from './services/remoteControl/remoteBackend';
import { Routine801Service } from './services/Routine801Service';
import { RoutinesService } from './services/RoutinesService';
import { ScenarioHistoryService } from './services/ScenarioHistoryService';
import { TautAutomationService } from './services/TautAutomationService';
import { TestRunnerService } from './services/TestRunnerService';
import { UsageMetricsService } from './services/UsageMetricsService';
import { WindowsService } from './services/WindowsService';
import { safeSend } from './utils/ipcSend';

export interface BootstrappedApp {
  windowsService: WindowsService;
  logWatcherService: LogWatcherService;
}

export function bootstrapServices(getMainWindow: () => BrowserWindow | null): BootstrappedApp {
  const configService = new ConfigService();
  const usageMetricsService = new UsageMetricsService(configService);
  usageMetricsService.attachProcessHooks();
  const karafService = new KarafService(configService);
  const databaseService = new DatabaseService(configService);
  const oracleTracerCaptureService = new OracleTracerCaptureService(databaseService);
  const backupService = new BackupService(configService, databaseService);
  const backupSchedulerService = new BackupSchedulerService(
    configService,
    backupService,
    path.join(getAppDataDir(), 'backup-scheduler.lock')
  );
  backupSchedulerService.onResult = (connectionName, result) => {
    const win = getMainWindow();
    safeSend(win, 'backup:schedule-result', { connectionName, result });
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
  const azurePipelineService = new AzurePipelineService(configService);
  const routinesService = new RoutinesService(configService);
  const docsIndexService = new DocsIndexService(configService, gitAzureService);
  docsIndexService.onWatchReindexComplete = (status) => {
    const win = getMainWindow();
    notifyUser(win, 'docs:reindex-complete', status, {
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
  const autoUpdateService = new AutoUpdateService(
    (status) => {
      const win = getMainWindow();
      safeSend(win, 'update:status', status);
    },
    {
      portable: Boolean(process.env.PORTABLE_EXECUTABLE_FILE),
      currentVersion: app.getVersion(),
      openExternal: (url) => shell.openExternal(url)
    }
  );
  const aiUsageService = new AiUsageService(configService);
  const llmService = new LlmService(configService, docsIndexService, aiUsageService);
  const routine801Service = new Routine801Service(configService, karafService);
  const apmService = new ApmService(5000, { configService, queryHandleFile: getApmReceiverHandlePath() });
  const qaRegressionService = new QaRegressionService(configService, databaseService);
  const qaPayloadService = new QaPayloadService(configService, databaseService);
  const testRunnerService = new TestRunnerService(configService, windowsService, karafService);
  const tautAutomationService = new TautAutomationService(configService, databaseService, testRunnerService);
  const httpCollectionService = new HttpCollectionService();
  const httpClientService = new HttpClientService(httpCollectionService);
  const delphiBuildService = new DelphiBuildService(configService, windowsService);
  const integrationTraceService = new IntegrationTraceService(
    configService,
    databaseService,
    networkService,
    windowsService,
    httpClientService,
    { logWatcherService, apmTraces: apmService }
  );
  const scenarioHistoryService = new ScenarioHistoryService(configService);
  const authLockoutTestService = new AuthLockoutTestService(configService, scenarioHistoryService);
  const apiScenarioService = new ApiScenarioService(configService, databaseService, scenarioHistoryService);
  const remoteControlService = new RemoteControlService(
    createRemoteBackend({
      configService,
      windowsService,
      karafService,
      dockerService,
      deployService,
      backupSchedulerService,
      karafLogPersistenceService,
      sendToWindow: (channel, ...args) => safeSend(getMainWindow(), channel, ...args)
    })
  );
  apmService.onNewTrace = (summary) => {
    const win = getMainWindow();
    safeSend(win, 'apm:new-trace', summary);
  };
  apmService.startReceiver().catch((err) => {
    console.warn('[ApmService] Falha ao iniciar receptor OTLP no boot:', err);
  });

  registerIpcHandlers({
    mainWindow: getMainWindow(),
    windowsService,
    karafService,
    gitAzureService,
    azurePipelineService,
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
    delphiBuildService,
    apmService,
    oracleTracerCaptureService,
    qaRegressionService,
    testRunnerService,
    tautAutomationService,
    qaPayloadService,
    httpClientService,
    httpCollectionService,
    usageMetricsService,
    aiUsageService,
    remoteControlService,
    integrationTraceService,
    authLockoutTestService,
    apiScenarioService,
    scenarioHistoryService
  });

  backupSchedulerService.rescheduleAll();
  autoUpdateService.checkForUpdates();
  const AUTO_UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
  const autoUpdateInterval = setInterval(() => autoUpdateService.checkForUpdates(), AUTO_UPDATE_CHECK_INTERVAL_MS);

  app.on('before-quit', () => {
    clearInterval(autoUpdateInterval);
    logWatcherService.stopAll();
    void databaseService.closeAllSessions();
    usageMetricsService.dispose();
    backupSchedulerService.stopAll();
    void apmService.stopReceiver().catch(() => undefined);
    void remoteControlService.stop().catch(() => undefined);
    void karafService.stopEmbeddedKaraf().catch(() => undefined);
    karafService.stopAllKarafStreams();
  });

  return { windowsService, logWatcherService };
}
