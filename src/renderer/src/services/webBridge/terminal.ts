import type { ElectronAPI } from '../../../../preload/index';
import type {
  TerminalCreateRequest,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalProfile,
  TerminalSessionInfo
} from '../../../../shared/terminalTypes';
import type { BridgeDeps } from './core';

/** Adaptador web (REST/WebSocket) dos canais: Terminal Integrado. */
export function createTerminalApi({ apiFetch, wsManager }: BridgeDeps) {
  return {
    listTerminalProfiles: async (): Promise<TerminalProfile[]> => {
      try {
        return await apiFetch<TerminalProfile[]>('/api/terminal/profiles');
      } catch {
        return [];
      }
    },
    createTerminalSession: async (req: TerminalCreateRequest): Promise<TerminalSessionInfo> => {
      return await apiFetch<TerminalSessionInfo>('/api/terminal/sessions', {
        method: 'POST',
        body: JSON.stringify(req)
      });
    },
    sendTerminalInput: async (sessionId: string, input: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ ok: boolean }>(`/api/terminal/sessions/${encodeURIComponent(sessionId)}/input`, {
          method: 'POST',
          body: JSON.stringify({ input })
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    interruptTerminalSession: async (sessionId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ ok: boolean }>(`/api/terminal/sessions/${encodeURIComponent(sessionId)}/interrupt`, {
          method: 'POST'
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    closeTerminalSession: async (sessionId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ ok: boolean }>(`/api/terminal/sessions/${encodeURIComponent(sessionId)}`, {
          method: 'DELETE'
        });
        return res.ok;
      } catch {
        return false;
      }
    },
    onTerminalData: (cb: (event: TerminalDataEvent) => void) => wsManager.subscribe('terminal:data', cb),
    onTerminalExit: (cb: (event: TerminalExitEvent) => void) => wsManager.subscribe('terminal:exit', cb)
  } satisfies Partial<ElectronAPI>;
}
