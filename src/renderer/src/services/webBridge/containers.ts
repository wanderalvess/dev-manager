import type {
  DockerContainerInfo,
  DockerDaemonStatus,
  DockerContainerInspect,
  OracleMaintenanceResult,
  OracleDataPumpParams,
  DockerContainerStats,
  ComposeServiceStatus
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Gerenciador de Containers (Docker / Podman); Ferramentas Especializadas Oracle (INFR-Docker). */
export function createContainersApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // Gerenciador de Containers (Docker / Podman)
    getDockerStatus: async (): Promise<DockerDaemonStatus> => {
      return apiFetch('/api/docker/status');
    },
    getContainerStatus: async (): Promise<DockerDaemonStatus> => {
      return apiFetch('/api/containers/status');
    },

    listDockerContainers: async (): Promise<DockerContainerInfo[]> => {
      return apiFetch('/api/docker/containers');
    },
    listContainers: async (): Promise<DockerContainerInfo[]> => {
      return apiFetch('/api/containers');
    },

    startDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/start`, { method: 'POST' });
      return res.success;
    },
    startContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/start`, { method: 'POST' });
      return res.success;
    },

    stopDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/stop`, { method: 'POST' });
      return res.success;
    },
    stopContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/stop`, { method: 'POST' });
      return res.success;
    },

    restartDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/restart`, { method: 'POST' });
      return res.success;
    },
    restartContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/restart`, { method: 'POST' });
      return res.success;
    },

    getDockerLogs: async (containerId: string, lines?: number): Promise<string> => {
      const res = await apiFetch<{ logs: string }>(`/api/docker/containers/${containerId}/logs?lines=${lines || 200}`);
      return res.logs;
    },
    getContainerLogs: async (containerId: string, lines?: number): Promise<string> => {
      const res = await apiFetch<{ logs: string }>(`/api/containers/${containerId}/logs?lines=${lines || 200}`);
      return res.logs;
    },

    removeDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}`, { method: 'DELETE' });
      return res.success;
    },
    removeContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}`, { method: 'DELETE' });
      return res.success;
    },

    getDockerContainerStats: async (): Promise<DockerContainerStats[]> => {
      try {
        return await apiFetch<DockerContainerStats[]>('/api/docker/stats');
      } catch {
        return [];
      }
    },
    getContainerStats: async (): Promise<DockerContainerStats[]> => {
      try {
        return await apiFetch<DockerContainerStats[]>('/api/containers/stats');
      } catch {
        return [];
      }
    },

    openDockerContainerTerminal: async (containerId: string, shell?: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/terminal`, {
          method: 'POST',
          body: JSON.stringify({ shell })
        });
        return res.success;
      } catch {
        return false;
      }
    },
    openContainerTerminal: async (containerId: string, shell?: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/terminal`, {
          method: 'POST',
          body: JSON.stringify({ shell })
        });
        return res.success;
      } catch {
        return false;
      }
    },

    inspectDockerContainer: async (containerId: string): Promise<DockerContainerInspect | null> => {
      try {
        return await apiFetch<DockerContainerInspect>(`/api/docker/containers/${containerId}/inspect`);
      } catch {
        return null;
      }
    },
    inspectContainer: async (containerId: string): Promise<DockerContainerInspect | null> => {
      try {
        return await apiFetch<DockerContainerInspect>(`/api/containers/${containerId}/inspect`);
      } catch {
        return null;
      }
    },

    pauseDockerContainer: async (containerId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/pause`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },
    pauseContainer: async (containerId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/pause`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },

    unpauseDockerContainer: async (containerId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/unpause`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },
    unpauseContainer: async (containerId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/unpause`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },

    pruneDockerContainers: async (): Promise<{ success: boolean; output: string }> => {
      try {
        return await apiFetch<{ success: boolean; output: string }>('/api/docker/containers/prune', { method: 'POST' });
      } catch (err: any) {
        return { success: false, output: err.message };
      }
    },
    pruneContainers: async (): Promise<{ success: boolean; output: string }> => {
      try {
        return await apiFetch<{ success: boolean; output: string }>('/api/containers/prune', { method: 'POST' });
      } catch (err: any) {
        return { success: false, output: err.message };
      }
    },

    dockerComposeUp: async (
      composeFilePath: string,
      options?: { profile?: string; detach?: boolean; build?: boolean }
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/docker/compose-up', {
        method: 'POST',
        body: JSON.stringify({ composeFilePath, ...options })
      });
    },
    dockerComposeDown: async (
      composeFilePath: string,
      options?: { profile?: string; volumes?: boolean }
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/docker/compose-down', {
        method: 'POST',
        body: JSON.stringify({ composeFilePath, ...options })
      });
    },
    dockerComposeRestart: async (
      composeFilePath: string,
      options?: { profile?: string }
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/docker/compose-restart', {
        method: 'POST',
        body: JSON.stringify({ composeFilePath, ...options })
      });
    },
    dockerComposeLogs: async (
      composeFilePath: string,
      options?: { profile?: string; lines?: number }
    ): Promise<string> => {
      try {
        const res = await apiFetch<{ logs: string }>('/api/docker/compose-logs', {
          method: 'POST',
          body: JSON.stringify({ composeFilePath, ...options })
        });
        return res.logs;
      } catch (err: any) {
        return `Erro ao buscar logs: ${err.message}`;
      }
    },
    dockerComposeStatus: async (composeFilePath: string, profile?: string): Promise<ComposeServiceStatus[]> => {
      try {
        return await apiFetch('/api/docker/compose-status', {
          method: 'POST',
          body: JSON.stringify({ composeFilePath, profile })
        });
      } catch {
        return [];
      }
    },
    onDockerComposeLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('docker:compose-log-chunk', callback);
    },

    // Ferramentas Especializadas Oracle (INFR-Docker)
    execOracleHealth: async (
      containerName: string,
      schema?: string,
      fix?: boolean,
      user?: string,
      password?: string
    ): Promise<OracleMaintenanceResult> => {
      return apiFetch('/api/docker/oracle-health', {
        method: 'POST',
        body: JSON.stringify({ containerName, schema, fix, user, password })
      });
    },
    openOracleSqlPlus: async (containerName: string, user?: string, password?: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/docker/oracle-sqlplus', {
          method: 'POST',
          body: JSON.stringify({ containerName, user, password })
        });
        return res.success;
      } catch {
        return false;
      }
    },
    execOracleDataPump: async (params: OracleDataPumpParams): Promise<OracleMaintenanceResult> => {
      return apiFetch('/api/docker/oracle-datapump', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    },
    openWtaKarafClient: async (containerName: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/docker/wta-karaf-client', {
          method: 'POST',
          body: JSON.stringify({ containerName })
        });
        return res.success;
      } catch {
        return false;
      }
    }
  } satisfies Partial<ElectronAPI>;
}
