import { ipcRenderer } from 'electron';
import type {
  WshClearCacheResult,
  WshInstallerListResult,
  WshUpdateApplyResult,
  WshUpdateInspectResult,
  WshUpdatePrepareResult,
  WshUpdateProbeResult,
  WshUpdateProgress,
  WshUpdateRequest
} from '../shared/wshUpdate';

/** Canais wsh-update:* do preload: atualizar o jar do WSH de um container. */
export const wshUpdateApi = {
  inspectWshUpdate: (req: WshUpdateRequest): Promise<WshUpdateInspectResult> => ipcRenderer.invoke('wsh-update:inspect', req),
  probeWshInstaller: (version: string): Promise<WshUpdateProbeResult> => ipcRenderer.invoke('wsh-update:probe', version),
  listWshInstallers: (): Promise<WshInstallerListResult> => ipcRenderer.invoke('wsh-update:list-installers'),
  clearWshUpdateCache: (): Promise<WshClearCacheResult> => ipcRenderer.invoke('wsh-update:clear-cache'),
  prepareWshUpdate: (req: WshUpdateRequest): Promise<WshUpdatePrepareResult> => ipcRenderer.invoke('wsh-update:prepare', req),
  applyWshUpdate: (req: WshUpdateRequest): Promise<WshUpdateApplyResult> => ipcRenderer.invoke('wsh-update:apply', req),
  rollbackWshUpdate: (req: WshUpdateRequest & { backup?: string }): Promise<WshUpdateApplyResult> => ipcRenderer.invoke('wsh-update:rollback', req),
  onWshUpdateProgress: (callback: (progress: WshUpdateProgress) => void) => {
    const subscription = (_: unknown, progress: WshUpdateProgress) => callback(progress);
    ipcRenderer.on('wsh-update:progress', subscription);
    return () => {
      ipcRenderer.removeListener('wsh-update:progress', subscription);
    };
  }
};
