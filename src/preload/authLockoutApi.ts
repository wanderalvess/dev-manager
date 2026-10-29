import { ipcRenderer } from 'electron';
import type {
  AuthLockoutDefaults,
  AuthLockoutProgress,
  AuthLockoutRunRequest,
  AuthLockoutRunResult
} from '../shared/authLockoutTypes';

/** Canais auth-lockout:* do preload (Homologação → Bloqueio de Login), isolados para não crescer o index.ts. */
export const authLockoutApi = {
  authLockoutGetDefaults: (): Promise<AuthLockoutDefaults> => ipcRenderer.invoke('auth-lockout:get-defaults'),
  authLockoutRun: (request: AuthLockoutRunRequest): Promise<AuthLockoutRunResult> => ipcRenderer.invoke('auth-lockout:run', request),
  authLockoutAbort: (): Promise<boolean> => ipcRenderer.invoke('auth-lockout:abort'),
  onAuthLockoutProgress: (callback: (progress: AuthLockoutProgress) => void) => {
    const subscription = (_: any, progress: AuthLockoutProgress) => callback(progress);
    ipcRenderer.on('auth-lockout:progress', subscription);
    return () => {
      ipcRenderer.removeListener('auth-lockout:progress', subscription);
    };
  }
};
