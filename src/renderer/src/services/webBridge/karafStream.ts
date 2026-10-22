import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais karaf:stream-* (log:tail ao vivo). */
export function createKarafStreamApi({ apiFetch, wsManager }: BridgeDeps) {
  const post = <T>(url: string, body: unknown) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
  return {
    startKarafStream: (command: string) => post<{ success: true; id: string } | { success: false; error: string }>('/api/karaf/stream/start', { command }),
    stopKarafStream: (id: string) => post<{ success: boolean }>('/api/karaf/stream/stop', { id }),
    onKarafStreamEnd: (callback: (event: { id: string; code: number }) => void) =>
      wsManager.subscribe('karaf:stream-end', callback)
  } satisfies Partial<ElectronAPI>;
}
