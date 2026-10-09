import { contextBridge, ipcRenderer } from 'electron';
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
  DbObjectInfo,
  DbObjectType,
  DbSessionQueryResult,
  DbSessionState,
  ObjectDdlResult,
  TableDetails,
  QueryResult,
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
  SystemMetrics,
  HttpHealthResult,
  DeployProfile,
  DeployStep,
  DeployProfileHistoryEntry,
  DeployProgressEvent,
  OsgiResolutionDiagnosticSummary,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
  Routine801InstallRequest,
  DbTableColumnsResult,
  DbTablesResult,
  DockerContainerStats,
  ComposeServiceStatus,
  LogWatchStatus,
  LogChunkEvent,
  UpdateStatus,
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
  KarafFeatureInfo,
  KarafFeatureRepoInfo,
  KarafJvmMemoryInfo,
  LogAnalysisSummary,
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
  TautEnvSyncResult,
  ParseTnsNamesResult
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
  getChangelog: (): Promise<string | null> =>
    ipcRenderer.invoke('system:get-changelog'),
  getMcpDocs: (): Promise<string> =>
    ipcRenderer.invoke('system:get-mcp-docs'),

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
    return () => {
      ipcRenderer.removeListener('env:log-event', subscription);
    };
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
    return () => {
      ipcRenderer.removeListener('profile:step-progress', subscription);
    };
  },

  // Karaf Deployer & Console Embutido
  startEmbeddedKaraf: (): Promise<boolean> => ipcRenderer.invoke('karaf:start-embedded'),
  sendKarafInput: (input: string): Promise<boolean> => ipcRenderer.invoke('karaf:send-input', input),
  stopEmbeddedKaraf: (): Promise<boolean> => ipcRenderer.invoke('karaf:stop-embedded'),
  isEmbeddedKarafRunning: (): Promise<boolean> => ipcRenderer.invoke('karaf:is-embedded-running'),
  isKarafRunning: (sshPort?: number): Promise<boolean> => ipcRenderer.invoke('karaf:is-running', sshPort),
  onKarafStdout: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('karaf:stdout', subscription);
    return () => {
      ipcRenderer.removeListener('karaf:stdout', subscription);
    };
  },
  getKarafPersistedLogs: (maxChars?: number): Promise<{ output: string }> =>
    ipcRenderer.invoke('karaf:get-persisted-logs', maxChars),
  clearKarafPersistedLogs: (): Promise<{ success: boolean }> => ipcRenderer.invoke('karaf:clear-persisted-logs'),
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
  getKarafDeployHistory: (): Promise<KarafDeployHistoryEntry[]> => ipcRenderer.invoke('karaf:list-deploy-history'),
  onKarafDeployResult: (callback: (result: { success: boolean; error?: string }) => void) => {
    const subscription = (_: any, result: { success: boolean; error?: string }) => callback(result);
    ipcRenderer.on('karaf:deploy-result', subscription);
    return () => {
      ipcRenderer.removeListener('karaf:deploy-result', subscription);
    };
  },
  onKarafBuildResult: (callback: (result: { code: number; stdout: string; stderr: string }) => void) => {
    const subscription = (_: any, result: { code: number; stdout: string; stderr: string }) => callback(result);
    ipcRenderer.on('karaf:build-result', subscription);
    return () => {
      ipcRenderer.removeListener('karaf:build-result', subscription);
    };
  },
  onDocsReindexComplete: (callback: (status: DocsIndexStatus) => void) => {
    const subscription = (_: any, status: DocsIndexStatus) => callback(status);
    ipcRenderer.on('docs:reindex-complete', subscription);
    return () => {
      ipcRenderer.removeListener('docs:reindex-complete', subscription);
    };
  },
  listKarafBundles: (credentials?: { user?: string; pass?: string; port?: number }) =>
    ipcRenderer.invoke('karaf:list-bundles', credentials),
  manageKarafBundle: (
    action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => ipcRenderer.invoke('karaf:manage-bundle', action, bundleId, credentials),
  manageKarafBundlesBatch: (
    action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
    bundleIds: string[],
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<{ success: boolean; output: string; processedCount: number }> =>
    ipcRenderer.invoke('karaf:manage-bundles-batch', action, bundleIds, credentials),
  getKarafLog: (
    lines?: number,
    credentials?: { user?: string; pass?: string; port?: number }
  ): Promise<{ success: boolean; output: string }> => ipcRenderer.invoke('karaf:get-log', lines, credentials),
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
  listKarafFeatures: (credentials?: { user?: string; pass?: string; port?: number }) =>
    ipcRenderer.invoke('karaf:list-features', credentials),
  uninstallKarafFeature: (featureName: string, version?: string, credentials?: { user?: string; pass?: string; port?: number }) =>
    ipcRenderer.invoke('karaf:uninstall-feature', featureName, version, credentials),
  installKarafFeature: (featureName: string, version?: string, credentials?: { user?: string; pass?: string; port?: number }) =>
    ipcRenderer.invoke('karaf:install-feature', featureName, version, credentials),
  parsePom: (projectPath: string) => ipcRenderer.invoke('karaf:parse-pom', projectPath),
  getKarafJvmMemory: (credentials?: { user?: string; pass?: string; port?: number }): Promise<KarafJvmMemoryInfo> =>
    ipcRenderer.invoke('karaf:get-jvm-memory', credentials),
  triggerKarafGc: (credentials?: { user?: string; pass?: string; port?: number }): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('karaf:trigger-gc', credentials),
  listKarafFeatureRepos: (credentials?: { user?: string; pass?: string; port?: number }): Promise<KarafFeatureRepoInfo[]> =>
    ipcRenderer.invoke('karaf:list-feature-repos', credentials),
  addKarafFeatureRepo: (url: string, credentials?: { user?: string; pass?: string; port?: number }): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('karaf:add-feature-repo', url, credentials),
  removeKarafFeatureRepo: (nameOrUrl: string, credentials?: { user?: string; pass?: string; port?: number }): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('karaf:remove-feature-repo', nameOrUrl, credentials),
  refreshKarafFeatureRepo: (nameOrUrl?: string, credentials?: { user?: string; pass?: string; port?: number }): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('karaf:refresh-feature-repo', nameOrUrl, credentials),
  listAllKarafFeatures: (installedOnly?: boolean, credentials?: { user?: string; pass?: string; port?: number }): Promise<KarafFeatureInfo[]> =>
    ipcRenderer.invoke('karaf:list-all-features', installedOnly, credentials),
  analyzeKarafLog: (content: string | string[]): Promise<LogAnalysisSummary> =>
    ipcRenderer.invoke('karaf:analyze-log', content),
  onKarafLogChunk: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('karaf:log-chunk', subscription);
    return () => {
      ipcRenderer.removeListener('karaf:log-chunk', subscription);
    };
  },

  // Rotina 801 - Atualização e Instalação de Serviços Web Oficiais
  routine801GetInstallations: (customUrl?: string) =>
    ipcRenderer.invoke('routine801:get-installations', customUrl),
  routine801GetUpdates: (customUrl?: string) =>
    ipcRenderer.invoke('routine801:get-updates', customUrl),
  routine801CheckServer: (customUrl?: string) =>
    ipcRenderer.invoke('routine801:check-server', customUrl),
  routine801InstallFeatures: (request: Routine801InstallRequest) =>
    ipcRenderer.invoke('routine801:install-features', request),

  // Perfis de Deploy (Karaf / Docker / Comando Genérico)
  runDeployProfile: (
    profile: DeployProfile
  ): Promise<{ success: boolean; error?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> =>
    ipcRenderer.invoke('deploy:run-profile', profile),
  runDeployStep: (
    step: DeployStep,
    profileName?: string
  ): Promise<{ success: boolean; error?: string; resolutionDiagnostic?: OsgiResolutionDiagnosticSummary }> =>
    ipcRenderer.invoke('deploy:run-step', step, profileName),
  abortDeploy: (): Promise<{ success: boolean }> => ipcRenderer.invoke('deploy:abort'),
  getDeployProfileHistory: (): Promise<DeployProfileHistoryEntry[]> =>
    ipcRenderer.invoke('deploy:get-history'),
  clearDeployProfileHistory: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('deploy:clear-history'),
  onDeployLogChunk: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('deploy:log-chunk', subscription);
    return () => {
      ipcRenderer.removeListener('deploy:log-chunk', subscription);
    };
  },
  onDeployStepProgress: (callback: (data: DeployProgressEvent) => void) => {
    const subscription = (_: any, data: DeployProgressEvent) => callback(data);
    ipcRenderer.on('deploy:step-progress', subscription);
    return () => {
      ipcRenderer.removeListener('deploy:step-progress', subscription);
    };
  },

  // Git & Azure DevOps
  listProjects: (): Promise<GitProjectInfo[]> => ipcRenderer.invoke('git:list-projects'),
  getProjectInfo: (projectPath: string): Promise<GitProjectInfo | null> =>
    ipcRenderer.invoke('git:get-project-info', projectPath),
  buildPrUrl: (projectPath: string, targetBranch?: string): Promise<string | null> =>
    ipcRenderer.invoke('git:build-pr-url', projectPath, targetBranch),
  execGitCommand: (projectPath: string, command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('git:exec-command', projectPath, command),
  checkoutBranch: (projectPath: string, branchName: string, createNew?: boolean, baseBranch?: string) =>
    ipcRenderer.invoke('git:checkout-branch', projectPath, branchName, createNew, baseBranch),
  createTaskBranch: (projectPath: string, options: CreateTaskBranchOptions): Promise<{ success: boolean; output: string; branchName: string }> =>
    ipcRenderer.invoke('git:create-task-branch', projectPath, options),
  openFileInIde: (projectPath: string, relativePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('git:open-file-in-ide', projectPath, relativePath),
  fetchTasks: (projectPath?: string, query?: string): Promise<GitTaskItem[]> =>
    ipcRenderer.invoke('git:fetch-tasks', projectPath, query),
  commitAndPush: (projectPath: string, message: string) =>
    ipcRenderer.invoke('git:commit-and-push', projectPath, message),
  getCommitHistory: (projectPath: string, limit?: number) =>
    ipcRenderer.invoke('git:get-commit-history', projectPath, limit),
  getGitStatusDetails: (projectPath: string) =>
    ipcRenderer.invoke('git:get-status-details', projectPath),
  getGitDiff: (projectPath: string, targetFile?: string) =>
    ipcRenderer.invoke('git:get-diff', projectPath, targetFile),
  getGitUncommittedCounts: (): Promise<Record<string, number>> => ipcRenderer.invoke('git:get-uncommitted-counts'),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('shell:open-external', url),

  // Catálogo de Rotinas
  listRoutines: (): Promise<RoutineItem[]> => ipcRenderer.invoke('routines:list'),
  launchRoutine: (fullPath: string, forceDirect?: boolean): Promise<RoutineLaunchResult> =>
    ipcRenderer.invoke('routines:launch', fullPath, forceDirect),
  checkRoutineKarafStatus: (): Promise<KarafWtaStatusResult> => ipcRenderer.invoke('routines:check-karaf-status'),
  launchMappedProgram: (id: string): Promise<boolean> => ipcRenderer.invoke('routines:launch-mapped', id),
  toggleFavoriteRoutine: (id: string): Promise<AppSettings> => ipcRenderer.invoke('routines:toggle-favorite', id),
  downloadCcwRoutine: (req: RoutineDownloadRequest): Promise<RoutineDownloadResult> =>
    ipcRenderer.invoke('routines:download-ccw', req),
  installLocalRoutineFile: (
    filePath: string,
    routineCodeOrName?: string,
    targetModule?: string,
    backupExisting?: boolean
  ): Promise<RoutineDownloadResult> =>
    ipcRenderer.invoke('routines:install-local', filePath, routineCodeOrName, targetModule, backupExisting),
  getCcwCatalog: (authCookie?: string): Promise<CcwCatalogResponse> =>
    ipcRenderer.invoke('routines:get-ccw-catalog', authCookie),
  getCcwDownloadUrl: (routineName: string, winthorVersion?: string): Promise<string> =>
    ipcRenderer.invoke('routines:get-ccw-download-url', routineName, winthorVersion),
  listRoutineBackups: (routineIdOrName: string, moduleFolder?: string): Promise<RoutineBackupEntry[]> =>
    ipcRenderer.invoke('routines:list-backups', routineIdOrName, moduleFolder),
  restoreRoutineBackup: (backupFilePath: string, targetRoutinePath: string): Promise<RoutineRollbackResult> =>
    ipcRenderer.invoke('routines:restore-backup', backupFilePath, targetRoutinePath),
  deleteRoutineBackup: (backupFilePath: string): Promise<{ success: boolean; message?: string; error?: string }> =>
    ipcRenderer.invoke('routines:delete-backup', backupFilePath),
  getRoutineExecutableVersion: (filePath: string): Promise<ExecutableVersionInfo | null> =>
    ipcRenderer.invoke('routines:get-version', filePath),
  downloadRoutinesBatch: (request: BatchRoutineDownloadRequest): Promise<BatchRoutineDownloadResult> =>
    ipcRenderer.invoke('routines:batch-download', request),
  onRoutineBatchProgress: (callback: (progress: BatchRoutineItemProgress) => void) => {
    const subscription = (_: any, data: BatchRoutineItemProgress) => callback(data);
    ipcRenderer.on('routines:batch-progress', subscription);
    return () => {
      ipcRenderer.removeListener('routines:batch-progress', subscription);
    };
  },

  // Índice de Documentação (RAG local)
  reindexDocs: (): Promise<DocsIndexStatus> => ipcRenderer.invoke('docs:reindex'),
  searchDocs: (query: string, options?: { sourceLabel?: string; topK?: number }): Promise<DocSearchResult[]> =>
    ipcRenderer.invoke('docs:search', query, options),
  getDocsIndexStatus: (): Promise<DocsIndexStatus> => ipcRenderer.invoke('docs:get-status'),
  testConfluenceConnection: (config: ConfluenceSourceConfig): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('docs:test-confluence-connection', config),
  testJiraConnection: (config: JiraSourceConfig): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('docs:test-jira-connection', config),
  testLlmConnection: (config: LlmProviderConfig): Promise<LlmTestResult> =>
    ipcRenderer.invoke('llm:test-connection', config),
  llmChat: (request: LlmChatRequest): Promise<LlmChatResponse> =>
    ipcRenderer.invoke('llm:chat', request),
  askDocsWithAi: (request: LlmRagQueryRequest): Promise<LlmRagQueryResponse> =>
    ipcRenderer.invoke('llm:ask-with-docs', request),
  openDocFile: (filePath: string, mode?: 'editor' | 'folder'): Promise<boolean> =>
    ipcRenderer.invoke('docs:open-file', filePath, mode),
  readDocContent: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('docs:read-content', filePath),
  onDocsIndexProgress: (callback: (progress: DocsIndexProgress) => void) => {
    const subscription = (_: any, progress: DocsIndexProgress) => callback(progress);
    ipcRenderer.on('docs:index-progress', subscription);
    return () => {
      ipcRenderer.removeListener('docs:index-progress', subscription);
    };
  },
  syncDocs: (targetId?: string): Promise<DocSyncResult[]> =>
    ipcRenderer.invoke('docs:sync', targetId),
  onDocSyncProgress: (callback: (progress: DocSyncProgress) => void) => {
    const subscription = (_: any, progress: DocSyncProgress) => callback(progress);
    ipcRenderer.on('docs:sync-progress', subscription);
    return () => {
      ipcRenderer.removeListener('docs:sync-progress', subscription);
    };
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
  parseTnsNames: (filePath?: string): Promise<ParseTnsNamesResult> =>
    ipcRenderer.invoke('db:parse-tnsnames', filePath),
  testDbConnection: (config: DatabaseConnectionConfig): Promise<{ success: boolean; message: string; version?: string }> =>
    ipcRenderer.invoke('db:test-connection', config),
  executeDbQuery: (config: DatabaseConnectionConfig, sql: string, maxRows?: number, binds?: Record<string, any>): Promise<QueryResult> =>
    ipcRenderer.invoke('db:execute-query', config, sql, maxRows, binds),
  getDbTableDetails: (config: DatabaseConnectionConfig, tableName: string): Promise<TableDetails> =>
    ipcRenderer.invoke('db:get-table-details', config, tableName),
  getDbObjectDdl: (config: DatabaseConnectionConfig, objectType: DbObjectType, objectName: string): Promise<ObjectDdlResult> =>
    ipcRenderer.invoke('db:get-object-ddl', config, objectType, objectName),
  listDbObjects: (config: DatabaseConnectionConfig): Promise<DbObjectInfo[]> => ipcRenderer.invoke('db:list-objects', config),
  openDbSession: (config: DatabaseConnectionConfig, autoCommit?: boolean): Promise<DbSessionState> =>
    ipcRenderer.invoke('db:session-open', config, autoCommit),
  executeDbSession: (sessionId: string, sql: string, maxRows?: number, binds?: Record<string, any>): Promise<DbSessionQueryResult> =>
    ipcRenderer.invoke('db:session-execute', sessionId, sql, maxRows, binds),
  commitDbSession: (sessionId: string): Promise<DbSessionState> => ipcRenderer.invoke('db:session-commit', sessionId),
  rollbackDbSession: (sessionId: string): Promise<DbSessionState> => ipcRenderer.invoke('db:session-rollback', sessionId),
  setDbSessionAutoCommit: (sessionId: string, autoCommit: boolean): Promise<DbSessionState> =>
    ipcRenderer.invoke('db:session-set-autocommit', sessionId, autoCommit),
  cancelDbSession: (sessionId: string): Promise<DbSessionState> => ipcRenderer.invoke('db:session-cancel', sessionId),
  closeDbSession: (sessionId: string): Promise<void> => ipcRenderer.invoke('db:session-close', sessionId),
  explainDbPlan: (config: DatabaseConnectionConfig, sql: string): Promise<ExplainPlanResult> =>
    ipcRenderer.invoke('db:explain-plan', config, sql),
  listDbTables: (config: DatabaseConnectionConfig): Promise<DbTablesResult> =>
    ipcRenderer.invoke('db:list-tables', config),
  getDbTableColumns: (config: DatabaseConnectionConfig, tableName: string): Promise<DbTableColumnsResult> =>
    ipcRenderer.invoke('db:get-table-columns', config, tableName),
  insertDbRow: (config: DatabaseConnectionConfig, tableName: string, values: Record<string, any>, sessionId?: string): Promise<QueryResult> =>
    ipcRenderer.invoke('db:insert-row', config, tableName, values, sessionId),
  updateDbRow: (config: DatabaseConnectionConfig, tableName: string, changes: Record<string, any>, where: Record<string, any>, sessionId?: string): Promise<QueryResult> =>
    ipcRenderer.invoke('db:update-row', config, tableName, changes, where, sessionId),
  deleteDbRow: (config: DatabaseConnectionConfig, tableName: string, where: Record<string, any>, sessionId?: string): Promise<QueryResult> =>
    ipcRenderer.invoke('db:delete-row', config, tableName, where, sessionId),
  getOracleActiveSessions: (config: DatabaseConnectionConfig, filter?: OracleTracerFilter): Promise<OracleActiveSessionsResult> =>
    ipcRenderer.invoke('db:get-oracle-active-sessions', config, filter),
  getOracleRecentStatements: (config: DatabaseConnectionConfig, filter?: OracleTracerFilter): Promise<OracleRecentStatementsResult> =>
    ipcRenderer.invoke('db:get-oracle-recent-statements', config, filter),
  getOracleStatementBinds: (config: DatabaseConnectionConfig, sqlId: string, sqlText?: string): Promise<OracleStatementBindsResult> =>
    ipcRenderer.invoke('db:get-oracle-statement-binds', config, sqlId, sqlText),
  startOracleCapture: (config: DatabaseConnectionConfig, options: OracleCaptureOptions): Promise<OracleCaptureState> =>
    ipcRenderer.invoke('db:start-oracle-capture', config, options),
  stopOracleCapture: (connectionId: string): Promise<OracleCaptureState> =>
    ipcRenderer.invoke('db:stop-oracle-capture', connectionId),
  clearOracleCapture: (connectionId: string): Promise<OracleCaptureState> =>
    ipcRenderer.invoke('db:clear-oracle-capture', connectionId),
  getOracleCaptureState: (connectionId: string): Promise<OracleCaptureState> =>
    ipcRenderer.invoke('db:get-oracle-capture-state', connectionId),
  runDbBackup: (
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    oracleDirectory?: string,
    compress?: boolean,
    useCustomCommand?: boolean,
    customCommand?: string
  ): Promise<BackupResult> =>
    ipcRenderer.invoke('db:run-backup', config, destinationFolder, oracleDirectory, compress, useCustomCommand, customCommand),
  listDbBackups: (destinationFolder: string): Promise<BackupFileInfo[]> =>
    ipcRenderer.invoke('db:list-backups', destinationFolder),
  saveDbBackupConfig: (config: BackupConfig): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('db:save-backup-config', config),
  restoreDbBackup: (config: DatabaseConnectionConfig, filePath: string): Promise<BackupResult> =>
    ipcRenderer.invoke('db:restore-backup', config, filePath),
  listDbBackupHistory: (connectionId?: string): Promise<BackupHistoryEntry[]> =>
    ipcRenderer.invoke('db:list-backup-history', connectionId),
  runDbRestoreDrill: (scratchConnection: DatabaseConnectionConfig, filePath: string): Promise<BackupResult> =>
    ipcRenderer.invoke('db:run-restore-drill', scratchConnection, filePath),
  testBackupWebhook: (webhook: BackupWebhookConfig): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('backup:test-webhook', webhook),
  onBackupScheduleResult: (callback: (data: { connectionName: string; result: BackupResult }) => void) => {
    const subscription = (_: any, data: { connectionName: string; result: BackupResult }) => callback(data);
    ipcRenderer.on('backup:schedule-result', subscription);
    return () => {
      ipcRenderer.removeListener('backup:schedule-result', subscription);
    };
  },

  // Gerenciador de Containers (Docker / Podman / WSL)
  listWslDistros: (): Promise<WslDistroInfo[]> => ipcRenderer.invoke('wsl:list-distros'),
  startWslDockerDaemon: (distro: string): Promise<WslActionResult> =>
    ipcRenderer.invoke('wsl:start-docker-daemon', distro),
  terminateWslDistro: (distro: string): Promise<boolean> =>
    ipcRenderer.invoke('wsl:terminate-distro', distro),
  openWslTerminal: (distro: string): Promise<boolean> =>
    ipcRenderer.invoke('wsl:open-terminal', distro),
  getWslDistroIp: (distro?: string): Promise<string | null> =>
    ipcRenderer.invoke('wsl:get-distro-ip', distro),
  openWslDumpsFolder: (distro?: string): Promise<{ success: boolean; path: string; error?: string }> =>
    ipcRenderer.invoke('wsl:open-dumps-folder', distro),
  listWslDmpFiles: (distro?: string): Promise<WslDumpFileInfo[]> =>
    ipcRenderer.invoke('wsl:list-dmp-files', distro),
  generateMd5: (text: string): Promise<{ lower: string; upper: string }> =>
    ipcRenderer.invoke('wsl:generate-md5', text),
  checkWshPrerequisites: (distro?: string): Promise<WshPrerequisiteStatus[]> =>
    ipcRenderer.invoke('wsl:check-wsh-prerequisites', distro),
  openWslOptFolder: (distro?: string): Promise<{ success: boolean; path: string; error?: string }> =>
    ipcRenderer.invoke('wsl:open-opt-folder', distro),
  getWslSnapshotsDir: (): Promise<string> =>
    ipcRenderer.invoke('wsl:get-snapshots-dir'),
  setWslSnapshotsDir: (dir: string): Promise<boolean> =>
    ipcRenderer.invoke('wsl:set-snapshots-dir', dir),
  listWslSnapshots: (dir?: string): Promise<WslSnapshotFileInfo[]> =>
    ipcRenderer.invoke('wsl:list-snapshots', dir),
  importWslSnapshot: (params: { distroName: string; installDir: string; tarPath: string }): Promise<WslSnapshotActionResult> =>
    ipcRenderer.invoke('wsl:import-snapshot', params),
  exportWslSnapshot: (params: { distroName: string; outputPath: string }): Promise<WslSnapshotActionResult> =>
    ipcRenderer.invoke('wsl:export-snapshot', params),
  unregisterWslDistro: (distroName: string): Promise<WslSnapshotActionResult> =>
    ipcRenderer.invoke('wsl:unregister-distro', distroName),
  checkInfrDockerScripts: (customPath?: string): Promise<InfrDockerScriptStatus[]> =>
    ipcRenderer.invoke('infr:check-scripts', customPath),
  runInfrSetupScript: (scriptType: 'oracle' | 'wta' | 'wsh', options: any): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('infr:run-setup-script', { scriptType, options }),
  setDockerTargetWslDistro: (distro: string | null): Promise<DockerDaemonStatus> =>
    ipcRenderer.invoke('docker:set-target-wsl-distro', distro),
  getContainerEnvironments: (): Promise<{ environments: ContainerEnvironment[]; snapshotsDir?: string }> =>
    ipcRenderer.invoke('wsl:get-environments'),
  saveContainerEnvironment: (env: ContainerEnvironment): Promise<boolean> =>
    ipcRenderer.invoke('wsl:save-environment', env),
  deleteContainerEnvironment: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('wsl:delete-environment', id),
  startContainerSequence: (
    containers: { name: string; delay?: number }[]
  ): Promise<{ success: boolean; started: string[]; failed?: string; error?: string }> =>
    ipcRenderer.invoke('docker:start-sequence', containers),
  onContainerSequenceProgress: (
    callback: (step: { currentName: string; index: number; total: number; waitingSeconds?: number }) => void
  ) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('docker:sequence-progress', subscription);
    return () => {
      ipcRenderer.removeListener('docker:sequence-progress', subscription);
    };
  },
  stopContainerSequence: (
    containers: string[]
  ): Promise<{ success: boolean; stopped: string[]; failed?: string; error?: string }> =>
    ipcRenderer.invoke('docker:stop-sequence', containers),
  onContainerStopSequenceProgress: (
    callback: (step: { currentName: string; index: number; total: number }) => void
  ) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('docker:stop-sequence-progress', subscription);
    return () => {
      ipcRenderer.removeListener('docker:stop-sequence-progress', subscription);
    };
  },

  // Ferramentas de Manutenção Oracle (INFR-Docker)
  execOracleHealth: (
    containerName: string,
    schema?: string,
    fix?: boolean,
    user?: string,
    password?: string
  ): Promise<OracleMaintenanceResult> =>
    ipcRenderer.invoke('docker:oracle-health', containerName, schema, fix, user, password),
  openOracleSqlPlus: (containerName: string, user?: string, password?: string): Promise<boolean> =>
    ipcRenderer.invoke('docker:oracle-sqlplus', containerName, user, password),
  execOracleDataPump: (params: OracleDataPumpParams): Promise<OracleMaintenanceResult> =>
    ipcRenderer.invoke('docker:oracle-datapump', params),
  openWtaKarafClient: (containerName: string): Promise<boolean> =>
    ipcRenderer.invoke('docker:wta-karaf-client', containerName),

  getDockerStatus: (): Promise<DockerDaemonStatus> => ipcRenderer.invoke('docker:get-status'),
  listDockerContainers: (): Promise<DockerContainerInfo[]> => ipcRenderer.invoke('docker:list-containers'),
  startDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:start', containerId),
  stopDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:stop', containerId),
  restartDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:restart', containerId),
  pauseDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:pause', containerId),
  unpauseDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:unpause', containerId),
  inspectDockerContainer: (containerId: string): Promise<DockerContainerInspect | null> =>
    ipcRenderer.invoke('docker:inspect', containerId),
  pruneDockerContainers: (): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('docker:prune'),
  getDockerLogs: (containerId: string, lines?: number): Promise<string> =>
    ipcRenderer.invoke('docker:logs', containerId, lines),
  removeDockerContainer: (containerId: string): Promise<boolean> => ipcRenderer.invoke('docker:remove', containerId),
  getDockerContainerStats: (): Promise<DockerContainerStats[]> =>
    ipcRenderer.invoke('docker:get-stats'),
  openDockerContainerTerminal: (containerId: string, shell?: string): Promise<boolean> =>
    ipcRenderer.invoke('docker:open-terminal', containerId, shell),
  dockerComposeUp: (
    composeFilePath: string,
    options?: { profile?: string; detach?: boolean; build?: boolean }
  ): Promise<{ code: number; stdout: string; stderr: string }> =>
    ipcRenderer.invoke('docker:compose-up', composeFilePath, options),
  dockerComposeDown: (
    composeFilePath: string,
    options?: { profile?: string; volumes?: boolean }
  ): Promise<{ code: number; stdout: string; stderr: string }> =>
    ipcRenderer.invoke('docker:compose-down', composeFilePath, options),
  dockerComposeRestart: (
    composeFilePath: string,
    options?: { profile?: string }
  ): Promise<{ code: number; stdout: string; stderr: string }> =>
    ipcRenderer.invoke('docker:compose-restart', composeFilePath, options),
  dockerComposeLogs: (
    composeFilePath: string,
    options?: { profile?: string; lines?: number }
  ): Promise<string> =>
    ipcRenderer.invoke('docker:compose-logs', composeFilePath, options),
  dockerComposeStatus: (composeFilePath: string, profile?: string): Promise<ComposeServiceStatus[]> =>
    ipcRenderer.invoke('docker:compose-status', composeFilePath, profile),
  onDockerComposeLogChunk: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('docker:compose-log-chunk', subscription);
    return () => {
      ipcRenderer.removeListener('docker:compose-log-chunk', subscription);
    };
  },

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
    return () => {
      ipcRenderer.removeListener('logs:chunk', subscription);
    };
  },

  // Auto-update (electron-updater / GitHub Releases)
  checkForUpdate: (): Promise<void> => ipcRenderer.invoke('update:check'),
  downloadUpdate: (): Promise<void> => ipcRenderer.invoke('update:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('update:install'),
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => {
    const subscription = (_: any, status: UpdateStatus) => callback(status);
    ipcRenderer.on('update:status', subscription);
    return () => {
      ipcRenderer.removeListener('update:status', subscription);
    };
  },

  // APM & Observabilidade (OpenTelemetry / SigNoz)
  getApmOverview: (filter?: ApmFilter): Promise<ObservabilityOverview> =>
    ipcRenderer.invoke('apm:get-overview', filter),
  getApmTraces: (filter?: ApmFilter): Promise<TraceSummary[]> =>
    ipcRenderer.invoke('apm:get-traces', filter),
  getApmTraceDetails: (traceId: string): Promise<TraceDetails | null> =>
    ipcRenderer.invoke('apm:get-trace-details', traceId),
  getApmServices: (): Promise<ServiceMetricsSummary[]> =>
    ipcRenderer.invoke('apm:get-services'),
  getApmReceiverStatus: (): Promise<ApmReceiverStatus> =>
    ipcRenderer.invoke('apm:get-receiver-status'),
  clearApmTraces: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('apm:clear'),
  changeApmReceiverPort: (port: number): Promise<ApmReceiverPortChangeResult> =>
    ipcRenderer.invoke('apm:change-receiver-port', port),
  onApmNewTrace: (callback: (trace: TraceSummary) => void) => {
    const subscription = (_: any, trace: TraceSummary) => callback(trace);
    ipcRenderer.on('apm:new-trace', subscription);
    return () => {
      ipcRenderer.removeListener('apm:new-trace', subscription);
    };
  },

  // QA Studio & Validador Regressivo
  qaListTemplates: (): Promise<QaRegressionTemplate[]> =>
    ipcRenderer.invoke('qa:list-templates'),
  qaGetTemplate: (id: string): Promise<QaRegressionTemplate | null> =>
    ipcRenderer.invoke('qa:get-template', id),
  qaSaveTemplate: (template: QaRegressionTemplate): Promise<QaRegressionTemplate> =>
    ipcRenderer.invoke('qa:save-template', template),
  qaDeleteTemplate: (id: string): Promise<boolean> =>
    ipcRenderer.invoke('qa:delete-template', id),
  qaExecuteSuite: (request: QaExecutionRequest): Promise<QaExecutionResult> =>
    ipcRenderer.invoke('qa:execute-suite', request),
  qaGetTemplatesDir: (): Promise<string> =>
    ipcRenderer.invoke('qa:get-templates-dir'),
  qaSearchCorePayloads: (filter: QaCoreSearchFilter, connectionId?: string): Promise<QaCoreSearchResult> =>
    ipcRenderer.invoke('qa:search-core-payloads', filter, connectionId),
  qaFetchApiPayload: (request: QaApiFetchRequest): Promise<QaApiFetchResult> =>
    ipcRenderer.invoke('qa:fetch-api-payload', request),

  // Automated Test Runners (Maven, Playwright, Cypress, Newman)
  testRunnerList: (): Promise<TestRunnerConfig[]> =>
    ipcRenderer.invoke('test-runner:list'),
  testRunnerSave: (runner: Partial<TestRunnerConfig>): Promise<TestRunnerConfig> =>
    ipcRenderer.invoke('test-runner:save', runner),
  testRunnerDelete: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('test-runner:delete', id),
  testRunnerExecute: (target: string | TestRunnerConfig): Promise<TestExecutionResult> =>
    ipcRenderer.invoke('test-runner:execute', target),
  testRunnerAbort: (): Promise<boolean> =>
    ipcRenderer.invoke('test-runner:abort'),
  testRunnerGetHistory: (): Promise<TestExecutionResult[]> =>
    ipcRenderer.invoke('test-runner:get-history'),
  testRunnerClearHistory: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('test-runner:clear-history'),
  onTestRunnerChunk: (callback: (data: { runnerId: string; chunk: string }) => void) => {
    const subscription = (_: any, data: { runnerId: string; chunk: string }) => callback(data);
    ipcRenderer.on('test-runner:chunk', subscription);
    return () => {
      ipcRenderer.removeListener('test-runner:chunk', subscription);
    };
  },

  // TAUT-Mississauga Cypress Integration (QA Hub)
  tautGetStatus: (customPath?: string): Promise<TautProjectStatus> =>
    ipcRenderer.invoke('taut:get-status', customPath),
  tautSavePath: (targetPath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('taut:save-path', targetPath),
  tautGetCoverage: (customPath?: string): Promise<TautCoverageReport> =>
    ipcRenderer.invoke('taut:get-coverage', customPath),
  tautListSpecs: (customPath?: string): Promise<TautSpecSummary[]> =>
    ipcRenderer.invoke('taut:list-specs', customPath),
  tautSyncEnv: (customPath?: string, connectionId?: string): Promise<TautEnvSyncResult> =>
    ipcRenderer.invoke('taut:sync-env', customPath, connectionId),
  tautProcessIntake: (csvFile: string, projectPath?: string): Promise<TautCsvIntakeResult> =>
    ipcRenderer.invoke('taut:process-intake', csvFile, projectPath),
  tautRunTests: (options: TautRunOptions): Promise<TestExecutionResult> =>
    ipcRenderer.invoke('taut:run-tests', options),
  tautAbortTests: (): Promise<boolean> =>
    ipcRenderer.invoke('taut:abort-tests'),
  onTautChunk: (callback: (data: { chunk: string }) => void) => {
    const subscription = (_: any, data: { chunk: string }) => callback(data);
    ipcRenderer.on('taut:chunk', subscription);
    return () => {
      ipcRenderer.removeListener('taut:chunk', subscription);
    };
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

export type ElectronAPI = typeof electronAPI;
