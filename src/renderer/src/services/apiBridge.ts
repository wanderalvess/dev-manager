import type { ElectronAPI } from '../../../preload/electronAPI';
import type { AppSettings, EnvironmentLog } from '../../../shared/types';

type WsListener = (payload: any) => void;
const wsListeners = new Map<string, Set<WsListener>>();

function subscribeWs(channel: string, cb: WsListener): () => void {
  let set = wsListeners.get(channel);
  if (!set) {
    set = new Set();
    wsListeners.set(channel, set);
  }
  set.add(cb);
  return () => {
    set?.delete(cb);
  };
}

let wsStarted = false;
function ensureWebSocket() {
  if (wsStarted || typeof window === 'undefined') return;
  wsStarted = true;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const connect = () => {
    try {
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          const set = wsListeners.get(msg.channel);
          set?.forEach((cb) => cb(msg.payload));
        } catch {
          // ignore invalid frame
        }
      };
      ws.onclose = () => {
        setTimeout(connect, 4000);
      };
    } catch {
      // ignore in headless test
    }
  };
  connect();
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function installWebApiBridge(): void {
  if (typeof window === 'undefined') return;
  ensureWebSocket();
  if (window.electronAPI) return;

  const bridge: Partial<ElectronAPI> = {
    getAppInfo: () => apiFetch('/api/system/info'),
    getChangelog: async () => {
      const data = await apiFetch<{ content: string }>('/api/system/changelog');
      return data.content;
    },
    getMcpDocs: async () => {
      const data = await apiFetch<{ content: string }>('/api/system/mcp-docs');
      return data.content;
    },
    getSystemMetrics: () => apiFetch('/api/system/metrics'),
    getNetworkIps: () => apiFetch('/api/network/ips'),
    getSettings: () => apiFetch('/api/settings'),
    saveSettings: (partial: Partial<AppSettings>) =>
      apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(partial) }),
    exportSettings: async () => JSON.stringify(await apiFetch('/api/settings'), null, 2),
    importSettings: async (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        const settings = await apiFetch<AppSettings>('/api/settings', { method: 'PUT', body: JSON.stringify(parsed) });
        return { success: true, settings };
      } catch (e: any) {
        return { success: false, error: e?.message || 'JSON inválido' };
      }
    },
    getServicesStatus: () => apiFetch('/api/env/services'),
    getProcessesStatus: () => apiFetch('/api/env/processes'),
    checkPorts: () => apiFetch('/api/env/ports'),
    startService: async (name: string) => {
      await apiFetch(`/api/env/services/${encodeURIComponent(name)}/start`, { method: 'POST' });
      return true;
    },
    stopService: async (name: string) => {
      await apiFetch(`/api/env/services/${encodeURIComponent(name)}/stop`, { method: 'POST' });
      return true;
    },
    batchKillProcesses: (names: string[]) =>
      apiFetch('/api/env/processes/kill', { method: 'POST', body: JSON.stringify({ names }) }),
    runProfile: (profile) =>
      apiFetch('/api/env/run-profile', { method: 'POST', body: JSON.stringify({ profile }) }),
    onEnvLog: (cb: (log: EnvironmentLog) => void) => subscribeWs('env:log', cb),
    onProfileStepProgress: (cb) => subscribeWs('env:profile-progress', cb),

    // Karaf
    isEmbeddedKarafRunning: async () => (await apiFetch<{ running: boolean }>('/api/karaf/status')).running,
    isKarafRunning: async () => (await apiFetch<{ running: boolean }>('/api/karaf/status')).running,
    startEmbeddedKaraf: async () => {
      await apiFetch('/api/karaf/start', { method: 'POST' });
      return true;
    },
    stopEmbeddedKaraf: async () => {
      await apiFetch('/api/karaf/stop', { method: 'POST' });
      return true;
    },
    sendKarafInput: async (input: string) => {
      await apiFetch('/api/karaf/command', { method: 'POST', body: JSON.stringify({ command: input }) });
      return true;
    },
    execKarafDiagnostic: async (command: string) => {
      const res = await apiFetch<{ success: boolean; output: string }>('/api/karaf/command', {
        method: 'POST',
        body: JSON.stringify({ command, stream: false })
      });
      return { code: res.success ? 0 : 1, stdout: res.output, stderr: '' };
    },
    getKarafPersistedLogs: async () => {
      const status = await apiFetch<{ logs: string[] }>('/api/karaf/status');
      return { output: status.logs.join('\n') };
    },
    clearKarafPersistedLogs: async () => ({ success: true }),
    onKarafStdout: (cb: (chunk: string) => void) => subscribeWs('karaf:stdout', cb),
    listKarafBundles: () => apiFetch('/api/karaf/bundles'),
    manageKarafBundle: (action, bundleId) =>
      apiFetch(`/api/karaf/bundles/${encodeURIComponent(bundleId)}/${action}`, { method: 'POST' }),
    listKarafFeatures: () => apiFetch('/api/karaf/features'),

    // Git & Docs & HTTP
    listProjects: () => apiFetch('/api/git/projects'),
    searchDocs: (query: string) => apiFetch(`/api/docs/search?q=${encodeURIComponent(query)}`),
    getDocsIndexStatus: () => apiFetch('/api/docs/status'),
    reindexDocs: () => apiFetch('/api/docs/status'),
    probeHttpEndpoint: (req) => apiFetch('/api/http/probe', { method: 'POST', body: JSON.stringify(req) }),
    listRoutines: () => apiFetch('/api/routines'),
    listDockerContainers: () => apiFetch('/api/containers/list'),
    getDockerStatus: () => apiFetch('/api/containers/status'),
    getDockerContainerStats: () => apiFetch('/api/containers/stats'),
    startDockerContainer: async (id: string) => {
      await apiFetch(`/api/containers/${id}/start`, { method: 'POST' });
      return true;
    },
    stopDockerContainer: async (id: string) => {
      await apiFetch(`/api/containers/${id}/stop`, { method: 'POST' });
      return true;
    },
    restartDockerContainer: async (id: string) => {
      await apiFetch(`/api/containers/${id}/restart`, { method: 'POST' });
      return true;
    },
    executeDbQuery: (_config, sql, maxRows, binds) =>
      apiFetch('/api/db/execute', { method: 'POST', body: JSON.stringify({ sql, maxRows, binds, connectionName: _config?.name }) }),
    listDbTables: () => apiFetch('/api/db/tables'),
    getDbTableColumns: (_config, tableName) => apiFetch(`/api/db/columns/${encodeURIComponent(tableName)}`),
    testDbConnection: (config) => apiFetch('/api/db/test', { method: 'POST', body: JSON.stringify(config) }),
    openExternal: async (url: string) => {
      console.info('External URL:', url);
      return true;
    }
  };

  window.electronAPI = new Proxy(bridge as ElectronAPI, {
    get(target, prop: string) {
      if (prop in target) return (target as any)[prop];
      // Graceful fallback for optional desktop-only hooks
      if (prop.startsWith('on')) return () => () => {};
      return async () => ({});
    }
  });
}
