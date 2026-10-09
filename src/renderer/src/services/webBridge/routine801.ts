import type {
  Routine801CatalogResponse,
  Routine801InstallRequest,
  Routine801InstallResult
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Rotina 801 - Atualização e Instalação de Serviços Web Oficiais. */
export function createRoutine801Api({ apiFetch }: BridgeDeps) {
  return {
    // Rotina 801 - Atualização e Instalação de Serviços Web Oficiais
    routine801GetInstallations: async (customUrl?: string): Promise<Routine801CatalogResponse> => {
      const query = customUrl ? `?url=${encodeURIComponent(customUrl)}` : '';
      return apiFetch(`/api/routine801/instalacao${query}`);
    },

    routine801GetUpdates: async (customUrl?: string): Promise<Routine801CatalogResponse> => {
      const query = customUrl ? `?url=${encodeURIComponent(customUrl)}` : '';
      return apiFetch(`/api/routine801/atualizacao${query}`);
    },

    routine801CheckServer: async (customUrl?: string): Promise<{ ok: boolean; status: number; message: string; url: string }> => {
      const query = customUrl ? `?url=${encodeURIComponent(customUrl)}` : '';
      return apiFetch(`/api/routine801/health${query}`);
    },

    routine801InstallFeatures: async (request: Routine801InstallRequest): Promise<Routine801InstallResult> => {
      return apiFetch('/api/routine801/install', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    }
  } satisfies Partial<ElectronAPI>;
}
