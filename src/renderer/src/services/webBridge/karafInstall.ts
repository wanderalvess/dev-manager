import type { KarafInstallInfoResponse } from '../../../../shared/karafInstall';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST) do canal karaf:install-info. */
export function createKarafInstallApi({ apiFetch }: BridgeDeps) {
  return {
    getKarafInstallInfo: (): Promise<KarafInstallInfoResponse> => apiFetch('/api/karaf/install')
  } satisfies Partial<ElectronAPI>;
}
