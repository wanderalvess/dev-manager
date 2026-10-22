import type {
  DeployProfile,
  DeployStep,
  DeployProfileHistoryEntry,
  DeployProgressEvent,
  OsgiResolutionDiagnosticSummary
} from '../../../../shared/types';
import type { DeployQueueProject } from '../../../../shared/deployQueue';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Perfis de Deploy (Karaf / Docker / Comando Genérico). */
export function createDeployApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // Perfis de Deploy (Karaf / Docker / Comando Genérico)
    runDeployProfile: async (
      profile: DeployProfile
    ): Promise<{ success: boolean; error?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> => {
      return apiFetch('/api/deploy/run-profile', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
    },

    runDeployStep: async (
      step: DeployStep,
      profileName?: string
    ): Promise<{ success: boolean; error?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> => {
      return apiFetch('/api/deploy/run-step', {
        method: 'POST',
        body: JSON.stringify({ step, profileName })
      });
    },

    scanDeployWorkspace: async (): Promise<{ projectsPath: string; projects: DeployQueueProject[] }> => {
      return apiFetch('/api/deploy/scan-workspace');
    },

    abortDeploy: async (): Promise<{ success: boolean }> => {
      return apiFetch('/api/deploy/abort', { method: 'POST' });
    },

    getDeployProfileHistory: async (): Promise<DeployProfileHistoryEntry[]> => {
      return apiFetch('/api/deploy/history');
    },

    clearDeployProfileHistory: async (): Promise<{ success: boolean }> => {
      return apiFetch('/api/deploy/history', { method: 'DELETE' });
    },

    getPomCoordinates: async (projectPath: string) => {
      return apiFetch(`/api/pom/coordinates?path=${encodeURIComponent(projectPath)}`);
    },

    listPomDependencies: async (projectPath: string) => {
      return apiFetch(`/api/pom/dependencies?path=${encodeURIComponent(projectPath)}`);
    },

    updatePomDependencyVersion: async (
      targetProjectPath: string,
      dependency: { artifactId: string; newVersion: string; groupId?: string },
      createBackup?: boolean
    ) => {
      return apiFetch('/api/pom/update-dependency-version', {
        method: 'POST',
        body: JSON.stringify({ targetProjectPath, dependency, createBackup })
      });
    },

    onDeployLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('deploy:log-chunk', callback);
    },

    onDeployStepProgress: (callback: (data: DeployProgressEvent) => void) => {
      return wsManager.subscribe('deploy:step-progress', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
