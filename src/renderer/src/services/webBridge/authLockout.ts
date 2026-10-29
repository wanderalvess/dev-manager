import type {
  AuthLockoutDefaults,
  AuthLockoutProgress,
  AuthLockoutRunRequest,
  AuthLockoutRunResult
} from '../../../../shared/authLockoutTypes';
import type { ElectronAPI } from '../../../../preload/index';
import type { BridgeDeps } from './core';

const POLL_MS = 3000;

/** Adaptador web (REST/WebSocket) dos canais auth-lockout:* (Homologação → Bloqueio de Login). */
export function createAuthLockoutApi({ apiFetch, wsManager }: BridgeDeps) {
  const post = <T>(url: string, body: unknown) => apiFetch<T>(url, { method: 'POST', body: JSON.stringify(body) });
  return {
    authLockoutGetDefaults: () => apiFetch<AuthLockoutDefaults>('/api/auth-lockout/defaults'),
    // O servidor responde na hora com um ticket (a execução passa do timeout de requisição do Node); o resultado vem por consulta
    authLockoutRun: async (request: AuthLockoutRunRequest): Promise<AuthLockoutRunResult> => {
      const { ticket } = await post<{ ticket: string }>('/api/auth-lockout/run', request);
      for (;;) {
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        const status = await apiFetch<{ done: boolean; result?: AuthLockoutRunResult }>(`/api/auth-lockout/result/${ticket}`);
        if (status.done && status.result) return status.result;
      }
    },
    authLockoutAbort: async () => (await post<{ success: boolean }>('/api/auth-lockout/abort', {})).success,
    onAuthLockoutProgress: (callback: (progress: AuthLockoutProgress) => void) => wsManager.subscribe('auth-lockout:progress', callback)
  } satisfies Partial<ElectronAPI>;
}
