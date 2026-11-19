import { ipcRenderer } from 'electron';
import type {
  TerminalCreateRequest,
  TerminalDataEvent,
  TerminalExitEvent,
  TerminalProfile,
  TerminalSessionInfo
} from '../shared/terminalTypes';

/** Canais terminal:* do preload para sessões interativas de shell (PowerShell, CMD, Bash, WSL, SSH). */
export const terminalApi = {
  listTerminalProfiles: (): Promise<TerminalProfile[]> => ipcRenderer.invoke('terminal:list-profiles'),
  createTerminalSession: (req: TerminalCreateRequest): Promise<TerminalSessionInfo> =>
    ipcRenderer.invoke('terminal:create-session', req),
  sendTerminalInput: (sessionId: string, input: string): Promise<boolean> =>
    ipcRenderer.invoke('terminal:send-input', sessionId, input),
  interruptTerminalSession: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('terminal:interrupt-session', sessionId),
  closeTerminalSession: (sessionId: string): Promise<boolean> =>
    ipcRenderer.invoke('terminal:close-session', sessionId),
  onTerminalData: (callback: (event: TerminalDataEvent) => void) => {
    const subscription = (_: unknown, event: TerminalDataEvent) => callback(event);
    ipcRenderer.on('terminal:data', subscription);
    return () => {
      ipcRenderer.removeListener('terminal:data', subscription);
    };
  },
  onTerminalExit: (callback: (event: TerminalExitEvent) => void) => {
    const subscription = (_: unknown, event: TerminalExitEvent) => callback(event);
    ipcRenderer.on('terminal:exit', subscription);
    return () => {
      ipcRenderer.removeListener('terminal:exit', subscription);
    };
  }
};
