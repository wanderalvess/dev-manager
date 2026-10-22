import { ipcRenderer } from 'electron';

/** Canais karaf:stream-* do preload (log:tail ao vivo), isolados para não crescer o index.ts. */
export const karafStreamApi = {
  startKarafStream: (command: string): Promise<{ success: true; id: string } | { success: false; error: string }> =>
    ipcRenderer.invoke('karaf:stream-start', command),
  stopKarafStream: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('karaf:stream-stop', id),
  onKarafStreamEnd: (callback: (event: { id: string; code: number }) => void) => {
    const subscription = (_: any, event: { id: string; code: number }) => callback(event);
    ipcRenderer.on('karaf:stream-end', subscription);
    return () => {
      ipcRenderer.removeListener('karaf:stream-end', subscription);
    };
  }
};
