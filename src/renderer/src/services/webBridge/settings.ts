import type {
  AppSettings
} from '../../../../shared/types';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Configurações. */
export function createSettingsApi({ apiFetch }: BridgeDeps) {
  return {
    // Configurações
    getSettings: async (): Promise<AppSettings> => {
      return apiFetch('/api/settings');
    },

    saveSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
      return apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    },

    exportSettings: async (sanitizePasswords?: boolean): Promise<string> => {
      const data = await apiFetch<{ json: string }>(`/api/settings/export?sanitize=${sanitizePasswords ?? true}`);
      return data.json;
    },

    importSettings: async (jsonString: string): Promise<{ success: boolean; error?: string; settings?: AppSettings; warnings?: string[] }> => {
      return apiFetch('/api/settings/import', {
        method: 'POST',
        body: JSON.stringify({ json: jsonString })
      });
    }
  } satisfies Partial<ElectronAPI>;
}
