import { ipcRenderer } from 'electron';
import type { KarafInstallInfoResponse } from '../shared/karafInstall';

/** Canal karaf:install-info do preload (o que o etc/ da instalação diz), isolado para não crescer o index.ts. */
export const karafInstallApi = {
  getKarafInstallInfo: (): Promise<KarafInstallInfoResponse> => ipcRenderer.invoke('karaf:install-info')
};
