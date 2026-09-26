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
  RoutineLaunchResult,
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
  QueryResult,
  DockerContainerInfo,
  DockerContainerInspect,
  DockerDaemonStatus,
  WslDistroInfo,
  ContainerEnvironment,
  OracleMaintenanceResult,
  OracleDataPumpParams,
  WslDumpFileInfo,
  WshPrerequisiteStatus,
  WslSnapshotFileInfo,
  WslSnapshotActionResult,
  WslActionResult,
  InfrDockerScriptStatus,
  NetworkIpInfo,
  ExplainPlanResult,
  OracleTracerFilter,
  OracleActiveSessionsResult,
  OracleRecentStatementsResult,
  OracleCaptureOptions,
  OracleCaptureState,
  KarafBundleInfo,
  KarafFeatureInfo,
  KarafBundleDetails,
  BundleDependencyCheckResult,
  InstallBundleRequest,
  ReinstallBundleRequest,
  UpdateBundleVersionRequest,
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
  TableColumnInfo,
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
  ServiceMetricsSummary
} from '../shared/types';

export interface ElectronAPI {
  // Diálogos Nativos do Sistema & Verificação de Caminhos
  selectDirectory: (defaultPath?: string) => Promise<string | null>;
  selectFile: (options?: SelectFileOptions) => Promise<string | null>;
  checkPath: (targetPath: string) => Promise<PathStatusInfo>;
  autoDetectPaths: () => Promise<Partial<AppSettings>>;
  getAppInfo: () => Promise<SystemAppInfo>;
  getChangelog: () => Promise<string | null>;
  getMcpDocs: () => Promise<string>;

  // Gestor de Ambiente
  checkAdmin: () => Promise<boolean>;
  getServicesStatus: (customServices?: TrackedServiceConfig[]) => Promise<ServiceStatus[]>;
  getProcessesStatus: (customProcesses?: TrackedProcessConfig[]) => Promise<ProcessStatus[]>;
  checkPorts: () => Promise<PortStatus[]>;
  startService: (name: string) => Promise<boolean>;
  stopService: (name: string) => Promise<boolean>;
  batchStartServices: (serviceNames: string[]) => Promise<Record<string, boolean>>;
  batchStopServices: (serviceNames: string[]) => Promise<Record<string, boolean>>;
  batchKillProcesses: (processNames: string[]) => Promise<Record<string, boolean>>;
  launchIntelliJ: () => Promise<boolean>;
  launchServerDebug: () => Promise<boolean>;
  resetEnvironment: (
    options?: 'embedded' | 'external' | EnvironmentAutomationConfig
  ) => Promise<{ success: boolean; logs: EnvironmentLog[]; error?: string }>;
  onEnvLog: (callback: (log: EnvironmentLog) => void) => () => void;

  // Perfis de Automação & Workflows
  runProfile: (profile: AutomationProfile) => Promise<ProfileExecutionResult>;
  stopProfile: (profile: AutomationProfile) => Promise<{ success: boolean; logs: EnvironmentLog[] }>;
  runProfileStep: (step: AutomationStep, profileName?: string) => Promise<boolean>;
  stopProfileStep: (step: AutomationStep) => Promise<boolean>;
  restartProfileStep: (step: AutomationStep, profileName?: string) => Promise<boolean>;
  killPort: (port: number) => Promise<boolean>;
  saveProfiles: (profiles: AutomationProfile[], activeProfileId?: string) => Promise<AppSettings>;
  onProfileStepProgress: (callback: (data: { stepIndex: number; totalSteps: number; step: AutomationStep }) => void) => () => void;

  // Karaf Deployer & Console Embutido
  startEmbeddedKaraf: () => Promise<boolean>;
  sendKarafInput: (input: string) => Promise<boolean>;
  stopEmbeddedKaraf: () => Promise<boolean>;
  isEmbeddedKarafRunning: () => Promise<boolean>;
  isKarafRunning: (sshPort?: number) => Promise<boolean>;
  onKarafStdout: (callback: (chunk: string) => void) => () => void;
  getKarafPersistedLogs: (maxChars?: number) => Promise<{ output: string }>;
  clearKarafPersistedLogs: () => Promise<{ success: boolean }>;
  deployKaraf: (request: KarafDeployRequest) => Promise<{ success: boolean; error?: string }>;
  buildAndDeployKaraf: (
    request: KarafDeployRequest,
    projectPath: string,
    skipTests?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  runMavenBuild: (
    projectPath: string,
    skipTests?: boolean
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
  execKarafDiagnostic: (command: string) => Promise<{ code: number; stdout: string; stderr: string }>;
  getKarafDeployHistory: () => Promise<KarafDeployHistoryEntry[]>;
  onKarafDeployResult: (callback: (result: { success: boolean; error?: string }) => void) => () => void;
  onKarafBuildResult: (callback: (result: { code: number; stdout: string; stderr: string }) => void) => () => void;
  onDocsReindexComplete: (callback: (status: DocsIndexStatus) => void) => () => void;

  parsePom: (projectPath: string) => Promise<PomInfo | null>;
  onKarafLogChunk: (callback: (chunk: string) => void) => () => void;

  // Karaf Deployer & Bundles
  listKarafBundles: (credentials?: { user?: string; pass?: string; port?: number }) => Promise<KarafBundleInfo[]>;
  manageKarafBundle: (
    action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<{ success: boolean; output: string }>;
  manageKarafBundlesBatch: (
    action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh' | 'resolve',
    bundleIds: string[],
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<{ success: boolean; output: string; processedCount: number }>;
  getKarafLog: (
    lines?: number,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<{ success: boolean; output: string }>;
  getKarafBundleDetails: (
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<KarafBundleDetails | null>;
  checkKarafBundleDeps: (
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<BundleDependencyCheckResult>;
  checkKarafInstallDeps: (
    target: { location?: string; symbolicName?: string; version?: string },
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<BundleDependencyCheckResult>;
  installKarafBundle: (
    request: InstallBundleRequest
  ) => Promise<{ success: boolean; bundleId?: string; state?: string; diag?: string; output: string }>;
  uninstallKarafBundle: (
    bundleId: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<{ success: boolean; output: string }>;
  reinstallKarafBundle: (
    request: ReinstallBundleRequest
  ) => Promise<{ success: boolean; state?: string; diag?: string; output: string }>;
  updateKarafBundleVersion: (
    request: UpdateBundleVersionRequest
  ) => Promise<{ success: boolean; output: string }>;
  listKarafFeatures: (
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<KarafFeatureInfo[]>;
  uninstallKarafFeature: (
    featureName: string,
    version?: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<{ success: boolean; output: string }>;
  installKarafFeature: (
    featureName: string,
    version?: string,
    credentials?: { user?: string; pass?: string; port?: number }
  ) => Promise<{ success: boolean; output: string }>;

  // Rotina 801 - Atualização e Instalação de Serviços Web Oficiais
  routine801GetInstallations: (customUrl?: string) => Promise<Routine801CatalogResponse>;
  routine801GetUpdates: (customUrl?: string) => Promise<Routine801CatalogResponse>;
  routine801CheckServer: (customUrl?: string) => Promise<{ ok: boolean; status: number; message: string; url: string }>;
  routine801InstallFeatures: (request: Routine801InstallRequest) => Promise<Routine801InstallResult>;

  // Perfis de Deploy (Karaf / Docker / Comando Genérico)
  runDeployProfile: (profile: DeployProfile) => Promise<{ success: boolean; error?: string }>;
  runDeployStep: (step: DeployStep, profileName?: string) => Promise<{ success: boolean; error?: string }>;
  abortDeploy: () => Promise<{ success: boolean }>;
  getDeployProfileHistory: () => Promise<DeployProfileHistoryEntry[]>;
  clearDeployProfileHistory: () => Promise<{ success: boolean }>;
  onDeployLogChunk: (callback: (chunk: string) => void) => () => void;
  onDeployStepProgress: (callback: (data: DeployProgressEvent) => void) => () => void;

  // Git & Azure DevOps
  listProjects: () => Promise<GitProjectInfo[]>;
  getProjectInfo: (projectPath: string) => Promise<GitProjectInfo | null>;
  buildPrUrl: (projectPath: string, targetBranch?: string) => Promise<string | null>;
  execGitCommand: (
    projectPath: string,
    command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'
  ) => Promise<GitCommandResult>;
  checkoutBranch: (projectPath: string, branchName: string, createNew?: boolean) => Promise<GitCommandResult>;
  commitAndPush: (projectPath: string, message: string) => Promise<GitCommandResult>;
  getCommitHistory: (projectPath: string, limit?: number) => Promise<GitCommitInfo[]>;
  getGitStatusDetails: (projectPath: string) => Promise<GitFileStatus[]>;
  getGitDiff: (projectPath: string, targetFile?: string) => Promise<GitDiffResult>;
  /** Alterações pendentes por caminho de repositório (roda git status em lote; chamar sob demanda). */
  getGitUncommittedCounts: () => Promise<Record<string, number>>;
  openExternal: (url: string) => Promise<boolean>;

  // Catálogo de Rotinas
  listRoutines: () => Promise<RoutineItem[]>;
  launchRoutine: (fullPath: string, forceDirect?: boolean) => Promise<RoutineLaunchResult>;
  checkRoutineKarafStatus: () => Promise<KarafWtaStatusResult>;
  launchMappedProgram: (id: string) => Promise<boolean>;
  toggleFavoriteRoutine: (id: string) => Promise<AppSettings>;

  // Índice de Documentação (RAG local)
  reindexDocs: () => Promise<DocsIndexStatus>;
  searchDocs: (query: string, options?: { sourceLabel?: string; topK?: number }) => Promise<DocSearchResult[]>;
  getDocsIndexStatus: () => Promise<DocsIndexStatus>;
  testConfluenceConnection: (config: ConfluenceSourceConfig) => Promise<{ success: boolean; message: string }>;
  testJiraConnection: (config: JiraSourceConfig) => Promise<{ success: boolean; message: string }>;
  openDocFile: (filePath: string, mode?: 'editor' | 'folder') => Promise<boolean>;
  readDocContent: (filePath: string) => Promise<string | null>;
  onDocsIndexProgress: (callback: (progress: DocsIndexProgress) => void) => () => void;
  syncDocs: (targetId?: string) => Promise<DocSyncResult[]>;
  onDocSyncProgress: (callback: (progress: DocSyncProgress) => void) => () => void;

  // Configurações
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  exportSettings: (sanitizePasswords?: boolean) => Promise<string>;
  importSettings: (jsonString: string) => Promise<{ success: boolean; error?: string; settings?: AppSettings; warnings?: string[] }>;

  // IA & Provedores LLM (BYOK - Bring Your Own Key)
  testLlmConnection: (config: LlmProviderConfig) => Promise<LlmTestResult>;
  llmChat: (request: LlmChatRequest) => Promise<LlmChatResponse>;
  askDocsWithAi: (request: LlmRagQueryRequest) => Promise<LlmRagQueryResponse>;
  askLlm?: (request: LlmRagQueryRequest, providerConfig?: LlmProviderConfig) => Promise<LlmRagQueryResponse>;
  chatLlm?: (request: LlmChatRequest, providerConfig?: LlmProviderConfig) => Promise<LlmChatResponse>;

  // Banco de Dados (Oracle, MySQL, Postgres)
  testDbConnection: (config: DatabaseConnectionConfig) => Promise<{ success: boolean; message: string; version?: string }>;
  executeDbQuery: (config: DatabaseConnectionConfig, sql: string, maxRows?: number, binds?: Record<string, any>) => Promise<QueryResult>;
  explainDbPlan: (config: DatabaseConnectionConfig, sql: string) => Promise<ExplainPlanResult>;
  listDbTables: (config: DatabaseConnectionConfig) => Promise<string[]>;
  getDbTableColumns: (config: DatabaseConnectionConfig, tableName: string) => Promise<TableColumnInfo[]>;
  getOracleActiveSessions: (config: DatabaseConnectionConfig, filter?: OracleTracerFilter) => Promise<OracleActiveSessionsResult>;
  getOracleRecentStatements: (config: DatabaseConnectionConfig, filter?: OracleTracerFilter) => Promise<OracleRecentStatementsResult>;
  startOracleCapture: (config: DatabaseConnectionConfig, options: OracleCaptureOptions) => Promise<OracleCaptureState>;
  stopOracleCapture: (connectionId: string) => Promise<OracleCaptureState>;
  clearOracleCapture: (connectionId: string) => Promise<OracleCaptureState>;
  getOracleCaptureState: (connectionId: string) => Promise<OracleCaptureState>;
  runDbBackup: (
    config: DatabaseConnectionConfig,
    destinationFolder: string,
    oracleDirectory?: string,
    compress?: boolean,
    useCustomCommand?: boolean,
    customCommand?: string
  ) => Promise<BackupResult>;
  listDbBackups: (destinationFolder: string) => Promise<BackupFileInfo[]>;
  saveDbBackupConfig: (config: BackupConfig) => Promise<{ success: boolean; message: string }>;
  restoreDbBackup: (config: DatabaseConnectionConfig, filePath: string) => Promise<BackupResult>;
  listDbBackupHistory: (connectionId?: string) => Promise<BackupHistoryEntry[]>;
  runDbRestoreDrill: (scratchConnection: DatabaseConnectionConfig, filePath: string) => Promise<BackupResult>;
  testBackupWebhook: (webhook: BackupWebhookConfig) => Promise<{ success: boolean; message: string }>;
  onBackupScheduleResult: (callback: (data: { connectionName: string; result: BackupResult }) => void) => () => void;

  // Gerenciador de Containers (Docker / Podman / WSL)
  listWslDistros?: () => Promise<WslDistroInfo[]>;
  startWslDockerDaemon?: (distro: string) => Promise<WslActionResult>;
  terminateWslDistro?: (distro: string) => Promise<boolean>;
  openWslTerminal?: (distro: string) => Promise<boolean>;
  getWslDistroIp?: (distro?: string) => Promise<string | null>;
  openWslDumpsFolder?: (distro?: string) => Promise<{ success: boolean; path: string; error?: string }>;
  listWslDmpFiles?: (distro?: string) => Promise<WslDumpFileInfo[]>;
  generateMd5?: (text: string) => Promise<{ lower: string; upper: string }>;
  checkWshPrerequisites?: (distro?: string) => Promise<WshPrerequisiteStatus[]>;
  openWslOptFolder?: (distro?: string) => Promise<{ success: boolean; path: string; error?: string }>;
  getWslSnapshotsDir?: () => Promise<string>;
  setWslSnapshotsDir?: (dir: string) => Promise<boolean>;
  listWslSnapshots?: (dir?: string) => Promise<WslSnapshotFileInfo[]>;
  importWslSnapshot?: (params: { distroName: string; installDir: string; tarPath: string }) => Promise<WslSnapshotActionResult>;
  exportWslSnapshot?: (params: { distroName: string; outputPath: string }) => Promise<WslSnapshotActionResult>;
  unregisterWslDistro?: (distroName: string) => Promise<WslSnapshotActionResult>;
  checkInfrDockerScripts?: (customPath?: string) => Promise<InfrDockerScriptStatus[]>;
  runInfrSetupScript?: (scriptType: 'oracle' | 'wta' | 'wsh', options: any) => Promise<{ success: boolean; output: string }>;
  setDockerTargetWslDistro?: (distro: string | null) => Promise<DockerDaemonStatus>;
  getContainerEnvironments?: () => Promise<{ environments: ContainerEnvironment[]; snapshotsDir?: string }>;
  saveContainerEnvironment?: (env: ContainerEnvironment) => Promise<boolean>;
  deleteContainerEnvironment?: (id: string) => Promise<boolean>;
  startContainerSequence?: (
    containers: { name: string; delay?: number }[]
  ) => Promise<{ success: boolean; started: string[]; failed?: string; error?: string }>;
  onContainerSequenceProgress?: (
    callback: (step: { currentName: string; index: number; total: number; waitingSeconds?: number }) => void
  ) => () => void;

  // Ferramentas de Manutenção Oracle (INFR-Docker)
  execOracleHealth?: (
    containerName: string,
    schema?: string,
    fix?: boolean,
    user?: string,
    password?: string
  ) => Promise<OracleMaintenanceResult>;
  openOracleSqlPlus?: (containerName: string, user?: string, password?: string) => Promise<boolean>;
  execOracleDataPump?: (params: OracleDataPumpParams) => Promise<OracleMaintenanceResult>;
  openWtaKarafClient?: (containerName: string) => Promise<boolean>;

  getDockerStatus: () => Promise<DockerDaemonStatus>;
  listDockerContainers: () => Promise<DockerContainerInfo[]>;
  startDockerContainer: (containerId: string) => Promise<boolean>;
  stopDockerContainer: (containerId: string) => Promise<boolean>;
  restartDockerContainer: (containerId: string) => Promise<boolean>;
  pauseDockerContainer: (containerId: string) => Promise<boolean>;
  unpauseDockerContainer: (containerId: string) => Promise<boolean>;
  inspectDockerContainer: (containerId: string) => Promise<DockerContainerInspect | null>;
  pruneDockerContainers: () => Promise<{ success: boolean; output: string }>;
  getDockerLogs: (containerId: string, lines?: number) => Promise<string>;
  removeDockerContainer: (containerId: string) => Promise<boolean>;
  getDockerContainerStats: () => Promise<DockerContainerStats[]>;
  openDockerContainerTerminal: (containerId: string, shell?: string) => Promise<boolean>;
  dockerComposeUp: (
    composeFilePath: string,
    options?: { profile?: string; detach?: boolean; build?: boolean }
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
  dockerComposeDown: (
    composeFilePath: string,
    options?: { profile?: string; volumes?: boolean }
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
  dockerComposeRestart: (
    composeFilePath: string,
    options?: { profile?: string }
  ) => Promise<{ code: number; stdout: string; stderr: string }>;
  dockerComposeLogs: (
    composeFilePath: string,
    options?: { profile?: string; lines?: number }
  ) => Promise<string>;
  dockerComposeStatus: (composeFilePath: string, profile?: string) => Promise<ComposeServiceStatus[]>;
  onDockerComposeLogChunk: (callback: (chunk: string) => void) => () => void;

  // Métodos genéricos de containers
  getContainerStatus?: () => Promise<DockerDaemonStatus>;
  listContainers?: () => Promise<DockerContainerInfo[]>;
  startContainer?: (containerId: string) => Promise<boolean>;
  stopContainer?: (containerId: string) => Promise<boolean>;
  restartContainer?: (containerId: string) => Promise<boolean>;
  pauseContainer?: (containerId: string) => Promise<boolean>;
  unpauseContainer?: (containerId: string) => Promise<boolean>;
  inspectContainer?: (containerId: string) => Promise<DockerContainerInspect | null>;
  pruneContainers?: () => Promise<{ success: boolean; output: string }>;
  getContainerLogs?: (containerId: string, lines?: number) => Promise<string>;
  removeContainer?: (containerId: string) => Promise<boolean>;
  getContainerStats?: () => Promise<DockerContainerStats[]>;
  openContainerTerminal?: (containerId: string, shell?: string) => Promise<boolean>;

  // Rede & Detecção de IPs (Local e WSL)
  getNetworkIps: () => Promise<NetworkIpInfo>;
  checkHttpHealth: (url: string, timeoutMs?: number) => Promise<HttpHealthResult>;

  // Métricas do Sistema
  getSystemMetrics: () => Promise<SystemMetrics>;

  // Leitor e Monitor de Logs em Tempo Real (Tail -f)
  startLogWatch: (
    sourceId: string,
    filePath: string,
    initialLines?: number,
    encoding?: string
  ) => Promise<{ status: LogWatchStatus; initialLines: string[] }>;
  stopLogWatch: (sourceId: string) => Promise<boolean>;
  checkLogFile: (filePath: string, sourceId?: string) => Promise<LogWatchStatus>;
  clearLogFile: (filePath: string) => Promise<boolean>;
  onLogChunk: (callback: (event: LogChunkEvent) => void) => () => void;

  // Auto-update (electron-updater / GitHub Releases) — só existe no app desktop, ausente no modo navegador/servidor
  checkForUpdate?: () => Promise<void>;
  downloadUpdate?: () => Promise<void>;
  installUpdate?: () => Promise<void>;
  onUpdateStatus?: (callback: (status: UpdateStatus) => void) => () => void;

  // APM & Observabilidade (OpenTelemetry / SigNoz)
  getApmOverview: (filter?: ApmFilter) => Promise<ObservabilityOverview>;
  getApmTraces: (filter?: ApmFilter) => Promise<TraceSummary[]>;
  getApmTraceDetails: (traceId: string) => Promise<TraceDetails | null>;
  getApmServices: () => Promise<ServiceMetricsSummary[]>;
  getApmReceiverStatus: () => Promise<ApmReceiverStatus>;
  clearApmTraces: () => Promise<{ success: boolean }>;
  generateApmDemo: () => Promise<{ generatedSpans: number; generatedTraces: number }>;
  changeApmReceiverPort: (port: number) => Promise<ApmReceiverPortChangeResult>;
  onApmNewTrace: (callback: (trace: TraceSummary) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
