import { ipcMain } from 'electron';
import { CreateTaskBranchOptions, AzurePipelineTarget, AzureListBuildsOptions } from '../../../shared/types';
import type { IpcContext } from '../ipcContext';

/** Git e Azure DevOps. Canais: git:* */
export function registerGitHandlers(ctx: IpcContext): void {
  const { gitAzureService, azurePipelineService } = ctx;

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
    async (_, projectPath: string, branchName: string, createNew?: boolean, baseBranch?: string) => {
      return await gitAzureService.checkoutBranch(projectPath, branchName, createNew, baseBranch);
    }
  );

  ipcMain.handle('git:create-task-branch', async (_, projectPath: string, options: CreateTaskBranchOptions) => {
    return await gitAzureService.createTaskBranch(projectPath, options);
  });

  ipcMain.handle('git:open-file-in-ide', async (_, projectPath: string, relativePath: string) => {
    return await gitAzureService.openFileInIde(projectPath, relativePath);
  });

  ipcMain.handle('git:fetch-tasks', async (_, projectPath?: string, query?: string) => {
    return await gitAzureService.fetchTasks(projectPath, query);
  });

  ipcMain.handle('git:commit-and-push', async (_, projectPath: string, message: string) => {
    return await gitAzureService.commitAndPush(projectPath, message);
  });

  ipcMain.handle('git:get-branch-publish-status', async (_, projectPath: string) => {
    return await gitAzureService.getBranchPublishStatus(projectPath);
  });

  ipcMain.handle('git:publish-branch', async (_, projectPath: string) => {
    return await gitAzureService.publishBranch(projectPath);
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

  ipcMain.handle('git:get-uncommitted-counts', async () => {
    return await gitAzureService.getUncommittedCounts();
  });

  // Artefatos do Azure Pipelines
  ipcMain.handle('git:azure-list-builds', async (_, target: AzurePipelineTarget, options?: AzureListBuildsOptions) => {
    return await azurePipelineService.listBuilds(target, options);
  });

  ipcMain.handle('git:azure-list-artifacts', async (_, target: AzurePipelineTarget, buildId: number) => {
    return await azurePipelineService.listArtifacts(target, buildId);
  });

  ipcMain.handle(
    'git:azure-download-artifact',
    async (_, target: AzurePipelineTarget, buildId: number, buildNumber: string, artifactName: string) => {
      return await azurePipelineService.downloadArtifact(target, buildId, buildNumber, artifactName);
    }
  );

  ipcMain.handle('git:azure-artifacts-dir', async () => {
    return azurePipelineService.getArtifactsDir();
  });
}
