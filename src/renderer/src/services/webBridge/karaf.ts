import type {
  KarafDeployRequest,
  KarafDeployHistoryEntry,
  DocsIndexStatus
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Karaf: deploy, console embutido, build e logs. */
export function createKarafApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // Karaf Deployer & Console Embutido
    startEmbeddedKaraf: async (): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/karaf/embedded/start', {
        method: 'POST'
      });
      return data.success;
    },

    sendKarafInput: async (input: string): Promise<boolean> => {
      wsManager.send('karaf:input', input);
      return true;
    },

    stopEmbeddedKaraf: async (): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/karaf/embedded/stop', {
        method: 'POST'
      });
      return data.success;
    },

    isEmbeddedKarafRunning: async (): Promise<boolean> => {
      const data = await apiFetch<{ isRunning: boolean }>('/api/karaf/embedded/status');
      return data.isRunning;
    },

    isKarafRunning: async (sshPort?: number): Promise<boolean> => {
      const query = sshPort ? `?port=${sshPort}` : '';
      const data = await apiFetch<{ isRunning: boolean }>(`/api/karaf/status${query}`);
      return data.isRunning;
    },

    onKarafStdout: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('karaf:stdout', callback);
    },
    getKarafPersistedLogs: async (maxChars?: number): Promise<{ output: string }> => {
      const query = maxChars ? `?maxChars=${maxChars}` : '';
      return apiFetch(`/api/karaf/embedded/persisted-logs${query}`);
    },
    clearKarafPersistedLogs: async (): Promise<{ success: boolean }> => {
      return apiFetch('/api/karaf/embedded/persisted-logs/clear', { method: 'POST' });
    },

    deployKaraf: async (request: KarafDeployRequest): Promise<{ success: boolean; error?: string }> => {
      return apiFetch('/api/karaf/deploy', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    buildAndDeployKaraf: async (
      request: KarafDeployRequest,
      projectPath: string,
      skipTests: boolean = true
    ): Promise<{ success: boolean; error?: string }> => {
      return apiFetch('/api/karaf/build-and-deploy', {
        method: 'POST',
        body: JSON.stringify({ request, projectPath, skipTests })
      });
    },

    runMavenBuild: async (
      projectPath: string,
      skipTests: boolean = true
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/karaf/run-maven-build', {
        method: 'POST',
        body: JSON.stringify({ projectPath, skipTests })
      });
    },

    execKarafDiagnostic: async (command: string): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/karaf/exec', {
        method: 'POST',
        body: JSON.stringify({ command })
      });
    },

    getKarafDeployHistory: async (): Promise<KarafDeployHistoryEntry[]> => {
      return apiFetch('/api/karaf/deploy-history');
    },

    onKarafDeployResult: (callback: (result: { success: boolean; error?: string }) => void) => {
      return wsManager.subscribe('karaf:deploy-result', callback);
    },
    onKarafBuildResult: (callback: (result: { code: number; stdout: string; stderr: string }) => void) => {
      return wsManager.subscribe('karaf:build-result', callback);
    },
    onDocsReindexComplete: (callback: (status: DocsIndexStatus) => void) => {
      return wsManager.subscribe('docs:reindex-complete', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
