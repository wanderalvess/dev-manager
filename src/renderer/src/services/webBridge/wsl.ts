import type {
  DockerDaemonStatus,
  WslDistroInfo,
  WslActionResult,
  ContainerEnvironment,
  WslDumpFileInfo,
  WshPrerequisiteStatus,
  WslSnapshotFileInfo,
  WslSnapshotActionResult,
  InfrDockerScriptStatus
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: WSL & Container Environments. */
export function createWslApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // WSL & Container Environments
    listWslDistros: async (): Promise<WslDistroInfo[]> => {
      try {
        return await apiFetch<WslDistroInfo[]>('/api/wsl/distros');
      } catch {
        return [];
      }
    },
    startWslDockerDaemon: async (distro: string): Promise<WslActionResult> => {
      try {
        return await apiFetch<WslActionResult>('/api/wsl/start-docker-daemon', {
          method: 'POST',
          body: JSON.stringify({ distro })
        });
      } catch (err: any) {
        return { success: false, message: err.message || 'Falha ao iniciar Docker daemon' };
      }
    },
    terminateWslDistro: async (distro: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/wsl/distros/${distro}/terminate`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },
    openWslTerminal: async (distro: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/wsl/distros/${distro}/terminal`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },
    getWslDistroIp: async (distro?: string): Promise<string | null> => {
      try {
        if (!distro) return null;
        const res = await apiFetch<{ ip: string | null }>(`/api/wsl/distros/${distro}/ip`);
        return res.ip;
      } catch {
        return null;
      }
    },
    openWslDumpsFolder: async (distro?: string): Promise<{ success: boolean; path: string; error?: string }> => {
      try {
        return await apiFetch('/api/wsl/open-dumps', {
          method: 'POST',
          body: JSON.stringify({ distro })
        });
      } catch (err: any) {
        return { success: false, path: '', error: err?.message || String(err) };
      }
    },
    listWslDmpFiles: async (distro?: string): Promise<WslDumpFileInfo[]> => {
      try {
        const query = distro ? `?distro=${encodeURIComponent(distro)}` : '';
        return await apiFetch<WslDumpFileInfo[]>(`/api/wsl/dumps${query}`);
      } catch {
        return [];
      }
    },
    generateMd5: async (text: string): Promise<{ lower: string; upper: string }> => {
      try {
        return await apiFetch('/api/wsl/md5', {
          method: 'POST',
          body: JSON.stringify({ text })
        });
      } catch {
        return { lower: '', upper: '' };
      }
    },
    checkWshPrerequisites: async (distro?: string): Promise<WshPrerequisiteStatus[]> => {
      try {
        const query = distro ? `?distro=${encodeURIComponent(distro)}` : '';
        return await apiFetch<WshPrerequisiteStatus[]>(`/api/wsl/wsh-prerequisites${query}`);
      } catch {
        return [];
      }
    },
    openWslOptFolder: async (distro?: string): Promise<{ success: boolean; path: string; error?: string }> => {
      try {
        return await apiFetch('/api/wsl/open-opt', {
          method: 'POST',
          body: JSON.stringify({ distro })
        });
      } catch (err: any) {
        return { success: false, path: '', error: err?.message || String(err) };
      }
    },
    getWslSnapshotsDir: async (): Promise<string> => {
      try {
        const res = await apiFetch<{ dir: string }>('/api/wsl/snapshots-dir');
        return res.dir || '';
      } catch {
        return '';
      }
    },
    setWslSnapshotsDir: async (dir: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/wsl/snapshots-dir', {
          method: 'PUT',
          body: JSON.stringify({ dir })
        });
        return res.success;
      } catch {
        return false;
      }
    },
    listWslSnapshots: async (dir?: string): Promise<WslSnapshotFileInfo[]> => {
      try {
        const query = dir ? `?dir=${encodeURIComponent(dir)}` : '';
        return await apiFetch<WslSnapshotFileInfo[]>(`/api/wsl/snapshots${query}`);
      } catch {
        return [];
      }
    },
    importWslSnapshot: async (params: { distroName: string; installDir: string; tarPath: string }): Promise<WslSnapshotActionResult> => {
      try {
        return await apiFetch<WslSnapshotActionResult>('/api/wsl/import', {
          method: 'POST',
          body: JSON.stringify(params)
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    exportWslSnapshot: async (params: { distroName: string; outputPath: string }): Promise<WslSnapshotActionResult> => {
      try {
        return await apiFetch<WslSnapshotActionResult>('/api/wsl/export', {
          method: 'POST',
          body: JSON.stringify(params)
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    unregisterWslDistro: async (distroName: string): Promise<WslSnapshotActionResult> => {
      try {
        return await apiFetch<WslSnapshotActionResult>(`/api/wsl/distros/${encodeURIComponent(distroName)}`, {
          method: 'DELETE'
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    checkInfrDockerScripts: async (customPath?: string): Promise<InfrDockerScriptStatus[]> => {
      try {
        const query = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
        return await apiFetch<InfrDockerScriptStatus[]>(`/api/infr/scripts${query}`);
      } catch {
        return [];
      }
    },
    runInfrSetupScript: async (scriptType: 'oracle' | 'wta' | 'wsh', options: any): Promise<{ success: boolean; output: string }> => {
      try {
        return await apiFetch<{ success: boolean; output: string }>('/api/infr/run-script', {
          method: 'POST',
          body: JSON.stringify({ scriptType, options })
        });
      } catch (err: any) {
        return { success: false, output: err.message };
      }
    },
    setDockerTargetWslDistro: async (distro: string | null): Promise<DockerDaemonStatus> => {
      return apiFetch('/api/wsl/target-distro', {
        method: 'POST',
        body: JSON.stringify({ distro })
      });
    },
    getContainerEnvironments: async (): Promise<{ environments: ContainerEnvironment[]; snapshotsDir?: string }> => {
      return apiFetch('/api/wsl/environments');
    },
    saveContainerEnvironment: async (env: ContainerEnvironment): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>('/api/wsl/environments', {
        method: 'PUT',
        body: JSON.stringify(env)
      });
      return res.success;
    },
    deleteContainerEnvironment: async (id: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/wsl/environments/${id}`, {
        method: 'DELETE'
      });
      return res.success;
    },
    startContainerSequence: async (containers: { name: string; delay?: number }[]) => {
      return apiFetch('/api/docker/start-sequence', {
        method: 'POST',
        body: JSON.stringify({ containers })
      });
    },
    onContainerSequenceProgress: (callback: (step: any) => void) => {
      return wsManager.subscribe('docker:sequence-progress', callback);
    },
    stopContainerSequence: async (containers: string[]) => {
      return apiFetch('/api/docker/stop-sequence', {
        method: 'POST',
        body: JSON.stringify({ containers })
      });
    },
    onContainerStopSequenceProgress: (callback: (step: any) => void) => {
      return wsManager.subscribe('docker:stop-sequence-progress', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
