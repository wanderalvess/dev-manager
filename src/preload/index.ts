import { contextBridge, ipcRenderer } from 'electron';
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
  PathStatusInfo,
  SelectFileOptions,
  SystemAppInfo,
  DocSearchResult,
  DocsIndexStatus,
  DocsIndexProgress,
  DocSyncProgress,
  DocSyncResult,
  DatabaseConnectionConfig,
  QueryResult,
  DockerContainerInfo,
  DockerDaemonStatus,
  NetworkIpInfo,
  ExplainPlanResult,
  SystemMetrics,
  HttpHealthResult,
  DeployProfile,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
  TableColumnInfo,
  DockerContainerStats,
  LogWatchStatus,
  LogChunkEvent,
  BackupConfig,
  BackupResult,
  BackupFileInfo
} from '../shared/types';

const electronAPI = {
  // Diálogos Nativos do Sistema & Verificação de Caminhos
  selectDirectory: (defaultPath?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-directory', defaultPath),
  selectFile: (options?: SelectFileOptions): Promise<string | null> =>
    ipcRenderer.invoke('dialog:select-file', options),
  checkPath: (targetPath: string): Promise<PathStatusInfo> =>
    ipcRenderer.invoke('system:check-path', targetPath),
  autoDetectPaths: (): Promise<Partial<AppSettings>> =>
    ipcRenderer.invoke('system:auto-detect-paths'),
  getAppInfo: (): Promise<SystemAppInfo> =>
    ipcRenderer.invoke('system:get-app-info'),

  // Gestor de Ambiente
  checkAdmin: (): Promise<boolean> => ipcRenderer.invoke('env:check-admin'),
  getServicesStatus: (customServices?: TrackedServiceConfig[]): Promise<ServiceStatus[]> =>
    ipcRenderer.invoke('env:get-services-status', customServices),
  getProcessesStatus: (customProcesses?: TrackedProcessConfig[]): Promise<ProcessStatus[]> =>
    ipcRenderer.invoke('env:get-processes-status', customProcesses),
  checkPorts: (): Promise<PortStatus[]> => ipcRenderer.invoke('env:check-ports'),
  startService: (name: string): Promise<boolean> => ipcRenderer.invoke('env:start-service', name),
  stopService: (name: string): Promise<boolean> => ipcRenderer.invoke('env:stop-service', name),
  batchStartServices: (serviceNames: string[]): Promise<Record<string, boolean>> =>
    ipcRenderer.invoke('env:batch-start-services', serviceNames),
  batchStopServices: (serviceNames: string[]): Promise<Record<string, boolean>> =>
    ipcRenderer.invoke('env:batch-stop-services', serviceNames),
  batchKillProcesses: (processNames: string[]): Promise<Record<string, boolean>> =>
    ipcRenderer.invoke('env:batch-kill-processes', processNames),
  launchIntelliJ: (): Promise<boolean> => ipcRenderer.invoke('env:launch-intellij'),
  launchServerDebug: (): Promise<boolean> => ipcRenderer.invoke('env:launch-server-debug'),
  resetEnvironment: (
    options?: 'embedded' | 'external' | EnvironmentAutomationConfig
  ): Promise<{ success: boolean; logs: EnvironmentLog[]; error?: string }> =>
    ipcRenderer.invoke('env:reset-environment', options),
  onEnvLog: (callback: (log: EnvironmentLog) => void) => {
    const subscription = (_: any, log: EnvironmentLog) => callback(log);
    ipcRenderer.on('env:log-event', subscription);
    return () => ipcRenderer.removeListener('env:log-event', subscription);
  },

  // Perfis de Automação & Workflows
  runProfile: (profile: AutomationProfile): Promise<ProfileExecutionResult> =>
    ipcRenderer.invoke('profile:run', profile),
  stopProfile: (profile: AutomationProfile): Promise<{ success: boolean; logs: EnvironmentLog[] }> =>
    ipcRenderer.invoke('profile:stop', profile),
  runProfileStep: (step: AutomationStep, profileName?: string): Promise<boolean> =>
    ipcRenderer.invoke('profile:run-step', step, profileName),
  stopProfileStep: (step: AutomationStep): Promise<boolean> =>
    ipcRenderer.invoke('profile:stop-step', step),
  restartProfileStep: (step: AutomationStep, profileName?: string): Promise<boolean> =>
    ipcRenderer.invoke('profile:restart-step', step, profileName),
  killPort: (port: number): Promise<boolean> =>
    ipcRenderer.invoke('profile:kill-port', port),
  saveProfiles: (profiles: AutomationProfile[], activeProfileId?: string): Promise<AppSettings> =>
    ipcRenderer.invoke('profile:save-all', profiles, activeProfileId),
  onProfileStepProgress: (callback: (data: { stepIndex: number; totalSteps: number; step: AutomationStep }) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('profile:step-progress', subscription);
    return () => ipcRenderer.removeListener('profile:step-progress', subscription);
  },

  // Karaf Deployer & Console Embutido
  startEmbeddedKaraf: (): Promise<boolean> => ipcRenderer.invoke('karaf:start-embedded'),
  sendKarafInput: (input: string): Promise<boolean> => ipcRenderer.invoke('karaf:send-input', input),
  stopEmbeddedKaraf: (): Promise<boolean> => ipcRenderer.invoke('karaf:stop-embedded'),
  isEmbeddedKarafRunning: (): Promise<boolean> => ipcRenderer.invoke('karaf:is-embedded-running'),
  onKarafStdout: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('karaf:stdout', subscription);
    return () => ipcRenderer.removeListener('karaf:stdout', subscription);
  },
  deployKaraf: (request: KarafDeployRequest): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('karaf:deploy', request),
  buildAndDeployKaraf: (
    request: KarafDeployRequest,
    projectPath: string,
    skipTests: boolean = true
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('karaf:build-and-deploy', request, projectPath, skipTests),
  runMavenBuild: (
    projectPath: string,
    skipTests: boolean = true
  ): Promise<{ code: number; stdout: string; stderr: string }> =>
    ipcRenderer.invoke('karaf:run-maven-build', projectPath, skipTests),
  execKarafDiagnostic: (command: string): Promise<{ code: number; stdout: string; stderr: string }> =>
    ipcRenderer.invoke('karaf:exec-diagnostic', command),
  listKarafBundles: (credentials?: { user?: string; pass?: string; port?: number }) =>
    ipcRenderer.invoke('karaf:list-bundles', credentials),
  manageKarafBundle: (
    action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh',
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => ipcRenderer.invoke('karaf:manage-bundle', action, bundleId, credentials),
  getKarafBundleDetails: (
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => ipcRenderer.invoke('karaf:get-bundle-details', bundleId, credentials),
  checkKarafBundleDeps: (
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => ipcRenderer.invoke('karaf:check-bundle-deps', bundleId, credentials),
  checkKarafInstallDeps: (
    target: { location?: string; symbolicName?: string; version?: string },
    credentials?: { user?: string; pass?: string; port?: number }
  ) => ipcRenderer.invoke('karaf:check-install-deps', target, credentials),
  installKarafBundle: (request: InstallBundleRequest) =>
    ipcRenderer.invoke('karaf:install-bundle', request),
  uninstallKarafBundle: (bundleId: string, credentials?: { user?: string; pass?: string; port?: number }) =>
    ipcRenderer.invoke('karaf:uninstall-bundle', bundleId, credentials),
  reinstallKarafBundle: (request: ReinstallBundleRequest) =>
    ipcRenderer.invoke('karaf:reinstall-bundle', request),
  updateKarafBundleVersion: (request: UpdateBundleVersionRequest) =>
    ipcRenderer.invoke('karaf:update-bundle-version', request),
  parsePom: (projectPath: string) => ipcRenderer.invoke('karaf:parse-pom', projectPath),
  onKarafLogChunk: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('karaf:log-chunk', subscription);
    return () => ipcRenderer.removeListener('karaf:log-chunk', subscription);
  },

  // Perfis de Deploy (Karaf / Docker / Comando Genérico)
  runDeployProfile: (profile: DeployProfile): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('deploy:run-profile', profile),
  onDeployLogChunk: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('deploy:log-chunk', subscription);
    return () => ipcRenderer.removeListener('deploy:log-chunk', subscription);
  },

  // Git & Azure DevOps
  listProjects: (): Promise<GitProjectInfo[]> => ipcRenderer.invoke('git:list-projects'),
  getProjectInfo: (projectPath: string): Promise<GitProjectInfo | null> =>
    ipcRenderer.invoke('git:get-project-info', projectPath),
  buildPrUrl: (projectPath: string, targetBranch?: string): Promise<string | null> =>
    ipcRenderer.invoke('git:build-pr-url', projectPath, targetBranch),
  execGitCommand: (projectPath: string, command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('git:exec-command', projectPath, command),
  checkoutBranch: (projectPath: string, branchName: string, createNew?: boolean) =>
    ipcRenderer.invoke('git:checkout-branch', projectPath, branchName, createNew),
  commitAndPush: (projectPath: string, message: string) =>
    ipcRenderer.invoke('git:commit-and-push', projectPath, message),
  getCommitHistory: (projectPath: string, limit?: number) =>
    ipcRenderer.invoke('git:get-commit-history', projectPath, limit),
  getGitStatusDetails: (projectPath: string) =>
    ipcRenderer.invoke('git:get-status-details', projectPath),
  getGitDiff: (projectPath: string, targetFile?: string) =>
    ipcRenderer.invoke('git:get-diff', projectPath, targetFile),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('shell:open-external', url),

  // Catálogo de Rotinas
  listRoutines: (): Promise<RoutineItem[]> => ipcRenderer.invoke('routines:list'),
  launchRoutine: (fullPath: string): Promise<boolean> => ipcRenderer.invoke('routines:launch', fullPath),
  launchMappedProgram: (id: string): Promise<boolean> => ipcRenderer.invoke('routines:launch-mapped', id),
  toggleFavoriteRoutine: (id: string): Promise<AppSettings> => ipcRenderer.invoke('routines:toggle-favorite', id),

  // Índice de Documentação (RAG local)
  reindexDocs: (): Promise<DocsIndexStatus> => ipcRenderer.invoke('docs:reindex'),
  searchDocs: (query: string, options?: { sourceLabel?: string; topK?: number }): Promise<DocSearchResult[]> =>
    ipcRenderer.invoke('docs:search', query, options),
  getDocsIndexStatus: (): Promise<DocsIndexStatus> => ipcRenderer.invoke('docs:get-status'),
  openDocFile: (filePath: string, mode?: 'editor' | 'folder'): Promise<boolean> =>
    ipcRenderer.invoke('docs:open-file', filePath, mode),
  readDocContent: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('docs:read-content', filePath),
  onDocsIndexProgress: (callback: (progress: DocsIndexProgress) => void) => {
    const subscription = (_: any, progress: DocsIndexProgress) => callback(progress);
    ipcRenderer.on('docs:index-progress', subscription);
    return () => ipcRenderer.removeListener('docs:index-progress', subscription);
  },
  syncDocs: (targetId?: string): Promise<DocSyncResult[]> =>
    ipcRenderer.invoke('docs:sync', targetId),
  onDocSyncProgress: (callback: (progress: DocSyncProgress) => void) => {
    const subscription = (_: any, progress: DocSyncProgress) => callback(progress);
    ipcRenderer.on('docs:sync-progress', subscription);
    return () => ipcRenderer.removeListener('docs:sync-progress', subscription);
  },

  // Configurações
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:save', settings),
  exportSettings: (sanitizePasswords?: boolean): Promise<string> =>
    ipcRenderer.invoke('settings:export', sanitizePasswords),
  importSettings: (jsonString: string): Promise<{ success: boolean; error?: string; settings?: AppSettings; warnings?: string[] }> =>
    ipcRenderer.invoke('settings:import', jsonString),

  // Banco de Dados (Oracle, MySQL, Postgres)
  testDbConnection: (config: DatabaseConnectionConfig): Promise<{ success: boolean; message: string; version?: string }> =>
    ipcRenderer.invoke('db:test-connection', config),
  executeDbQuery: (config: DatabaseConnectionConfig, sql: string, maxRows?: number): Promise<QueryResult> =>
    ipcRenderer.invoke('db:execute-query', config, sql, maxRows),
  explainDbPlan: (config: DatabaseConnectionConfig, sql: string): Promise<ExplainPlanResult> =>
    ipcRenderer.invoke('db:explain-plan', config, sql),
  listDbTables: (config: DatabaseConnectionConfig): Promise<string[]> =>
    ipcRenderer.invoke('db:list-tables', config),
  getDbTableColumns: (config: DatabaseConnectionConfig, tableName: string): Promise<TableColumnInfo[]> =>
    ipcRenderer.invoke('db:get-table-columns', config, tableName),
  runDbBackup: (config: DatabaseConnectionConfig, destinationFolder: string, oracleDirectory?: string): Promise<BackupResult> =>
    ipcRenderer.invoke('db:run-backup', config, destinationFolder, oracleDirectory),
  listDbBackups: (destinationFolder: string): Promise<BackupFileInfo[]> =>
    ipcRenderer.invoke('db:list-backups', destinationFolder),
  saveDbBackupConfig: (config: BackupConfig): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('db:save-backup-config', config),

  // Gerenciador de Containers (Docker / Podman)
  getDockerStatus: (): Promise<DockerDaemonStatus> => ipcRenderer.invoke('docker:get-status'),
  listDockerContainers: (): Promise<DockerContainerInfo[]> => ipcRenderer.invoke('docker:list-containers'),
  startDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:start', containerId),
  stopDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:stop', containerId),
  restartDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:restart', containerId),
  getDockerLogs: (containerId: string, lines?: number): Promise<string> =>
    ipcRenderer.invoke('docker:logs', containerId, lines),
  removeDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:remove', containerId),
  getDockerContainerStats: (): Promise<DockerContainerStats[]> =>
    ipcRenderer.invoke('docker:get-stats'),
  openDockerContainerTerminal: (containerId: string, shell?: string): Promise<boolean> =>
    ipcRenderer.invoke('docker:open-terminal', containerId, shell),

  // Métodos genéricos de containers
  getContainerStatus: (): Promise<DockerDaemonStatus> => ipcRenderer.invoke('container:get-status'),
  listContainers: (): Promise<DockerContainerInfo[]> => ipcRenderer.invoke('container:list-containers'),
  startContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('container:start', containerId),
  stopContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('container:stop', containerId),
  restartContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('container:restart', containerId),
  getContainerLogs: (containerId: string, lines?: number): Promise<string> =>
    ipcRenderer.invoke('container:logs', containerId, lines),
  removeContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('container:remove', containerId),
  getContainerStats: (): Promise<DockerContainerStats[]> =>
    ipcRenderer.invoke('container:get-stats'),
  openContainerTerminal: (containerId: string, shell?: string): Promise<boolean> =>
    ipcRenderer.invoke('container:open-terminal', containerId, shell),

  // Rede & Detecção de IPs (Local e WSL)
  getNetworkIps: (): Promise<NetworkIpInfo> => ipcRenderer.invoke('network:get-ips'),
  checkHttpHealth: (url: string, timeoutMs?: number): Promise<HttpHealthResult> =>
    ipcRenderer.invoke('network:check-http-health', url, timeoutMs),

  // Métricas do Sistema
  getSystemMetrics: (): Promise<SystemMetrics> => ipcRenderer.invoke('system:get-metrics'),

  // Leitor e Monitor de Logs em Tempo Real (Tail -f)
  startLogWatch: (
    sourceId: string,
    filePath: string,
    initialLines?: number,
    encoding?: string
  ): Promise<{ status: LogWatchStatus; initialLines: string[] }> =>
    ipcRenderer.invoke('logs:start-watch', sourceId, filePath, initialLines, encoding),
  stopLogWatch: (sourceId: string): Promise<boolean> =>
    ipcRenderer.invoke('logs:stop-watch', sourceId),
  checkLogFile: (filePath: string, sourceId?: string): Promise<LogWatchStatus> =>
    ipcRenderer.invoke('logs:check-file', filePath, sourceId),
  clearLogFile: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('logs:clear-file', filePath),
  onLogChunk: (callback: (event: LogChunkEvent) => void) => {
    const subscription = (_: any, event: LogChunkEvent) => callback(event);
    ipcRenderer.on('logs:chunk', subscription);
    return () => ipcRenderer.removeListener('logs:chunk', subscription);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

