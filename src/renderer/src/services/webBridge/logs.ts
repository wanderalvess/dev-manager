import type {
  LogWatchStatus,
  LogChunkEvent
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Leitor e Monitor de Logs em Tempo Real (Tail -f). */
export function createLogsApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    // Leitor e Monitor de Logs em Tempo Real (Tail -f)
    startLogWatch: async (
      sourceId: string,
      filePath: string,
      initialLines?: number,
      encoding?: string
    ): Promise<{ status: LogWatchStatus; initialLines: string[] }> => {
      try {
        return await apiFetch('/api/logs/start-watch', {
          method: 'POST',
          body: JSON.stringify({ sourceId, filePath, initialLines, encoding })
        });
      } catch (err: any) {
        return {
          status: {
            sourceId,
            filePath,
            exists: false,
            fileSizeBytes: 0,
            watching: false,
            error: err.message || 'Falha ao conectar no servidor'
          },
          initialLines: []
        };
      }
    },

    stopLogWatch: async (sourceId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/logs/stop-watch', {
          method: 'POST',
          body: JSON.stringify({ sourceId })
        });
        return res.success;
      } catch {
        return false;
      }
    },

    checkLogFile: async (filePath: string, sourceId?: string): Promise<LogWatchStatus> => {
      try {
        return await apiFetch('/api/logs/check-file', {
          method: 'POST',
          body: JSON.stringify({ filePath, sourceId })
        });
      } catch (err: any) {
        return {
          sourceId: sourceId || '',
          filePath,
          exists: false,
          fileSizeBytes: 0,
          watching: false,
          error: err.message || 'Falha ao conectar no servidor'
        };
      }
    },

    clearLogFile: async (filePath: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/logs/clear-file', {
          method: 'POST',
          body: JSON.stringify({ filePath })
        });
        return res.success;
      } catch {
        return false;
      }
    },

    onLogChunk: (callback: (event: LogChunkEvent) => void) => {
      return wsManager.subscribe('logs:chunk', callback);
    }
  } satisfies Partial<ElectronAPI>;
}
