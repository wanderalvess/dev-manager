import { ipcMain } from 'electron';
import {
  QaRegressionTemplate,
  QaExecutionRequest,
  QaCoreSearchFilter,
  QaApiFetchRequest,
  TestRunnerConfig
} from '../../../shared/types';
import { safeSend } from '../../utils/ipcSend';
import type { IpcContext } from '../ipcContext';

/** Qualidade: QA Studio, test runners e TAUT. Canais: qa:*, taut:*, test-runner:* */
export function registerQualityHandlers(ctx: IpcContext): void {
  const { mainWindow, qaRegressionService, testRunnerService, tautAutomationService, qaPayloadService } = ctx;

  ipcMain.handle('qa:list-templates', async () => {
    return qaRegressionService.listTemplates();
  });

  ipcMain.handle('qa:get-template', async (_, id: string) => {
    return qaRegressionService.getTemplate(id);
  });

  ipcMain.handle('qa:save-template', async (_, template: QaRegressionTemplate) => {
    return qaRegressionService.saveTemplate(template);
  });

  ipcMain.handle('qa:delete-template', async (_, id: string) => {
    return qaRegressionService.deleteTemplate(id);
  });

  ipcMain.handle('qa:execute-suite', async (_, request: QaExecutionRequest) => {
    return qaRegressionService.executeSuite(request);
  });

  ipcMain.handle('qa:get-templates-dir', async () => {
    return qaRegressionService.getTemplatesDir();
  });

  ipcMain.handle('qa:search-core-payloads', async (_, filter: QaCoreSearchFilter, connectionId?: string) => {
    return qaPayloadService.searchPayloads(filter, connectionId);
  });

  ipcMain.handle('qa:fetch-api-payload', async (_, request: QaApiFetchRequest) => {
    return qaPayloadService.fetchPayloadFromApi(request);
  });

  ipcMain.handle('test-runner:list', async () => {
    return testRunnerService.getRunners();
  });

  ipcMain.handle('test-runner:save', async (_, runner: Partial<TestRunnerConfig>) => {
    return testRunnerService.saveRunner(runner);
  });

  ipcMain.handle('test-runner:delete', async (_, id: string) => {
    testRunnerService.deleteRunner(id);
    return { success: true };
  });

  ipcMain.handle('test-runner:execute', async (_, target: string | TestRunnerConfig) => {
    const runnerId = typeof target === 'string' ? target : target.id;
    return await testRunnerService.executeRunner(target, (chunk) => {
      if (!mainWindow.isDestroyed()) {
        safeSend(mainWindow, 'test-runner:chunk', { runnerId, chunk });
      }
    });
  });

  ipcMain.handle('test-runner:abort', async () => {
    return testRunnerService.abortExecution();
  });

  ipcMain.handle('test-runner:get-history', async () => {
    return testRunnerService.getHistory();
  });

  ipcMain.handle('test-runner:clear-history', async () => {
    testRunnerService.clearHistory();
    return { success: true };
  });

  ipcMain.handle('taut:get-status', async (_, customPath?: string) => {
    return tautAutomationService.getProjectStatus(customPath);
  });

  ipcMain.handle('taut:save-path', async (_, targetPath: string) => {
    tautAutomationService.saveProjectPath(targetPath);
    return { success: true };
  });

  ipcMain.handle('taut:get-coverage', async (_, customPath?: string) => {
    return tautAutomationService.getCoverage(customPath);
  });

  ipcMain.handle('taut:list-specs', async (_, customPath?: string) => {
    return tautAutomationService.listSpecs(customPath);
  });

  ipcMain.handle('taut:sync-env', async (_, customPath?: string, connectionId?: string) => {
    return tautAutomationService.syncEnvFromDevManager(customPath, connectionId);
  });

  ipcMain.handle('taut:process-intake', async (_, csvFile: string, projectPath?: string) => {
    return tautAutomationService.processCsvIntake(csvFile, projectPath);
  });

  ipcMain.handle('taut:run-tests', async (_, options: any) => {
    return tautAutomationService.runTests(options, (chunk) => {
      if (!mainWindow.isDestroyed()) {
        safeSend(mainWindow, 'taut:chunk', { chunk });
      }
    });
  });

  ipcMain.handle('taut:abort-tests', async () => {
    return tautAutomationService.abortExecution();
  });
}
