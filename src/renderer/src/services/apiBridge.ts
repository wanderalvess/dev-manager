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
  PomInfo,
  PathStatusInfo,
  SelectFileOptions,
  SystemAppInfo,
  DocSearchResult,
  DocsIndexStatus,
  DocsIndexProgress,
  DatabaseConnectionConfig,
  QueryResult,
  DockerContainerInfo,
  DockerDaemonStatus,
  NetworkIpInfo,
  ExplainPlanResult,
  KarafBundleInfo,
  GitCommitInfo,
  SystemMetrics,
  HttpHealthResult,
  DeployProfile
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

  const API_KEY_STORAGE = 'devManagerApiKey';

  const doFetch = (url: string, options?: RequestInit): Promise<Response> => {
    const apiKey = window.localStorage.getItem(API_KEY_STORAGE);
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
        ...(options?.headers || {})
      }
    });
  };

  const apiFetch = async <T>(url: string, options?: RequestInit): Promise<T> => {
    let res: Response;
    try {
      res = await doFetch(url, options);
      if (res.status === 401) {
        const key = window.prompt(
          'Este painel exige uma API key (servidor iniciado com API_KEY definida).\nDigite a API key:'
        );
        if (key && key.trim()) {
          window.localStorage.setItem(API_KEY_STORAGE, key.trim());
          res = await doFetch(url, options);
        }
      }
    } catch (err: any) {
      throw new Error(`Falha de rede ao contatar servidor Web/Docker. O backend está rodando? Erro: ${err.message}`);
    }

    if (res.status === 401) {
      throw new Error('Não autenticado: API key inválida ou não informada.');
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

    getServicesStatus: async (_customServices?: TrackedServiceConfig[]): Promise<ServiceStatus[]> => {
      return apiFetch<ServiceStatus[]>('/api/env/services');
    },

    getProcessesStatus: async (_customProcesses?: TrackedProcessConfig[]): Promise<ProcessStatus[]> => {
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

    buildAndDeployKaraf: async (
      request: KarafDeployRequest,
      projectPath: string,
      skipTests: boolean = true
    ): Promise<{ success: boolean; error?: string }> => {
      return apiFetch('/api/karaf/build-and-deploy', {
        method: 'POST',
        body: JSON.stringify({ request, projectPath, skipTests })
      });
    },

    runMavenBuild: async (
      projectPath: string,
      skipTests: boolean = true
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/karaf/run-maven-build', {
        method: 'POST',
        body: JSON.stringify({ projectPath, skipTests })
      });
    },

    execKarafDiagnostic: async (command: string): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/karaf/exec', {
        method: 'POST',
        body: JSON.stringify({ command })
      });
    },

    listKarafBundles: async (credentials?: { user?: string; pass?: string; port?: number }): Promise<KarafBundleInfo[]> => {
      return apiFetch('/api/karaf/bundles', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    manageKarafBundle: async (
      action: 'start' | 'stop' | 'restart' | 'uninstall',
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/bundles/manage', {
        method: 'POST',
        body: JSON.stringify({ action, bundleId, credentials })
      });
    },

    parsePom: async (projectPath: string): Promise<PomInfo | null> => {
      return apiFetch(`/api/karaf/parse-pom?path=${encodeURIComponent(projectPath)}`);
    },

    onKarafLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('karaf:log-chunk', callback);
    },

    // Perfis de Deploy (Karaf / Docker / Comando Genérico)
    runDeployProfile: async (profile: DeployProfile): Promise<{ success: boolean; error?: string }> => {
      return apiFetch('/api/deploy/run-profile', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
    },

    onDeployLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('deploy:log-chunk', callback);
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

    checkoutBranch: async (projectPath: string, branchName: string, createNew?: boolean): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/git/checkout', {
        method: 'POST',
        body: JSON.stringify({ projectPath, branchName, createNew })
      });
    },

    commitAndPush: async (projectPath: string, message: string): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/git/commit-push', {
        method: 'POST',
        body: JSON.stringify({ projectPath, message })
      });
    },

    getCommitHistory: async (projectPath: string, limit?: number): Promise<GitCommitInfo[]> => {
      return apiFetch(`/api/git/commits?path=${encodeURIComponent(projectPath)}&limit=${limit || 10}`);
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

    launchMappedProgram: async (id: string): Promise<boolean> => {
      const data = await apiFetch<{ success: boolean }>('/api/routines/launch-mapped', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
      return data.success;
    },

    toggleFavoriteRoutine: async (id: string): Promise<AppSettings> => {
      return apiFetch('/api/routines/favorite', {
        method: 'POST',
        body: JSON.stringify({ id })
      });
    },

    // Índice de Documentação (RAG local)
    reindexDocs: async (): Promise<DocsIndexStatus> => {
      return apiFetch('/api/docs/reindex', { method: 'POST' });
    },

    searchDocs: async (query: string, options?: { projectName?: string; topK?: number }): Promise<DocSearchResult[]> => {
      const params = new URLSearchParams({ query });
      if (options?.projectName) params.set('projectName', options.projectName);
      if (options?.topK) params.set('topK', String(options.topK));
      return apiFetch(`/api/docs/search?${params.toString()}`);
    },

    getDocsIndexStatus: async (): Promise<DocsIndexStatus> => {
      return apiFetch('/api/docs/status');
    },

    openDocFile: async (filePath: string): Promise<boolean> => {
      window.prompt('Caminho do arquivo (copie e abra manualmente):', filePath);
      return true;
    },

    onDocsIndexProgress: (callback: (progress: DocsIndexProgress) => void) => {
      return wsManager.subscribe('docs:index-progress', callback);
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
    },

    exportSettings: async (sanitizePasswords?: boolean): Promise<string> => {
      const data = await apiFetch<{ json: string }>(`/api/settings/export?sanitize=${sanitizePasswords ?? true}`);
      return data.json;
    },

    importSettings: async (jsonString: string): Promise<{ success: boolean; error?: string; settings?: AppSettings }> => {
      return apiFetch('/api/settings/import', {
        method: 'POST',
        body: JSON.stringify({ json: jsonString })
      });
    },

    // Banco de Dados (Oracle, MySQL, Postgres)
    testDbConnection: async (config: DatabaseConnectionConfig): Promise<{ success: boolean; message: string; version?: string }> => {
      return apiFetch('/api/db/test', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    executeDbQuery: async (config: DatabaseConnectionConfig, sql: string, maxRows?: number): Promise<QueryResult> => {
      return apiFetch('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({ config, sql, maxRows })
      });
    },

    explainDbPlan: async (config: DatabaseConnectionConfig, sql: string): Promise<ExplainPlanResult> => {
      return apiFetch('/api/db/explain', {
        method: 'POST',
        body: JSON.stringify({ config, sql })
      });
    },

    listDbTables: async (config: DatabaseConnectionConfig): Promise<string[]> => {
      return apiFetch('/api/db/tables', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    // Gerenciador de Containers Docker
    getDockerStatus: async (): Promise<DockerDaemonStatus> => {
      return apiFetch('/api/docker/status');
    },

    listDockerContainers: async (): Promise<DockerContainerInfo[]> => {
      return apiFetch('/api/docker/containers');
    },

    startDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/start`, { method: 'POST' });
      return res.success;
    },

    stopDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/stop`, { method: 'POST' });
      return res.success;
    },

    restartDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/restart`, { method: 'POST' });
      return res.success;
    },

    getDockerLogs: async (containerId: string, lines?: number): Promise<string> => {
      const res = await apiFetch<{ logs: string }>(`/api/docker/containers/${containerId}/logs?lines=${lines || 200}`);
      return res.logs;
    },

    removeDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}`, { method: 'DELETE' });
      return res.success;
    },

    // Rede & Detecção de IPs (Local e WSL)
    getNetworkIps: async (): Promise<NetworkIpInfo> => {
      return apiFetch('/api/network/ips');
    },

    checkHttpHealth: async (url: string, timeoutMs?: number): Promise<HttpHealthResult> => {
      return apiFetch('/api/network/health', {
        method: 'POST',
        body: JSON.stringify({ url, timeoutMs })
      });
    },

    // Métricas do Sistema
    getSystemMetrics: async (): Promise<SystemMetrics> => {
      return apiFetch('/api/system/metrics');
    }
  };
}
