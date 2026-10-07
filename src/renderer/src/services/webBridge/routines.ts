import type {
  AppSettings,
  RoutineItem,
  RoutineLaunchResult,
  RoutineDownloadRequest,
  RoutineDownloadResult,
  RoutineBackupEntry,
  RoutineRollbackResult,
  ExecutableVersionInfo,
  BatchRoutineDownloadRequest,
  BatchRoutineItemProgress,
  BatchRoutineDownloadResult,
  CcwCatalogResponse,
  KarafWtaStatusResult
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Catálogo de Rotinas. */
export function createRoutinesApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // Catálogo de Rotinas
    listRoutines: async (): Promise<RoutineItem[]> => {
      return apiFetch('/api/routines');
    },

    launchRoutine: async (fullPath: string, forceDirect?: boolean): Promise<RoutineLaunchResult> => {
      return apiFetch<RoutineLaunchResult>('/api/routines/launch', {
        method: 'POST',
        body: JSON.stringify({ fullPath, forceDirect })
      });
    },

    checkRoutineKarafStatus: async (): Promise<KarafWtaStatusResult> => {
      return apiFetch<KarafWtaStatusResult>('/api/routines/karaf-status');
    },

    launchMappedProgram: async (id: string): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/routines/launch-mapped', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      return data.success;
    },

    toggleFavoriteRoutine: async (id: string): Promise<AppSettings> => {
      return apiFetch('/api/routines/favorite', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
    },

    downloadCcwRoutine: async (req: RoutineDownloadRequest): Promise<RoutineDownloadResult> => {
      return apiFetch('/api/routines/download-ccw', {
        method: 'POST',
        body: JSON.stringify(req)
      });
    },

    installLocalRoutineFile: async (
      filePath: string,
      routineCodeOrName?: string,
      targetModule?: string,
      backupExisting?: boolean
    ): Promise<RoutineDownloadResult> => {
      return apiFetch('/api/routines/install-local', {
        method: 'POST',
        body: JSON.stringify({ filePath, routineCodeOrName, targetModule, backupExisting })
      });
    },

    getCcwCatalog: async (authCookie?: string): Promise<CcwCatalogResponse> => {
      const query = authCookie ? `?authCookie=${encodeURIComponent(authCookie)}` : '';
      return apiFetch(`/api/routines/ccw-catalog${query}`);
    },

    getCcwDownloadUrl: async (routineName: string, winthorVersion?: string): Promise<string> => {
      const params = new URLSearchParams({ routineName });
      if (winthorVersion) params.set('winthorVersion', winthorVersion);
      const data = await apiFetch<{ url: string }>(`/api/routines/ccw-download-url?${params.toString()}`);
      return data.url;
    },

    listRoutineBackups: async (routineIdOrName: string, moduleFolder?: string): Promise<RoutineBackupEntry[]> => {
      const params = new URLSearchParams({ routine: routineIdOrName });
      if (moduleFolder) params.set('moduleFolder', moduleFolder);
      return apiFetch(`/api/routines/backups?${params.toString()}`);
    },

    restoreRoutineBackup: async (backupFilePath: string, targetRoutinePath: string): Promise<RoutineRollbackResult> => {
      return apiFetch('/api/routines/restore-backup', {
        method: 'POST',
        body: JSON.stringify({ backupFilePath, targetRoutinePath })
      });
    },

    deleteRoutineBackup: async (backupFilePath: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      return apiFetch('/api/routines/backup', {
        method: 'DELETE',
        body: JSON.stringify({ backupFilePath })
      });
    },

    getRoutineExecutableVersion: async (filePath: string): Promise<ExecutableVersionInfo | null> => {
      const params = new URLSearchParams({ filePath });
      return apiFetch(`/api/routines/version-info?${params.toString()}`);
    },

    downloadRoutinesBatch: async (request: BatchRoutineDownloadRequest): Promise<BatchRoutineDownloadResult> => {
      return apiFetch('/api/routines/batch-download', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    onRoutineBatchProgress: (callback: (progress: BatchRoutineItemProgress) => void) => {
      return wsManager.subscribe('routines:batch-progress', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
