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
  GitTaskItem,
  CreateTaskBranchOptions,
  RoutineItem,
  RoutineLaunchResult,
  RoutineDownloadRequest,
  RoutineDownloadResult,
  RoutineBackupEntry,
  RoutineRollbackResult,
  ExecutableVersionInfo,
  BatchRoutineDownloadRequest,
  BatchRoutineItemProgress,
  BatchRoutineDownloadResult,
  CcwCatalogResponse,
  KarafWtaStatusResult,
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
  ParseTnsNamesResult,
  QueryResult,
  DbObjectInfo,
  DbObjectType,
  DbSessionQueryResult,
  DbSessionState,
  ObjectDdlResult,
  TableDetails,
  DockerContainerInfo,
  DockerDaemonStatus,
  DockerContainerInspect,
  WslDistroInfo,
  WslActionResult,
  ContainerEnvironment,
  OracleMaintenanceResult,
  OracleDataPumpParams,
  WslDumpFileInfo,
  WshPrerequisiteStatus,
  WslSnapshotFileInfo,
  WslSnapshotActionResult,
  InfrDockerScriptStatus,
  NetworkIpInfo,
  ExplainPlanResult,
  OracleTracerFilter,
  OracleActiveSessionsResult,
  OracleRecentStatementsResult,
  OracleStatementBindsResult,
  OracleCaptureOptions,
  OracleCaptureState,
  KarafBundleInfo,
  KarafBundleDetails,
  BundleDependencyCheckResult,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
  KarafFeatureInfo,
  KarafFeatureRepoInfo,
  KarafJvmMemoryInfo,
  LogAnalysisSummary,
  Routine801CatalogResponse,
  Routine801InstallRequest,
  Routine801InstallResult,
  GitCommitInfo,
  GitFileStatus,
  GitDiffResult,
  GitCommandResult,
  SystemMetrics,
  HttpHealthResult,
  DeployProfile,
  DeployStep,
  DeployProfileHistoryEntry,
  DeployProgressEvent,
  OsgiResolutionDiagnosticSummary,
  TableColumnInfo,
  DockerContainerStats,
  ComposeServiceStatus,
  LogWatchStatus,
  LogChunkEvent,
  BackupConfig,
  BackupResult,
  BackupFileInfo,
  BackupHistoryEntry,
  BackupWebhookConfig,
  LlmProviderConfig,
  LlmChatRequest,
  LlmChatResponse,
  LlmTestResult,
  LlmRagQueryRequest,
  LlmRagQueryResponse,
  TraceSummary,
  TraceDetails,
  ApmFilter,
  ApmReceiverStatus,
  ApmReceiverPortChangeResult,
  ObservabilityOverview,
  ServiceMetricsSummary,
  UpdateStatus,
  QaRegressionTemplate,
  QaExecutionRequest,
  QaExecutionResult,
  QaCoreSearchFilter,
  QaCoreSearchResult,
  QaApiFetchRequest,
  QaApiFetchResult,
  TestRunnerConfig,
  TestExecutionResult,
  TautProjectStatus,
  TautCoverageReport,
  TautSpecSummary,
  TautRunOptions,
  TautCsvIntakeResult,
  TautEnvSyncResult
} from '../../../shared/types';

const API_KEY_STORAGE = 'devManagerApiKey';

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
    // A API key é lida a cada tentativa de conexão (não só na primeira), pois pode
    // ainda não existir no localStorage quando o WebSocketManager é instanciado e
    // só ser preenchida depois, quando uma chamada REST dispara o prompt de 401.
    const apiKey = window.localStorage.getItem(API_KEY_STORAGE);
    const wsUrl = `${protocol}//${host}/ws${apiKey ? `?apiKey=${encodeURIComponent(apiKey)}` : ''}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Conectado ao servidor Hub Manager');
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

    getChangelog: async (): Promise<string | null> => {
      try {
        const data = await apiFetch<{ content: string | null }>('/api/system/changelog');
        return data.content;
      } catch {
        return null;
      }
    },

    getMcpDocs: async (): Promise<string> => {
      try {
        const data = await apiFetch<{ content: string }>('/api/system/mcp-docs');
        return data.content;
      } catch {
        return '';
      }
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

    isKarafRunning: async (sshPort?: number): Promise<boolean> => {
      const query = sshPort ? `?port=${sshPort}` : '';
      const data = await apiFetch<{ isRunning: boolean }>(`/api/karaf/status${query}`);
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

    manageKarafBundlesBatch: async (
      action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
      bundleIds: string[],
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string; processedCount: number }> => {
      return apiFetch('/api/karaf/bundles/manage-batch', {
        method: 'POST',
        body: JSON.stringify({ action, bundleIds, credentials })
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

    listKarafFeatures: async (
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafFeatureInfo[]> => {
      return apiFetch('/api/karaf/features', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    uninstallKarafFeature: async (
      featureName: string,
      version?: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/features/uninstall', {
        method: 'POST',
        body: JSON.stringify({ featureName, version, credentials })
      });
    },

    installKarafFeature: async (
      featureName: string,
      version?: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/features/install', {
        method: 'POST',
        body: JSON.stringify({ featureName, version, credentials })
      });
    },

    parsePom: async (projectPath: string): Promise<PomInfo | null> => {
      return apiFetch<PomInfo | null>(`/api/karaf/parse-pom?path=${encodeURIComponent(projectPath)}`);
    },

    getKarafJvmMemory: async (
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafJvmMemoryInfo> => {
      return apiFetch<KarafJvmMemoryInfo>('/api/karaf/jvm-memory', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    triggerKarafGc: async (
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/gc', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    listKarafFeatureRepos: async (
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafFeatureRepoInfo[]> => {
      return apiFetch('/api/karaf/feature-repos', {
        method: 'POST',
        body: JSON.stringify(credentials || {})
      });
    },

    addKarafFeatureRepo: async (
      url: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/feature-repos/add', {
        method: 'POST',
        body: JSON.stringify({ url, credentials })
      });
    },

    removeKarafFeatureRepo: async (
      nameOrUrl: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/feature-repos/remove', {
        method: 'POST',
        body: JSON.stringify({ nameOrUrl, credentials })
      });
    },

    refreshKarafFeatureRepo: async (
      nameOrUrl?: string,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<{ success: boolean; output: string }> => {
      return apiFetch('/api/karaf/feature-repos/refresh', {
        method: 'POST',
        body: JSON.stringify({ nameOrUrl, credentials })
      });
    },

    listAllKarafFeatures: async (
      installedOnly?: boolean,
      credentials?: { user?: string; pass?: string; port?: number }
    ): Promise<KarafFeatureInfo[]> => {
      return apiFetch('/api/karaf/features-all', {
        method: 'POST',
        body: JSON.stringify({ installedOnly, credentials })
      });
    },

    analyzeKarafLog: async (
      content: string | string[]
    ): Promise<LogAnalysisSummary> => {
      return apiFetch('/api/karaf/analyze-log', {
        method: 'POST',
        body: JSON.stringify({ content })
      });
    },

    onKarafLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('karaf:log-chunk', callback);
    },

    // Rotina 801 - Atualização e Instalação de Serviços Web Oficiais
    routine801GetInstallations: async (customUrl?: string): Promise<Routine801CatalogResponse> => {
      const query = customUrl ? `?url=${encodeURIComponent(customUrl)}` : '';
      return apiFetch(`/api/routine801/instalacao${query}`);
    },

    routine801GetUpdates: async (customUrl?: string): Promise<Routine801CatalogResponse> => {
      const query = customUrl ? `?url=${encodeURIComponent(customUrl)}` : '';
      return apiFetch(`/api/routine801/atualizacao${query}`);
    },

    routine801CheckServer: async (customUrl?: string): Promise<{ ok: boolean; status: number; message: string; url: string }> => {
      const query = customUrl ? `?url=${encodeURIComponent(customUrl)}` : '';
      return apiFetch(`/api/routine801/health${query}`);
    },

    routine801InstallFeatures: async (request: Routine801InstallRequest): Promise<Routine801InstallResult> => {
      return apiFetch('/api/routine801/install', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    // Perfis de Deploy (Karaf / Docker / Comando Genérico)
    runDeployProfile: async (
      profile: DeployProfile
    ): Promise<{ success: boolean; error?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> => {
      return apiFetch('/api/deploy/run-profile', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
    },

    runDeployStep: async (
      step: DeployStep,
      profileName?: string
    ): Promise<{ success: boolean; error?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> => {
      return apiFetch('/api/deploy/run-step', {
        method: 'POST',
        body: JSON.stringify({ step, profileName })
      });
    },

    abortDeploy: async (): Promise<{ success: boolean }> => {
      return apiFetch('/api/deploy/abort', { method: 'POST' });
    },

    getDeployProfileHistory: async (): Promise<DeployProfileHistoryEntry[]> => {
      return apiFetch('/api/deploy/history');
    },

    clearDeployProfileHistory: async (): Promise<{ success: boolean }> => {
      return apiFetch('/api/deploy/history', { method: 'DELETE' });
    },

    onDeployLogChunk: (callback: (chunk: string) => void) => {
      return wsManager.subscribe('deploy:log-chunk', callback);
    },

    onDeployStepProgress: (callback: (data: DeployProgressEvent) => void) => {
      return wsManager.subscribe('deploy:step-progress', callback);
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
    ): Promise<GitCommandResult> => {
      return apiFetch('/api/git/command', {
        method: 'POST',
        body: JSON.stringify({ projectPath, command })
      });
    },

    checkoutBranch: async (
      projectPath: string,
      branchName: string,
      createNew?: boolean,
      baseBranch?: string
    ): Promise<GitCommandResult> => {
      return apiFetch('/api/git/checkout', {
        method: 'POST',
        body: JSON.stringify({ projectPath, branchName, createNew, baseBranch })
      });
    },

    createTaskBranch: async (
      projectPath: string,
      options: CreateTaskBranchOptions
    ): Promise<{ success: boolean; output: string; branchName: string }> => {
      return apiFetch('/api/git/create-task-branch', {
        method: 'POST',
        body: JSON.stringify({ projectPath, ...options })
      });
    },

    openFileInIde: async (
      projectPath: string,
      relativePath: string
    ): Promise<{ success: boolean; error?: string }> => {
      return apiFetch('/api/git/open-file-in-ide', {
        method: 'POST',
        body: JSON.stringify({ projectPath, relativePath })
      });
    },

    fetchTasks: async (projectPath?: string, query?: string): Promise<GitTaskItem[]> => {
      const params = new URLSearchParams();
      if (projectPath) params.set('path', projectPath);
      if (query) params.set('query', query);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return apiFetch(`/api/git/tasks${queryStr}`);
    },

    commitAndPush: async (projectPath: string, message: string): Promise<GitCommandResult> => {
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

    getGitUncommittedCounts: async (): Promise<Record<string, number>> => {
      return apiFetch('/api/git/uncommitted-counts');
    },

    openExternal: async (url: string): Promise<boolean> => {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    },

    // Catálogo de Rotinas
    listRoutines: async (): Promise<RoutineItem[]> => {
      return apiFetch('/api/routines');
    },

    launchRoutine: async (fullPath: string, forceDirect?: boolean): Promise<RoutineLaunchResult> => {
      return apiFetch<RoutineLaunchResult>('/api/routines/launch', {
        method: 'POST',
        body: JSON.stringify({ fullPath, forceDirect })
      });
    },

    checkRoutineKarafStatus: async (): Promise<KarafWtaStatusResult> => {
      return apiFetch<KarafWtaStatusResult>('/api/routines/karaf-status');
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

    downloadCcwRoutine: async (req: RoutineDownloadRequest): Promise<RoutineDownloadResult> => {
      return apiFetch('/api/routines/download-ccw', {
        method: 'POST',
        body: JSON.stringify(req)
      });
    },

    installLocalRoutineFile: async (
      filePath: string,
      routineCodeOrName?: string,
      targetModule?: string,
      backupExisting?: boolean
    ): Promise<RoutineDownloadResult> => {
      return apiFetch('/api/routines/install-local', {
        method: 'POST',
        body: JSON.stringify({ filePath, routineCodeOrName, targetModule, backupExisting })
      });
    },

    getCcwCatalog: async (authCookie?: string): Promise<CcwCatalogResponse> => {
      const query = authCookie ? `?authCookie=${encodeURIComponent(authCookie)}` : '';
      return apiFetch(`/api/routines/ccw-catalog${query}`);
    },

    getCcwDownloadUrl: async (routineName: string, winthorVersion?: string): Promise<string> => {
      const params = new URLSearchParams({ routineName });
      if (winthorVersion) params.set('winthorVersion', winthorVersion);
      const data = await apiFetch<{ url: string }>(`/api/routines/ccw-download-url?${params.toString()}`);
      return data.url;
    },

    listRoutineBackups: async (routineIdOrName: string, moduleFolder?: string): Promise<RoutineBackupEntry[]> => {
      const params = new URLSearchParams({ routine: routineIdOrName });
      if (moduleFolder) params.set('moduleFolder', moduleFolder);
      return apiFetch(`/api/routines/backups?${params.toString()}`);
    },

    restoreRoutineBackup: async (backupFilePath: string, targetRoutinePath: string): Promise<RoutineRollbackResult> => {
      return apiFetch('/api/routines/restore-backup', {
        method: 'POST',
        body: JSON.stringify({ backupFilePath, targetRoutinePath })
      });
    },

    deleteRoutineBackup: async (backupFilePath: string): Promise<{ success: boolean; message?: string; error?: string }> => {
      return apiFetch('/api/routines/backup', {
        method: 'DELETE',
        body: JSON.stringify({ backupFilePath })
      });
    },

    getRoutineExecutableVersion: async (filePath: string): Promise<ExecutableVersionInfo | null> => {
      const params = new URLSearchParams({ filePath });
      return apiFetch(`/api/routines/version-info?${params.toString()}`);
    },

    downloadRoutinesBatch: async (request: BatchRoutineDownloadRequest): Promise<BatchRoutineDownloadResult> => {
      return apiFetch('/api/routines/batch-download', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    onRoutineBatchProgress: (callback: (progress: BatchRoutineItemProgress) => void) => {
      return wsManager.subscribe('routines:batch-progress', callback);
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

    testLlmConnection: async (config: LlmProviderConfig): Promise<LlmTestResult> => {
      return apiFetch('/api/llm/test-connection', {
        method: 'POST',
        body: JSON.stringify(config)
      });
    },

    llmChat: async (request: LlmChatRequest): Promise<LlmChatResponse> => {
      return apiFetch('/api/llm/chat', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    askDocsWithAi: async (request: LlmRagQueryRequest): Promise<LlmRagQueryResponse> => {
      return apiFetch('/api/llm/ask-with-docs', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    askLlm: async (request: LlmRagQueryRequest, providerConfig?: LlmProviderConfig): Promise<LlmRagQueryResponse> => {
      return apiFetch('/api/llm/ask-with-docs', {
        method: 'POST',
        body: JSON.stringify({ ...request, providerId: providerConfig?.id })
      });
    },

    chatLlm: async (request: LlmChatRequest, providerConfig?: LlmProviderConfig): Promise<LlmChatResponse> => {
      return apiFetch('/api/llm/chat', {
        method: 'POST',
        body: JSON.stringify({ ...request, providerId: providerConfig?.id })
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
    parseTnsNames: async (filePath?: string): Promise<ParseTnsNamesResult> => {
      return apiFetch('/api/db/tnsnames/parse', {
        method: 'POST',
        body: JSON.stringify({ filePath })
      });
    },

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

    getDbTableDetails: async (config: DatabaseConnectionConfig, tableName: string): Promise<TableDetails> => {
      return apiFetch('/api/db/table-details', { method: 'POST', body: JSON.stringify({ config, tableName }) });
    },

    getDbObjectDdl: async (config: DatabaseConnectionConfig, objectType: DbObjectType, objectName: string): Promise<ObjectDdlResult> => {
      return apiFetch('/api/db/object-ddl', { method: 'POST', body: JSON.stringify({ config, objectType, objectName }) });
    },

    listDbObjects: async (config: DatabaseConnectionConfig): Promise<DbObjectInfo[]> => {
      return apiFetch('/api/db/objects', { method: 'POST', body: JSON.stringify({ config }) });
    },

    openDbSession: async (config: DatabaseConnectionConfig, autoCommit?: boolean): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/open', { method: 'POST', body: JSON.stringify({ config, autoCommit }) });
    },

    executeDbSession: async (sessionId: string, sql: string, maxRows?: number, binds?: Record<string, any>): Promise<DbSessionQueryResult> => {
      return apiFetch('/api/db/session/execute', { method: 'POST', body: JSON.stringify({ sessionId, sql, maxRows, binds }) });
    },

    commitDbSession: async (sessionId: string): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/commit', { method: 'POST', body: JSON.stringify({ sessionId }) });
    },

    rollbackDbSession: async (sessionId: string): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/rollback', { method: 'POST', body: JSON.stringify({ sessionId }) });
    },

    setDbSessionAutoCommit: async (sessionId: string, autoCommit: boolean): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/autocommit', { method: 'POST', body: JSON.stringify({ sessionId, autoCommit }) });
    },

    cancelDbSession: async (sessionId: string): Promise<DbSessionState> => {
      return apiFetch('/api/db/session/cancel', { method: 'POST', body: JSON.stringify({ sessionId }) });
    },

    closeDbSession: async (sessionId: string): Promise<void> => {
      await apiFetch('/api/db/session/close', { method: 'POST', body: JSON.stringify({ sessionId }) });
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

    insertDbRow: async (config: DatabaseConnectionConfig, tableName: string, values: Record<string, any>, sessionId?: string): Promise<QueryResult> => {
      return apiFetch('/api/db/row/insert', {
        method: 'POST',
        body: JSON.stringify({ config, tableName, values, sessionId })
      });
    },

    updateDbRow: async (config: DatabaseConnectionConfig, tableName: string, changes: Record<string, any>, where: Record<string, any>, sessionId?: string): Promise<QueryResult> => {
      return apiFetch('/api/db/row/update', {
        method: 'POST',
        body: JSON.stringify({ config, tableName, changes, where, sessionId })
      });
    },

    deleteDbRow: async (config: DatabaseConnectionConfig, tableName: string, where: Record<string, any>, sessionId?: string): Promise<QueryResult> => {
      return apiFetch('/api/db/row/delete', {
        method: 'POST',
        body: JSON.stringify({ config, tableName, where, sessionId })
      });
    },

    getOracleActiveSessions: async (config: DatabaseConnectionConfig, filter?: OracleTracerFilter): Promise<OracleActiveSessionsResult> => {
      return apiFetch('/api/db/oracle-active-sessions', {
        method: 'POST',
        body: JSON.stringify({ config, filter })
      });
    },

    getOracleRecentStatements: async (config: DatabaseConnectionConfig, filter?: OracleTracerFilter): Promise<OracleRecentStatementsResult> => {
      return apiFetch('/api/db/oracle-recent-statements', {
        method: 'POST',
        body: JSON.stringify({ config, filter })
      });
    },

    getOracleStatementBinds: async (config: DatabaseConnectionConfig, sqlId: string, sqlText?: string): Promise<OracleStatementBindsResult> => {
      return apiFetch('/api/db/oracle-statement-binds', {
        method: 'POST',
        body: JSON.stringify({ config, sqlId, sqlText })
      });
    },

    startOracleCapture: async (config: DatabaseConnectionConfig, options: OracleCaptureOptions): Promise<OracleCaptureState> => {
      return apiFetch('/api/db/oracle-capture/start', {
        method: 'POST',
        body: JSON.stringify({ config, options })
      });
    },

    stopOracleCapture: async (connectionId: string): Promise<OracleCaptureState> => {
      return apiFetch('/api/db/oracle-capture/stop', {
        method: 'POST',
        body: JSON.stringify({ connectionId })
      });
    },

    clearOracleCapture: async (connectionId: string): Promise<OracleCaptureState> => {
      return apiFetch('/api/db/oracle-capture/clear', {
        method: 'POST',
        body: JSON.stringify({ connectionId })
      });
    },

    getOracleCaptureState: async (connectionId: string): Promise<OracleCaptureState> => {
      return apiFetch('/api/db/oracle-capture/state', {
        method: 'POST',
        body: JSON.stringify({ connectionId })
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

    inspectDockerContainer: async (containerId: string): Promise<DockerContainerInspect | null> => {
      try {
        return await apiFetch<DockerContainerInspect>(`/api/docker/containers/${containerId}/inspect`);
      } catch {
        return null;
      }
    },
    inspectContainer: async (containerId: string): Promise<DockerContainerInspect | null> => {
      try {
        return await apiFetch<DockerContainerInspect>(`/api/containers/${containerId}/inspect`);
      } catch {
        return null;
      }
    },

    pauseDockerContainer: async (containerId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/pause`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },
    pauseContainer: async (containerId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/pause`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },

    unpauseDockerContainer: async (containerId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/docker/containers/${containerId}/unpause`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },
    unpauseContainer: async (containerId: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/containers/${containerId}/unpause`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },

    pruneDockerContainers: async (): Promise<{ success: boolean; output: string }> => {
      try {
        return await apiFetch<{ success: boolean; output: string }>('/api/docker/containers/prune', { method: 'POST' });
      } catch (err: any) {
        return { success: false, output: err.message };
      }
    },
    pruneContainers: async (): Promise<{ success: boolean; output: string }> => {
      try {
        return await apiFetch<{ success: boolean; output: string }>('/api/containers/prune', { method: 'POST' });
      } catch (err: any) {
        return { success: false, output: err.message };
      }
    },

    dockerComposeUp: async (
      composeFilePath: string,
      options?: { profile?: string; detach?: boolean; build?: boolean }
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/docker/compose-up', {
        method: 'POST',
        body: JSON.stringify({ composeFilePath, ...options })
      });
    },
    dockerComposeDown: async (
      composeFilePath: string,
      options?: { profile?: string; volumes?: boolean }
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/docker/compose-down', {
        method: 'POST',
        body: JSON.stringify({ composeFilePath, ...options })
      });
    },
    dockerComposeRestart: async (
      composeFilePath: string,
      options?: { profile?: string }
    ): Promise<{ code: number; stdout: string; stderr: string }> => {
      return apiFetch('/api/docker/compose-restart', {
        method: 'POST',
        body: JSON.stringify({ composeFilePath, ...options })
      });
    },
    dockerComposeLogs: async (
      composeFilePath: string,
      options?: { profile?: string; lines?: number }
    ): Promise<string> => {
      try {
        const res = await apiFetch<{ logs: string }>('/api/docker/compose-logs', {
          method: 'POST',
          body: JSON.stringify({ composeFilePath, ...options })
        });
        return res.logs;
      } catch (err: any) {
        return `Erro ao buscar logs: ${err.message}`;
      }
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
    startWslDockerDaemon: async (distro: string): Promise<WslActionResult> => {
      try {
        return await apiFetch<WslActionResult>('/api/wsl/start-docker-daemon', {
          method: 'POST',
          body: JSON.stringify({ distro })
        });
      } catch (err: any) {
        return { success: false, message: err.message || 'Falha ao iniciar Docker daemon' };
      }
    },
    terminateWslDistro: async (distro: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/wsl/distros/${distro}/terminate`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },
    openWslTerminal: async (distro: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>(`/api/wsl/distros/${distro}/terminal`, { method: 'POST' });
        return res.success;
      } catch {
        return false;
      }
    },
    getWslDistroIp: async (distro?: string): Promise<string | null> => {
      try {
        if (!distro) return null;
        const res = await apiFetch<{ ip: string | null }>(`/api/wsl/distros/${distro}/ip`);
        return res.ip;
      } catch {
        return null;
      }
    },
    openWslDumpsFolder: async (distro?: string): Promise<{ success: boolean; path: string; error?: string }> => {
      try {
        return await apiFetch('/api/wsl/open-dumps', {
          method: 'POST',
          body: JSON.stringify({ distro })
        });
      } catch (err: any) {
        return { success: false, path: '', error: err?.message || String(err) };
      }
    },
    listWslDmpFiles: async (distro?: string): Promise<WslDumpFileInfo[]> => {
      try {
        const query = distro ? `?distro=${encodeURIComponent(distro)}` : '';
        return await apiFetch<WslDumpFileInfo[]>(`/api/wsl/dumps${query}`);
      } catch {
        return [];
      }
    },
    generateMd5: async (text: string): Promise<{ lower: string; upper: string }> => {
      try {
        return await apiFetch('/api/wsl/md5', {
          method: 'POST',
          body: JSON.stringify({ text })
        });
      } catch {
        return { lower: '', upper: '' };
      }
    },
    checkWshPrerequisites: async (distro?: string): Promise<WshPrerequisiteStatus[]> => {
      try {
        const query = distro ? `?distro=${encodeURIComponent(distro)}` : '';
        return await apiFetch<WshPrerequisiteStatus[]>(`/api/wsl/wsh-prerequisites${query}`);
      } catch {
        return [];
      }
    },
    openWslOptFolder: async (distro?: string): Promise<{ success: boolean; path: string; error?: string }> => {
      try {
        return await apiFetch('/api/wsl/open-opt', {
          method: 'POST',
          body: JSON.stringify({ distro })
        });
      } catch (err: any) {
        return { success: false, path: '', error: err?.message || String(err) };
      }
    },
    getWslSnapshotsDir: async (): Promise<string> => {
      try {
        const res = await apiFetch<{ dir: string }>('/api/wsl/snapshots-dir');
        return res.dir || '';
      } catch {
        return '';
      }
    },
    setWslSnapshotsDir: async (dir: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/wsl/snapshots-dir', {
          method: 'PUT',
          body: JSON.stringify({ dir })
        });
        return res.success;
      } catch {
        return false;
      }
    },
    listWslSnapshots: async (dir?: string): Promise<WslSnapshotFileInfo[]> => {
      try {
        const query = dir ? `?dir=${encodeURIComponent(dir)}` : '';
        return await apiFetch<WslSnapshotFileInfo[]>(`/api/wsl/snapshots${query}`);
      } catch {
        return [];
      }
    },
    importWslSnapshot: async (params: { distroName: string; installDir: string; tarPath: string }): Promise<WslSnapshotActionResult> => {
      try {
        return await apiFetch<WslSnapshotActionResult>('/api/wsl/import', {
          method: 'POST',
          body: JSON.stringify(params)
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    exportWslSnapshot: async (params: { distroName: string; outputPath: string }): Promise<WslSnapshotActionResult> => {
      try {
        return await apiFetch<WslSnapshotActionResult>('/api/wsl/export', {
          method: 'POST',
          body: JSON.stringify(params)
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    unregisterWslDistro: async (distroName: string): Promise<WslSnapshotActionResult> => {
      try {
        return await apiFetch<WslSnapshotActionResult>(`/api/wsl/distros/${encodeURIComponent(distroName)}`, {
          method: 'DELETE'
        });
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
    checkInfrDockerScripts: async (customPath?: string): Promise<InfrDockerScriptStatus[]> => {
      try {
        const query = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
        return await apiFetch<InfrDockerScriptStatus[]>(`/api/infr/scripts${query}`);
      } catch {
        return [];
      }
    },
    runInfrSetupScript: async (scriptType: 'oracle' | 'wta' | 'wsh', options: any): Promise<{ success: boolean; output: string }> => {
      try {
        return await apiFetch<{ success: boolean; output: string }>('/api/infr/run-script', {
          method: 'POST',
          body: JSON.stringify({ scriptType, options })
        });
      } catch (err: any) {
        return { success: false, output: err.message };
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
    stopContainerSequence: async (containers: string[]) => {
      return apiFetch('/api/docker/stop-sequence', {
        method: 'POST',
        body: JSON.stringify({ containers })
      });
    },
    onContainerStopSequenceProgress: (callback: (step: any) => void) => {
      return wsManager.subscribe('docker:stop-sequence-progress', callback);
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
    openWtaKarafClient: async (containerName: string): Promise<boolean> => {
      try {
        const res = await apiFetch<{ success: boolean }>('/api/docker/wta-karaf-client', {
          method: 'POST',
          body: JSON.stringify({ containerName })
        });
        return res.success;
      } catch {
        return false;
      }
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
    },

    // APM & Observabilidade (OpenTelemetry / SigNoz)
    getApmOverview: async (filter?: ApmFilter): Promise<ObservabilityOverview> => {
      try {
        const query = filter?.serviceName ? `?serviceName=${encodeURIComponent(filter.serviceName)}` : '';
        return await apiFetch<ObservabilityOverview>(`/api/apm/overview${query}`);
      } catch (err: any) {
        return {
          totalTraces: 0,
          totalSpans: 0,
          requestsPerSecond: 0,
          errorRate: 0,
          avgLatencyMs: 0,
          p50LatencyMs: 0,
          p95LatencyMs: 0,
          p99LatencyMs: 0,
          services: [],
          topEndpoints: [],
          slowQueries: [],
          timeSeries: [],
          dbTimePercentage: 0,
          receiverStatus: {
            listening: false,
            port: 4318,
            error: err.message,
            totalIngestedSpans: 0,
            totalIngestedTraces: 0,
            bufferSize: 0,
            maxBufferSize: 5000
          }
        };
      }
    },
    getApmTraces: async (filter?: ApmFilter): Promise<TraceSummary[]> => {
      try {
        return await apiFetch<TraceSummary[]>('/api/apm/traces', {
          method: 'POST',
          body: JSON.stringify(filter || {})
        });
      } catch {
        return [];
      }
    },
    getApmTraceDetails: async (traceId: string): Promise<TraceDetails | null> => {
      try {
        return await apiFetch<TraceDetails>(`/api/apm/traces/${encodeURIComponent(traceId)}`);
      } catch {
        return null;
      }
    },
    getApmServices: async (): Promise<ServiceMetricsSummary[]> => {
      try {
        return await apiFetch<ServiceMetricsSummary[]>('/api/apm/services');
      } catch {
        return [];
      }
    },
    getApmReceiverStatus: async (): Promise<ApmReceiverStatus> => {
      try {
        return await apiFetch<ApmReceiverStatus>('/api/apm/receiver-status');
      } catch (err: any) {
        return {
          listening: false,
          port: 4318,
          error: err.message,
          totalIngestedSpans: 0,
          totalIngestedTraces: 0,
          bufferSize: 0,
          maxBufferSize: 5000
        };
      }
    },
    clearApmTraces: async (): Promise<{ success: boolean }> => {
      try {
        return await apiFetch<{ success: boolean }>('/api/apm/traces', { method: 'DELETE' });
      } catch {
        return { success: false };
      }
    },
    generateApmDemo: async (): Promise<{ generatedSpans: number; generatedTraces: number }> => {
      return apiFetch<{ generatedSpans: number; generatedTraces: number }>('/api/apm/demo', { method: 'POST' });
    },
    changeApmReceiverPort: async (port: number): Promise<ApmReceiverPortChangeResult> => {
      return apiFetch<ApmReceiverPortChangeResult>('/api/apm/receiver-port', {
        method: 'POST',
        body: JSON.stringify({ port })
      });
    },
    onApmNewTrace: (callback: (trace: TraceSummary) => void) => {
      return wsManager.subscribe('apm:new-trace', callback);
    },

    // Auto-update (No modo Web/Docker operações de auto-update desktop são no-op)
    checkForUpdate: async (): Promise<void> => {},
    downloadUpdate: async (): Promise<void> => {},
    installUpdate: async (): Promise<void> => {},
    onUpdateStatus: (_callback: (status: UpdateStatus) => void): (() => void) => () => {},

    // QA Studio & Validador Regressivo
    qaListTemplates: async (): Promise<QaRegressionTemplate[]> => {
      return apiFetch<QaRegressionTemplate[]>('/api/qa/templates');
    },
    qaGetTemplate: async (id: string): Promise<QaRegressionTemplate | null> => {
      try {
        return await apiFetch<QaRegressionTemplate>(`/api/qa/templates/${id}`);
      } catch {
        return null;
      }
    },
    qaSaveTemplate: async (template: QaRegressionTemplate): Promise<QaRegressionTemplate> => {
      return apiFetch<QaRegressionTemplate>('/api/qa/templates', {
        method: 'POST',
        body: JSON.stringify(template)
      });
    },
    qaDeleteTemplate: async (id: string): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>(`/api/qa/templates/${id}`, {
        method: 'DELETE'
      });
      return !!res?.success;
    },
    qaExecuteSuite: async (request: QaExecutionRequest): Promise<QaExecutionResult> => {
      return apiFetch<QaExecutionResult>('/api/qa/execute', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },
    qaGetTemplatesDir: async (): Promise<string> => {
      const res = await apiFetch<{ path: string }>('/api/qa/templates-dir');
      return res.path || '';
    },
    qaSearchCorePayloads: async (
      filter: QaCoreSearchFilter,
      connectionId?: string
    ): Promise<QaCoreSearchResult> => {
      if (window.electronAPI?.qaSearchCorePayloads) {
        return window.electronAPI.qaSearchCorePayloads(filter, connectionId);
      }
      return apiFetch<QaCoreSearchResult>('/api/qa/payloads/search', {
        method: 'POST',
        body: JSON.stringify({ filter, connectionId })
      });
    },
    qaFetchApiPayload: async (request: QaApiFetchRequest): Promise<QaApiFetchResult> => {
      if (window.electronAPI?.qaFetchApiPayload) {
        return window.electronAPI.qaFetchApiPayload(request);
      }
      return apiFetch<QaApiFetchResult>('/api/qa/payloads/fetch-api', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    },

    // Automated Test Runners
    testRunnerList: async (): Promise<TestRunnerConfig[]> => {
      return apiFetch<TestRunnerConfig[]>('/api/test-runner/list');
    },
    testRunnerSave: async (runner: Partial<TestRunnerConfig>): Promise<TestRunnerConfig> => {
      return apiFetch<TestRunnerConfig>('/api/test-runner/save', {
        method: 'POST',
        body: JSON.stringify(runner)
      });
    },
    testRunnerDelete: async (id: string): Promise<{ success: boolean }> => {
      return apiFetch<{ success: boolean }>(`/api/test-runner/${id}`, {
        method: 'DELETE'
      });
    },
    testRunnerExecute: async (target: string | TestRunnerConfig): Promise<TestExecutionResult> => {
      return apiFetch<TestExecutionResult>('/api/test-runner/execute', {
        method: 'POST',
        body: JSON.stringify(typeof target === 'string' ? { id: target } : target)
      });
    },
    testRunnerAbort: async (): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>('/api/test-runner/abort', {
        method: 'POST'
      });
      return !!res?.success;
    },
    testRunnerGetHistory: async (): Promise<TestExecutionResult[]> => {
      return apiFetch<TestExecutionResult[]>('/api/test-runner/history');
    },
    testRunnerClearHistory: async (): Promise<{ success: boolean }> => {
      return apiFetch<{ success: boolean }>('/api/test-runner/clear-history', {
        method: 'POST'
      });
    },
    onTestRunnerChunk: (callback: (data: { runnerId: string; chunk: string }) => void) => {
      return wsManager.subscribe('test-runner:chunk', callback);
    },

    // TAUT-Mississauga Cypress Integration (QA Hub)
    tautGetStatus: async (customPath?: string): Promise<TautProjectStatus> => {
      const q = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
      return apiFetch<TautProjectStatus>(`/api/taut/status${q}`);
    },
    tautSavePath: async (targetPath: string): Promise<{ success: boolean }> => {
      return apiFetch<{ success: boolean }>('/api/taut/path', {
        method: 'POST',
        body: JSON.stringify({ path: targetPath })
      });
    },
    tautGetCoverage: async (customPath?: string): Promise<TautCoverageReport> => {
      const q = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
      return apiFetch<TautCoverageReport>(`/api/taut/coverage${q}`);
    },
    tautListSpecs: async (customPath?: string): Promise<TautSpecSummary[]> => {
      const q = customPath ? `?path=${encodeURIComponent(customPath)}` : '';
      return apiFetch<TautSpecSummary[]>(`/api/taut/specs${q}`);
    },
    tautSyncEnv: async (customPath?: string, connectionId?: string): Promise<TautEnvSyncResult> => {
      return apiFetch<TautEnvSyncResult>('/api/taut/sync-env', {
        method: 'POST',
        body: JSON.stringify({ customPath, connectionId })
      });
    },
    tautProcessIntake: async (csvFile: string, projectPath?: string): Promise<TautCsvIntakeResult> => {
      return apiFetch<TautCsvIntakeResult>('/api/taut/intake', {
        method: 'POST',
        body: JSON.stringify({ csvFile, projectPath })
      });
    },
    tautRunTests: async (options: TautRunOptions): Promise<TestExecutionResult> => {
      return apiFetch<TestExecutionResult>('/api/taut/run', {
        method: 'POST',
        body: JSON.stringify(options)
      });
    },
    tautAbortTests: async (): Promise<boolean> => {
      const res = await apiFetch<{ success: boolean }>('/api/taut/abort', {
        method: 'POST'
      });
      return !!res?.success;
    },
    onTautChunk: (callback: (data: { chunk: string }) => void) => {
      return wsManager.subscribe('taut:chunk', callback);
    }
  };
}

/**
 * Instância exportada para conveniência de importação direta, apontando para a interface
 * `window.electronAPI`. Resolvida a cada acesso: no modo Web o bridge só é instalado por
 * `initApiBridge()`, que roda depois de este módulo ser avaliado (import em main.tsx) — capturar
 * o valor na carga deixaria `api` indefinido para sempre fora do Electron.
 */
export const api = new Proxy({} as typeof window.electronAPI, {
  get: (_target, prop) => (typeof window !== 'undefined' ? (window as any).electronAPI?.[prop] : undefined)
});

export const apiBridge = api;

