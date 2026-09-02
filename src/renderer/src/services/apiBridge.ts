import type {
  AppSettings,
  KarafDeployRequest,
  EnvironmentLog,
  PortStatus,
  ServiceStatus,
  ProcessStatus,
  TrackedServiceConfig,
  TrackedProcessConfig,
  EnvironmentAutomationConfig,
  AutomationProfile,
  AutomationStep,
  ProfileExecutionResult,
  GitProjectInfo,
  RoutineItem,
  WinthorRoutine,
  PomInfo,
  PathStatusInfo,
  SelectFileOptions,
  SystemAppInfo
} from '../../../shared/types';

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: any = null;

  constructor() {
    this.connect();
  }

  private connect() {
    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Conectado ao servidor Dev Manager');
      };

      this.ws.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          const callbacks = this.listeners.get(type);
          if (callbacks) {
            callbacks.forEach((cb) => cb(data));
          }
        } catch (err) {
          console.error('[WebSocket] Erro ao processar mensagem:', err);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (err) {
      console.warn('[WebSocket] Falha na conexão:', err);
    }
  }

  public subscribe(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  public send(type: string, data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }
}

export function initApiBridge() {
  if (typeof window === 'undefined') return;

  // Se já existe electronAPI injetado pelo Electron Desktop, não sobrescreve
  if (window.electronAPI) {
    console.log('[API Bridge] Executando em ambiente Electron Desktop nativo.');
    return;
  }

  console.log('[API Bridge] Inicializando Web Adapter (Modo Docker / Navegador)...');

  const wsManager = new WebSocketManager();

  const apiFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
    let res: Response;
    try {
      res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options?.headers || {})
        }
      });
    } catch (err: any) {
      throw new Error(`Falha de rede ao contatar servidor Web/Docker. O backend está rodando? Erro: ${err.message}`);
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText} (${url})`);
    }

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      throw new Error(`Rota de API não encontrada (${url}). Recebido HTML. O backend (porta 3000) está rodando e o proxy está configurado?`);
    }

    try {
      return await res.json();
    } catch (err: any) {
      throw new Error(`Falha ao fazer parse do JSON recebido de ${url}: ${err.message}`);
    }
  };

  window.electronAPI = {
    // Diálogos Nativos do Sistema & Verificação de Caminhos
    selectDirectory: async (defaultPath?: string): Promise<string | null> => {
      const input = window.prompt('Digite ou cole o caminho do diretório:', defaultPath || '');
      return input && input.trim() ? input.trim() : null;
    },

    selectFile: async (options?: SelectFileOptions): Promise<string | null> => {
      const input = window.prompt(
        'Digite ou cole o caminho completo do arquivo executável:',
        options?.defaultPath || ''
      );
      return input && input.trim() ? input.trim() : null;
    },

    checkPath: async (targetPath: string): Promise<PathStatusInfo> => {
      return apiFetch<PathStatusInfo>(`/api/system/check-path?path=${encodeURIComponent(targetPath)}`);
    },

    autoDetectPaths: async (): Promise<Partial<AppSettings>> => {
      return apiFetch<Partial<AppSettings>>('/api/system/auto-detect');
    },

    getAppInfo: async (): Promise<SystemAppInfo> => {
      return apiFetch<SystemAppInfo>('/api/system/info');
    },

    // Gestor de Ambiente
    checkAdmin: async (): Promise<boolean> => {
      const data = await apiFetch<{ isAdmin: boolean }>('/api/env/admin');
      return data.isAdmin;
    },

    getServicesStatus: async (customServices?: TrackedServiceConfig[]): Promise<ServiceStatus[]> => {
      return apiFetch<ServiceStatus[]>('/api/env/services');
    },

    getProcessesStatus: async (customProcesses?: TrackedProcessConfig[]): Promise<ProcessStatus[]> => {
      return apiFetch<ProcessStatus[]>('/api/env/processes');
    },

    checkPorts: async (): Promise<PortStatus[]> => {
      return apiFetch<PortStatus[]>('/api/env/ports');
    },

    startService: async (name: string): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/env/services/start', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      return data.success;
    },

    stopService: async (name: string): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/env/services/stop', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      return data.success;
    },

    batchStartServices: async (serviceNames: string[]): Promise<Record<string, boolean>> => {
      return apiFetch<Record<string, boolean>>('/api/env/services/batch-start', {
        method: 'POST',
        body: JSON.stringify({ names: serviceNames })
      });
    },

    batchStopServices: async (serviceNames: string[]): Promise<Record<string, boolean>> => {
      return apiFetch<Record<string, boolean>>('/api/env/services/batch-stop', {
        method: 'POST',
        body: JSON.stringify({ names: serviceNames })
      });
    },

    killControlProcess: async (): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/env/kill-process', {
        method: 'POST'
      });
      return data.success;
    },

    batchKillProcesses: async (processNames: string[]): Promise<Record<string, boolean>> => {
      return apiFetch<Record<string, boolean>>('/api/env/processes/batch-kill', {
        method: 'POST',
        body: JSON.stringify({ names: processNames })
      });
    },

    launchIntelliJ: async (): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/env/launch-ide', {
        method: 'POST'
      });
      return data.success;
    },

    launchServerDebug: async (): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/env/launch-server-debug', {
        method: 'POST'
      });
      return data.success;
    },

    launchWinThorDebug: async (): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/env/launch-server-debug', {
        method: 'POST'
      });
      return data.success;
    },

    resetEnvironment: async (
      options?: 'embedded' | 'external' | EnvironmentAutomationConfig
    ): Promise<{ success: boolean; logs: EnvironmentLog[]; error?: string }> => {
      return apiFetch('/api/env/reset', {
        method: 'POST',
        body: JSON.stringify({ options: options || 'embedded' })
      });
    },

    onEnvLog: (callback: (log: EnvironmentLog) => void) => {
      return wsManager.subscribe('env:log-event', callback);
    },

    // Perfis de Automação & Workflows
    runProfile: async (profile: AutomationProfile): Promise<ProfileExecutionResult> => {
      return apiFetch('/api/profile/run', {
        method: 'POST',
        body: JSON.stringify({ profile })
      });
    },

    stopProfile: async (profile: AutomationProfile): Promise<{ success: boolean; logs: EnvironmentLog[] }> => {
      return apiFetch('/api/profile/stop', {
        method: 'POST',
        body: JSON.stringify({ profile })
      });
    },

    runProfileStep: async (step: AutomationStep, profileName?: string): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/profile/run-step', {
        method: 'POST',
        body: JSON.stringify({ step, profileName })
      });
      return data.success;
    },

    stopProfileStep: async (step: AutomationStep): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/profile/stop-step', {
        method: 'POST',
        body: JSON.stringify({ step })
      });
      return data.success;
    },

    restartProfileStep: async (step: AutomationStep, profileName?: string): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/profile/restart-step', {
        method: 'POST',
        body: JSON.stringify({ step, profileName })
      });
      return data.success;
    },

    killPort: async (port: number): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/profile/kill-port', {
        method: 'POST',
        body: JSON.stringify({ port })
      });
      return data.success;
    },

    saveProfiles: async (profiles: AutomationProfile[], activeProfileId?: string): Promise<AppSettings> => {
      return apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify({ automationProfiles: profiles, activeProfileId })
      });
    },

    onProfileStepProgress: (callback: (data: { stepIndex: number; totalSteps: number; step: AutomationStep }) => void) => {
      return wsManager.subscribe('profile:step-progress', callback);
    },

    // Karaf Deployer & Console Embutido
    startEmbeddedKaraf: async (): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/karaf/embedded/start', {
        method: 'POST'
      });
      return data.success;
    },

    sendKarafInput: async (input: string): Promise<boolean> => {
      wsManager.send('karaf:input', input);
      return true;
    },

    stopEmbeddedKaraf: async (): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/karaf/embedded/stop', {
        method: 'POST'
      });
      return data.success;
    },

    isEmbeddedKarafRunning: async (): Promise<boolean> => {
      const data = await apiFetch<{ isRunning: boolean }>('/api/karaf/embedded/status');
      return data.isRunning;
    },

    onKarafStdout: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('karaf:stdout', callback);
    },

    deployKaraf: async (request: KarafDeployRequest): Promise<{ success: boolean; error?: string }> => {
      return apiFetch('/api/karaf/deploy', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    execKarafDiagnostic: async (command: string): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/karaf/exec', {
        method: 'POST',
        body: JSON.stringify({ command })
      });
    },

    parsePom: async (projectPath: string): Promise<PomInfo | null> => {
      return apiFetch(`/api/karaf/parse-pom?path=${encodeURIComponent(projectPath)}`);
    },

    onKarafLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('karaf:log-chunk', callback);
    },

    // Git & Azure DevOps
    listProjects: async (): Promise<GitProjectInfo[]> => {
      return apiFetch('/api/git/projects');
    },

    getProjectInfo: async (projectPath: string): Promise<GitProjectInfo | null> => {
      return apiFetch(`/api/git/project?path=${encodeURIComponent(projectPath)}`);
    },

    buildPrUrl: async (projectPath: string, targetBranch?: string): Promise<string | null> => {
      const targetParam = targetBranch ? `&targetBranch=${encodeURIComponent(targetBranch)}` : '';
      const data = await apiFetch<{ url: string | null }>(`/api/git/pr-url?path=${encodeURIComponent(projectPath)}${targetParam}`);
      return data.url;
    },

    execGitCommand: async (
      projectPath: string,
      command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/git/command', {
        method: 'POST',
        body: JSON.stringify({ projectPath, command })
      });
    },

    openExternal: async (url: string): Promise<boolean> => {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    },

    // Catálogo de Rotinas
    listRoutines: async (): Promise<RoutineItem[]> => {
      return apiFetch('/api/routines');
    },

    launchRoutine: async (fullPath: string): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/routines/launch', {
        method: 'POST',
        body: JSON.stringify({ fullPath })
      });
      return data.success;
    },

    toggleFavoriteRoutine: async (id: string): Promise<AppSettings> => {
      return apiFetch('/api/routines/favorite', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
    },

    // Configurações
    getSettings: async (): Promise<AppSettings> => {
      return apiFetch('/api/settings');
    },

    saveSettings: async (settings: Partial<AppSettings>): Promise<AppSettings> => {
      return apiFetch('/api/settings', {
        method: 'POST',
        body: JSON.stringify(settings)
      });
    }
  };
}
