import type {
  AppSettings,
  KarafDeployRequest,
  KarafDeployHistoryEntry,
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
  ConfluenceSourceConfig,
  JiraSourceConfig,
  DocsIndexProgress,
  DocSyncProgress,
  DocSyncResult,
  DatabaseConnectionConfig,
  QueryResult,
  DockerContainerInfo,
  DockerDaemonStatus,
  WslDistroInfo,
  ContainerEnvironment,
  OracleMaintenanceResult,
  OracleDataPumpParams,
  NetworkIpInfo,
  ExplainPlanResult,
  KarafBundleInfo,
  KarafBundleDetails,
  BundleDependencyCheckResult,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
  GitCommitInfo,
  GitFileStatus,
  GitDiffResult,
  SystemMetrics,
  HttpHealthResult,
  DeployProfile,
  DeployStep,
  TableColumnInfo,
  DockerContainerStats,
  ComposeServiceStatus,
  LogWatchStatus,
  LogChunkEvent,
  BackupConfig,
  BackupResult,
  BackupFileInfo,
  BackupHistoryEntry,
  BackupWebhookConfig
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
    getKarafPersistedLogs: async (maxChars?: number): Promise<{ output: string }> => {
      const query = maxChars ? `?maxChars=${maxChars}` : '';
      return apiFetch(`/api/karaf/embedded/persisted-logs${query}`);
    },
    clearKarafPersistedLogs: async (): Promise<{ success: boolean }> => {
      return apiFetch('/api/karaf/embedded/persisted-logs/clear', { method: 'POST' });
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

    getKarafDeployHistory: async (): Promise<KarafDeployHistoryEntry[]> => {
      return apiFetch('/api/karaf/deploy-history');
    },

    onKarafDeployResult: (callback: (result: { success: boolean; error?: string }) => void) => {
      return wsManager.subscribe('karaf:deploy-result', callback);
    },
    onKarafBuildResult: (callback: (result: { code: number; stdout: string; stderr: string }) => void) => {
      return wsManager.subscribe('karaf:build-result', callback);
    },
    onDocsReindexComplete: (callback: (status: DocsIndexStatus) => void) => {
      return wsManager.subscribe('docs:reindex-complete', callback);
    },

    listKarafBundles: async (credentials?: { user?: string; pass?: string; port?: number }): Promise<KarafBundleInfo[]> => {
      return apiFetch('/api/karaf/bundles', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    manageKarafBundle: async (
      action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/bundles/manage', {
        method: 'POST',
        body: JSON.stringify({ action, bundleId, credentials })
      });
    },

    getKarafLog: async (
      lines?: number,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/log', {
        method: 'POST',
        body: JSON.stringify({ lines, credentials })
      });
    },

    getKarafBundleDetails: async (
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafBundleDetails | null> => {
      return apiFetch('/api/karaf/bundles/details', {
        method: 'POST',
        body: JSON.stringify({ bundleId, credentials })
      });
    },

    checkKarafBundleDeps: async (
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<BundleDependencyCheckResult> => {
      return apiFetch('/api/karaf/bundles/check-deps', {
        method: 'POST',
        body: JSON.stringify({ bundleId, credentials })
      });
    },

    checkKarafInstallDeps: async (
      target: { location?: string; symbolicName?: string; version?: string },
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<BundleDependencyCheckResult> => {
      return apiFetch('/api/karaf/bundles/check-install-deps', {
        method: 'POST',
        body: JSON.stringify({ target, credentials })
      });
    },

    installKarafBundle: async (
      request: InstallBundleRequest
    ): Promise<{ success: boolean; bundleId?: string; state?: string; diag?: string; output: string }> => {
      return apiFetch('/api/karaf/bundles/install', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    uninstallKarafBundle: async (
      bundleId: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/bundles/uninstall', {
        method: 'POST',
        body: JSON.stringify({ bundleId, credentials })
      });
    },

    reinstallKarafBundle: async (
      request: ReinstallBundleRequest
    ): Promise<{ success: boolean; state?: string; diag?: string; output: string }> => {
      return apiFetch('/api/karaf/bundles/reinstall', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    updateKarafBundleVersion: async (
      request: UpdateBundleVersionRequest
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/bundles/update-version', {
        method: 'POST',
        body: JSON.stringify(request)
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

    runDeployStep: async (step: DeployStep, profileName?: string): Promise<{ success: boolean; error?: string }> => {
      return apiFetch('/api/deploy/run-step', {
        method: 'POST',
        body: JSON.stringify({ step, profileName })
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

    getGitStatusDetails: async (projectPath: string): Promise<GitFileStatus[]> => {
      return apiFetch(`/api/git/status-details?path=${encodeURIComponent(projectPath)}`);
    },

    getGitDiff: async (projectPath: string, targetFile?: string): Promise<GitDiffResult> => {
      const fileParam = targetFile ? `&file=${encodeURIComponent(targetFile)}` : '';
      return apiFetch(`/api/git/diff?path=${encodeURIComponent(projectPath)}${fileParam}`);
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

    searchDocs: async (query: string, options?: { sourceLabel?: string; topK?: number }): Promise<DocSearchResult[]> => {
      const params = new URLSearchParams({ query });
      if (options?.sourceLabel) params.set('sourceLabel', options.sourceLabel);
      if (options?.topK) params.set('topK', String(options.topK));
      return apiFetch(`/api/docs/search?${params.toString()}`);
    },

    getDocsIndexStatus: async (): Promise<DocsIndexStatus> => {
      return apiFetch('/api/docs/status');
    },

    testConfluenceConnection: async (config: ConfluenceSourceConfig): Promise<{ success: boolean; message: string }> => {
      return apiFetch('/api/docs/test-confluence-connection', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    testJiraConnection: async (config: JiraSourceConfig): Promise<{ success: boolean; message: string }> => {
      return apiFetch('/api/docs/test-jira-connection', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    openDocFile: async (filePath: string, mode?: 'editor' | 'folder'): Promise<boolean> => {
      if (mode === 'folder') {
        window.prompt('Localização do arquivo:', filePath);
      } else {
        window.prompt('Caminho do arquivo (copie e abra no seu editor):', filePath);
      }
      return true;
    },

    readDocContent: async (filePath: string): Promise<string | null> => {
      try {
        const res = await apiFetch<{ content: string | null }>(`/api/docs/content?path=${encodeURIComponent(filePath)}`);
        return res.content;
      } catch {
        return null;
      }
    },

    onDocsIndexProgress: (callback: (progress: DocsIndexProgress) => void) => {
      return wsManager.subscribe('docs:index-progress', callback);
    },

    syncDocs: async (targetId?: string): Promise<DocSyncResult[]> => {
      return apiFetch('/api/docs/sync', {
        method: 'POST',
        body: JSON.stringify({ targetId })
      });
    },

    onDocSyncProgress: (callback: (progress: DocSyncProgress) => void) => {
      return wsManager.subscribe('docs:sync-progress', callback);
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

    importSettings: async (jsonString: string): Promise<{ success: boolean; error?: string; settings?: AppSettings; warnings?: string[] }> => {
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

    executeDbQuery: async (config: DatabaseConnectionConfig, sql: string, maxRows?: number, binds?: Record<string, any>): Promise<QueryResult> => {
      return apiFetch('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({ config, sql, maxRows, binds })
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

    getDbTableColumns: async (config: DatabaseConnectionConfig, tableName: string): Promise<TableColumnInfo[]> => {
      return apiFetch('/api/db/columns', {
        method: 'POST',
        body: JSON.stringify({ config, tableName })
      });
    },

    runDbBackup: async (
      config: DatabaseConnectionConfig,
      destinationFolder: string,
      oracleDirectory?: string,
      compress?: boolean,
      useCustomCommand?: boolean,
      customCommand?: string
    ): Promise<BackupResult> => {
      return apiFetch('/api/db/backup', {
        method: 'POST',
        body: JSON.stringify({ config, destinationFolder, oracleDirectory, compress, useCustomCommand, customCommand })
      });
    },

    listDbBackups: async (destinationFolder: string): Promise<BackupFileInfo[]> => {
      return apiFetch('/api/db/backups', {
        method: 'POST',
        body: JSON.stringify({ destinationFolder })
      });
    },

    saveDbBackupConfig: async (config: BackupConfig): Promise<{ success: boolean; message: string }> => {
      return apiFetch('/api/db/backup-config', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    restoreDbBackup: async (config: DatabaseConnectionConfig, filePath: string): Promise<BackupResult> => {
      return apiFetch('/api/db/restore', {
        method: 'POST',
        body: JSON.stringify({ config, filePath })
      });
    },

    onBackupScheduleResult: (callback: (data: { connectionName: string; result: BackupResult }) => void) => {
      return wsManager.subscribe('backup:schedule-result', callback);
    },

    listDbBackupHistory: async (connectionId?: string): Promise<BackupHistoryEntry[]> => {
      return apiFetch('/api/db/backup-history', {
        method: 'POST',
        body: JSON.stringify({ connectionId })
      });
    },

    runDbRestoreDrill: async (scratchConnection: DatabaseConnectionConfig, filePath: string): Promise<BackupResult> => {
      return apiFetch('/api/db/restore-drill', {
        method: 'POST',
        body: JSON.stringify({ scratchConnection, filePath })
      });
    },

    testBackupWebhook: async (webhook: BackupWebhookConfig): Promise<{ success: boolean; message: string }> => {
      return apiFetch('/api/backup/test-webhook', {
        method: 'POST',
        body: JSON.stringify(webhook)
      });
    },

    // Gerenciador de Containers (Docker / Podman)
    getDockerStatus: async (): Promise<DockerDaemonStatus> => {
      return apiFetch('/api/docker/status');
    },
    getContainerStatus: async (): Promise<DockerDaemonStatus> => {
      return apiFetch('/api/containers/status');
    },

    listDockerContainers: async (): Promise<DockerContainerInfo[]> => {
      return apiFetch('/api/docker/containers');
    },
    listContainers: async (): Promise<DockerContainerInfo[]> => {
      return apiFetch('/api/containers');
    },

    startDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/start`, { method: 'POST' });
      return res.success;
    },
    startContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/start`, { method: 'POST' });
      return res.success;
    },

    stopDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/stop`, { method: 'POST' });
      return res.success;
    },
    stopContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/stop`, { method: 'POST' });
      return res.success;
    },

    restartDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/restart`, { method: 'POST' });
      return res.success;
    },
    restartContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/restart`, { method: 'POST' });
      return res.success;
    },

    getDockerLogs: async (containerId: string, lines?: number): Promise<string> => {
      const res = await apiFetch<{ logs: string }>(`/api/docker/containers/${containerId}/logs?lines=${lines || 200}`);
      return res.logs;
    },
    getContainerLogs: async (containerId: string, lines?: number): Promise<string> => {
      const res = await apiFetch<{ logs: string }>(`/api/containers/${containerId}/logs?lines=${lines || 200}`);
      return res.logs;
    },

    removeDockerContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}`, { method: 'DELETE' });
      return res.success;
    },
    removeContainer: async (containerId: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}`, { method: 'DELETE' });
      return res.success;
    },

    getDockerContainerStats: async (): Promise<DockerContainerStats[]> => {
      try {
        return await apiFetch<DockerContainerStats[]>('/api/docker/stats');
      } catch {
        return [];
      }
    },
    getContainerStats: async (): Promise<DockerContainerStats[]> => {
      try {
        return await apiFetch<DockerContainerStats[]>('/api/containers/stats');
      } catch {
        return [];
      }
    },

    openDockerContainerTerminal: async (containerId: string, shell?: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/terminal`, {
          method: 'POST',
          body: JSON.stringify({ shell })
        });
        return res.success;
      } catch {
        return false;
      }
    },
    openContainerTerminal: async (containerId: string, shell?: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/terminal`, {
          method: 'POST',
          body: JSON.stringify({ shell })
        });
        return res.success;
      } catch {
        return false;
      }
    },

    dockerComposeUp: async (
      composeFilePath: string,
      options?: { profile?: string; detach?: boolean }
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/docker/compose-up', {
        method: 'POST',
        body: JSON.stringify({ composeFilePath, ...options })
      });
    },
    dockerComposeDown: async (
      composeFilePath: string,
      options?: { profile?: string }
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/docker/compose-down', {
        method: 'POST',
        body: JSON.stringify({ composeFilePath, ...options })
      });
    },
    dockerComposeStatus: async (composeFilePath: string, profile?: string): Promise<ComposeServiceStatus[]> => {
      try {
        return await apiFetch('/api/docker/compose-status', {
          method: 'POST',
          body: JSON.stringify({ composeFilePath, profile })
        });
      } catch {
        return [];
      }
    },
    onDockerComposeLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('docker:compose-log-chunk', callback);
    },

    // WSL & Container Environments
    listWslDistros: async (): Promise<WslDistroInfo[]> => {
      try {
        return await apiFetch<WslDistroInfo[]>('/api/wsl/distros');
      } catch {
        return [];
      }
    },
    setDockerTargetWslDistro: async (distro: string | null): Promise<DockerDaemonStatus> => {
      return apiFetch('/api/wsl/target-distro', {
        method: 'POST',
        body: JSON.stringify({ distro })
      });
    },
    getContainerEnvironments: async (): Promise<{ environments: ContainerEnvironment[]; snapshotsDir?: string }> => {
      return apiFetch('/api/wsl/environments');
    },
    saveContainerEnvironment: async (env: ContainerEnvironment): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>('/api/wsl/environments', {
        method: 'PUT',
        body: JSON.stringify(env)
      });
      return res.success;
    },
    deleteContainerEnvironment: async (id: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/wsl/environments/${id}`, {
        method: 'DELETE'
      });
      return res.success;
    },
    startContainerSequence: async (containers: { name: string; delay?: number }[]) => {
      return apiFetch('/api/docker/start-sequence', {
        method: 'POST',
        body: JSON.stringify({ containers })
      });
    },
    onContainerSequenceProgress: (callback: (step: any) => void) => {
      return wsManager.subscribe('docker:sequence-progress', callback);
    },

    // Ferramentas Especializadas Oracle (INFR-Docker)
    execOracleHealth: async (
      containerName: string,
      schema?: string,
      fix?: boolean,
      user?: string,
      password?: string
    ): Promise<OracleMaintenanceResult> => {
      return apiFetch('/api/docker/oracle-health', {
        method: 'POST',
        body: JSON.stringify({ containerName, schema, fix, user, password })
      });
    },
    openOracleSqlPlus: async (containerName: string, user?: string, password?: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/docker/oracle-sqlplus', {
          method: 'POST',
          body: JSON.stringify({ containerName, user, password })
        });
        return res.success;
      } catch {
        return false;
      }
    },
    execOracleDataPump: async (params: OracleDataPumpParams): Promise<OracleMaintenanceResult> => {
      return apiFetch('/api/docker/oracle-datapump', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    },

    // Rede & Detecção de IPs (Local e WSL)
    getNetworkIps: async (): Promise<NetworkIpInfo> => {
      try {
        return await apiFetch('/api/network/ips');
      } catch {
        return {
          primaryLocalIp: '127.0.0.1',
          localIps: [{ interface: 'Loopback', ip: '127.0.0.1', mac: '00:00:00:00:00:00', type: 'LAN' }],
          wslIp: null,
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'localhost'
        };
      }
    },

    checkHttpHealth: async (url: string, timeoutMs?: number): Promise<HttpHealthResult> => {
      try {
        return await apiFetch('/api/network/health', {
          method: 'POST',
          body: JSON.stringify({ url, timeoutMs })
        });
      } catch {
        return {
          url,
          reachable: false,
          isHealthy: false,
          timeMs: 0,
          responseTimeMs: 0,
          error: 'Servidor Web/Docker offline'
        };
      }
    },

    // Métricas do Sistema
    getSystemMetrics: async (): Promise<SystemMetrics> => {
      try {
        return await apiFetch('/api/system/metrics');
      } catch {
        return {
          cpuUsagePercent: 0,
          totalMemMb: 8192,
          freeMemMb: 4096,
          usedMemMb: 4096,
          memUsagePercent: 50,
          uptimeSeconds: 0,
          totalMemoryMb: 8192,
          freeMemoryMb: 4096,
          usedMemoryMb: 4096,
          memoryUsagePercent: 50
        };
      }
    },

    // Leitor e Monitor de Logs em Tempo Real (Tail -f)
    startLogWatch: async (
      sourceId: string,
      filePath: string,
      initialLines?: number,
      encoding?: string
    ): Promise<{ status: LogWatchStatus; initialLines: string[] }> => {
      try {
        return await apiFetch('/api/logs/start-watch', {
          method: 'POST',
          body: JSON.stringify({ sourceId, filePath, initialLines, encoding })
        });
      } catch (err: any) {
        return {
          status: {
            sourceId,
            filePath,
            exists: false,
            fileSizeBytes: 0,
            watching: false,
            error: err.message || 'Falha ao conectar no servidor'
          },
          initialLines: []
        };
      }
    },

    stopLogWatch: async (sourceId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/logs/stop-watch', {
          method: 'POST',
          body: JSON.stringify({ sourceId })
        });
        return res.success;
      } catch {
        return false;
      }
    },

    checkLogFile: async (filePath: string, sourceId?: string): Promise<LogWatchStatus> => {
      try {
        return await apiFetch('/api/logs/check-file', {
          method: 'POST',
          body: JSON.stringify({ filePath, sourceId })
        });
      } catch (err: any) {
        return {
          sourceId: sourceId || '',
          filePath,
          exists: false,
          fileSizeBytes: 0,
          watching: false,
          error: err.message || 'Falha ao conectar no servidor'
        };
      }
    },

    clearLogFile: async (filePath: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/logs/clear-file', {
          method: 'POST',
          body: JSON.stringify({ filePath })
        });
        return res.success;
      } catch {
        return false;
      }
    },

    onLogChunk: (callback: (event: LogChunkEvent) => void) => {
      return wsManager.subscribe('logs:chunk', callback);
    }
  };
}
