import { ipcRenderer } from 'electron';
import type { RemoteControlStatus } from '../shared/remoteControl';

/** Canais remote:* do preload (controle remoto pelo celular), isolados para não crescer o index.ts. */
export const remoteControlApi = {
  getRemoteControlStatus: (): Promise<RemoteControlStatus> => ipcRenderer.invoke('remote:get-status'),
  startRemoteControl: (): Promise<RemoteControlStatus> => ipcRenderer.invoke('remote:start'),
  stopRemoteControl: (): Promise<RemoteControlStatus> => ipcRenderer.invoke('remote:stop'),
  regenerateRemoteControlKey: (): Promise<RemoteControlStatus> => ipcRenderer.invoke('remote:regenerate-key')
};
