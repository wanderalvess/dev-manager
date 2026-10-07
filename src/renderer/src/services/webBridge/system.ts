import type {
  AppSettings,
  PathStatusInfo,
  SelectFileOptions,
  SystemAppInfo,
  NetworkIpInfo,
  SystemMetrics,
  HttpHealthResult,
  UpdateStatus
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Diálogos Nativos do Sistema & Verificação de Caminhos; Rede & Detecção de IPs (Local e WSL); Métricas do Sistema; Auto-update (No modo Web/Docker operações de auto-update desktop são no-op). */
export function createSystemApi({ apiFetch }: BridgeDeps) {
  return {
    // Diálogos Nativos do Sistema & Verificação de Caminhos
    selectDirectory: async (defaultPath?: string): Promise<string | null> => {
      const input = window.prompt('Digite ou cole o caminho do diretório:', defaultPath || '');
      return input && input.trim() ? input.trim() : null;
    },

    selectFile: async (options?: SelectFileOptions): Promise<string | null> => {
      const input = window.prompt(
        'Digite ou cole o caminho completo do arquivo executável:',
        options?.defaultPath || ''
      );
      return input && input.trim() ? input.trim() : null;
    },

    checkPath: async (targetPath: string): Promise<PathStatusInfo> => {
      return apiFetch<PathStatusInfo>(`/api/system/check-path?path=${encodeURIComponent(targetPath)}`);
    },

    autoDetectPaths: async (): Promise<Partial<AppSettings>> => {
      return apiFetch<Partial<AppSettings>>('/api/system/auto-detect');
    },

    getAppInfo: async (): Promise<SystemAppInfo> => {
      return apiFetch<SystemAppInfo>('/api/system/info');
    },

    getChangelog: async (): Promise<string | null> => {
      try {
        const data = await apiFetch<{ content: string | null }>('/api/system/changelog');
        return data.content;
      } catch {
        return null;
      }
    },

    getMcpDocs: async (): Promise<string> => {
      try {
        const data = await apiFetch<{ content: string }>('/api/system/mcp-docs');
        return data.content;
      } catch {
        return '';
      }
    },

    // Rede & Detecção de IPs (Local e WSL)
    getNetworkIps: async (): Promise<NetworkIpInfo> => {
      try {
        return await apiFetch('/api/network/ips');
      } catch {
        return {
          primaryLocalIp: '127.0.0.1',
          localIps: [{ interface: 'Loopback', ip: '127.0.0.1', mac: '00:00:00:00:00:00', type: 'LAN' }],
          wslIp: null,
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'localhost'
        };
      }
    },

    checkHttpHealth: async (url: string, timeoutMs?: number): Promise<HttpHealthResult> => {
      try {
        return await apiFetch('/api/network/health', {
          method: 'POST',
          body: JSON.stringify({ url, timeoutMs })
        });
      } catch {
        return {
          url,
          reachable: false,
          isHealthy: false,
          timeMs: 0,
          responseTimeMs: 0,
          error: 'Servidor Web/Docker offline'
        };
      }
    },

    // Métricas do Sistema
    getSystemMetrics: async (): Promise<SystemMetrics> => {
      try {
        return await apiFetch('/api/system/metrics');
      } catch {
        return {
          cpuUsagePercent: 0,
          totalMemMb: 8192,
          freeMemMb: 4096,
          usedMemMb: 4096,
          memUsagePercent: 50,
          uptimeSeconds: 0,
          totalMemoryMb: 8192,
          freeMemoryMb: 4096,
          usedMemoryMb: 4096,
          memoryUsagePercent: 50
        };
      }
    },

    // Auto-update (No modo Web/Docker operações de auto-update desktop são no-op)
    checkForUpdate: async (): Promise<void> => {},
    downloadUpdate: async (): Promise<void> => {},
    installUpdate: async (): Promise<void> => {},
    onUpdateStatus: (_callback: (status: UpdateStatus) => void): (() => void) => () => {}
  } satisfies Partial<ElectronAPI>;
}
