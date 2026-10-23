import type {
  GitProjectInfo,
  GitTaskItem,
  CreateTaskBranchOptions,
  GitCommitInfo,
  GitFileStatus,
  GitDiffResult,
  GitCommandResult,
  GitBranchPublishStatus,
  AzurePipelineTarget,
  AzureListBuildsOptions,
  AzureListBuildsResult,
  AzureListArtifactsResult,
  AzureArtifactDownloadResult
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Git & Azure DevOps. */
export function createGitApi({ apiFetch }: BridgeDeps) {
  return {
    // Git & Azure DevOps
    listProjects: async (): Promise<GitProjectInfo[]> => {
      return apiFetch('/api/git/projects');
    },

    getProjectInfo: async (projectPath: string): Promise<GitProjectInfo | null> => {
      return apiFetch(`/api/git/project?path=${encodeURIComponent(projectPath)}`);
    },

    buildPrUrl: async (projectPath: string, targetBranch?: string): Promise<string | null> => {
      const targetParam = targetBranch ? `&targetBranch=${encodeURIComponent(targetBranch)}` : '';
      const data = await apiFetch<{ url: string | null }>(`/api/git/pr-url?path=${encodeURIComponent(projectPath)}${targetParam}`);
      return data.url;
    },

    execGitCommand: async (
      projectPath: string,
      command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'
    ): Promise<GitCommandResult> => {
      return apiFetch('/api/git/command', {
        method: 'POST',
        body: JSON.stringify({ projectPath, command })
      });
    },

    checkoutBranch: async (
      projectPath: string,
      branchName: string,
      createNew?: boolean,
      baseBranch?: string
    ): Promise<GitCommandResult> => {
      return apiFetch('/api/git/checkout', {
        method: 'POST',
        body: JSON.stringify({ projectPath, branchName, createNew, baseBranch })
      });
    },

    createTaskBranch: async (
      projectPath: string,
      options: CreateTaskBranchOptions
    ): Promise<{ success: boolean; output: string; branchName: string }> => {
      return apiFetch('/api/git/create-task-branch', {
        method: 'POST',
        body: JSON.stringify({ projectPath, ...options })
      });
    },

    openFileInIde: async (
      projectPath: string,
      relativePath: string
    ): Promise<{ success: boolean; error?: string }> => {
      return apiFetch('/api/git/open-file-in-ide', {
        method: 'POST',
        body: JSON.stringify({ projectPath, relativePath })
      });
    },

    fetchTasks: async (projectPath?: string, query?: string): Promise<GitTaskItem[]> => {
      const params = new URLSearchParams();
      if (projectPath) params.set('path', projectPath);
      if (query) params.set('query', query);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return apiFetch(`/api/git/tasks${queryStr}`);
    },

    commitAndPush: async (projectPath: string, message: string): Promise<GitCommandResult> => {
      return apiFetch('/api/git/commit-push', {
        method: 'POST',
        body: JSON.stringify({ projectPath, message })
      });
    },

    getBranchPublishStatus: async (projectPath: string): Promise<GitBranchPublishStatus | null> => {
      return apiFetch(`/api/git/branch-publish-status?path=${encodeURIComponent(projectPath)}`);
    },

    publishBranch: async (projectPath: string): Promise<GitCommandResult> => {
      return apiFetch('/api/git/publish-branch', { method: 'POST', body: JSON.stringify({ projectPath }) });
    },

    getCommitHistory: async (projectPath: string, limit?: number): Promise<GitCommitInfo[]> => {
      return apiFetch(`/api/git/commits?path=${encodeURIComponent(projectPath)}&limit=${limit || 10}`);
    },

    getGitStatusDetails: async (projectPath: string): Promise<GitFileStatus[]> => {
      return apiFetch(`/api/git/status-details?path=${encodeURIComponent(projectPath)}`);
    },

    getGitDiff: async (projectPath: string, targetFile?: string): Promise<GitDiffResult> => {
      const fileParam = targetFile ? `&file=${encodeURIComponent(targetFile)}` : '';
      return apiFetch(`/api/git/diff?path=${encodeURIComponent(projectPath)}${fileParam}`);
    },

    getGitUncommittedCounts: async (): Promise<Record<string, number>> => {
      return apiFetch('/api/git/uncommitted-counts');
    },

    azureListBuilds: async (target: AzurePipelineTarget, options?: AzureListBuildsOptions): Promise<AzureListBuildsResult> => {
      return apiFetch('/api/azure-pipelines/builds', { method: 'POST', body: JSON.stringify({ target, options }) });
    },

    azureListArtifacts: async (target: AzurePipelineTarget, buildId: number): Promise<AzureListArtifactsResult> => {
      return apiFetch('/api/azure-pipelines/artifacts', { method: 'POST', body: JSON.stringify({ target, buildId }) });
    },

    azureDownloadArtifact: async (
      target: AzurePipelineTarget,
      buildId: number,
      buildNumber: string,
      artifactName: string
    ): Promise<AzureArtifactDownloadResult> => {
      return apiFetch('/api/azure-pipelines/download', {
        method: 'POST',
        body: JSON.stringify({ target, buildId, buildNumber, artifactName })
      });
    },

    azureGetArtifactsDir: async (): Promise<string> => {
      const data = await apiFetch<{ dir: string }>('/api/azure-pipelines/artifacts-dir');
      return data.dir;
    },

    openExternal: async (url: string): Promise<boolean> => {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
  } satisfies Partial<ElectronAPI>;
}
