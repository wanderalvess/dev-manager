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
  DeployProfile
} from '../shared/types';

export interface ElectronAPI {
  // Diálogos Nativos do Sistema & Verificação de Caminhos
  selectDirectory: (defaultPath?: string) => Promise<string | null>;
  selectFile: (options?: SelectFileOptions) => Promise<string | null>;
  checkPath: (targetPath: string) => Promise<PathStatusInfo>;
  autoDetectPaths: () => Promise<Partial<AppSettings>>;
  getAppInfo: () => Promise<SystemAppInfo>;

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
  onKarafStdout: (callback: (chunk: string) => void) => () => void;
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

  parsePom: (projectPath: string) => Promise<PomInfo | null>;
  onKarafLogChunk: (callback: (chunk: string) => void) => () => void;

  // Karaf Deployer & Bundles
  listKarafBundles: (credentials?: { user?: string; pass?: string; port?: number }) => Promise<KarafBundleInfo[]>;
  manageKarafBundle: (
    action: 'start' | 'stop' | 'restart' | 'uninstall' | 'refresh',
    bundleId: string,
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

  // Perfis de Deploy (Karaf / Docker / Comando Genérico)
  runDeployProfile: (profile: DeployProfile) => Promise<{ success: boolean; error?: string }>;
  onDeployLogChunk: (callback: (chunk: string) => void) => () => void;

  // Git & Azure DevOps
  listProjects: () => Promise<GitProjectInfo[]>;
  getProjectInfo: (projectPath: string) => Promise<GitProjectInfo | null>;
  buildPrUrl: (projectPath: string, targetBranch?: string) => Promise<string | null>;
  execGitCommand: (
    projectPath: string,
    command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'
  ) => Promise<{ success: boolean; output: string }>;
  checkoutBranch: (projectPath: string, branchName: string, createNew?: boolean) => Promise<{ success: boolean; output: string }>;
  commitAndPush: (projectPath: string, message: string) => Promise<{ success: boolean; output: string }>;
  getCommitHistory: (projectPath: string, limit?: number) => Promise<GitCommitInfo[]>;
  getGitStatusDetails: (projectPath: string) => Promise<GitFileStatus[]>;
  getGitDiff: (projectPath: string, targetFile?: string) => Promise<GitDiffResult>;
  openExternal: (url: string) => Promise<boolean>;

  // Catálogo de Rotinas
  listRoutines: () => Promise<RoutineItem[]>;
  launchRoutine: (fullPath: string) => Promise<boolean>;
  launchMappedProgram: (id: string) => Promise<boolean>;
  toggleFavoriteRoutine: (id: string) => Promise<AppSettings>;

  // Índice de Documentação (RAG local)
  reindexDocs: () => Promise<DocsIndexStatus>;
  searchDocs: (query: string, options?: { sourceLabel?: string; topK?: number }) => Promise<DocSearchResult[]>;
  getDocsIndexStatus: () => Promise<DocsIndexStatus>;
  openDocFile: (filePath: string) => Promise<boolean>;
  onDocsIndexProgress: (callback: (progress: DocsIndexProgress) => void) => () => void;

  // Configurações
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  exportSettings: (sanitizePasswords?: boolean) => Promise<string>;
  importSettings: (jsonString: string) => Promise<{ success: boolean; error?: string; settings?: AppSettings; warnings?: string[] }>;

  // Banco de Dados (Oracle, MySQL, Postgres)
  testDbConnection: (config: DatabaseConnectionConfig) => Promise<{ success: boolean; message: string; version?: string }>;
  executeDbQuery: (config: DatabaseConnectionConfig, sql: string, maxRows?: number) => Promise<QueryResult>;
  explainDbPlan: (config: DatabaseConnectionConfig, sql: string) => Promise<ExplainPlanResult>;
  listDbTables: (config: DatabaseConnectionConfig) => Promise<string[]>;

  // Gerenciador de Containers Docker
  getDockerStatus: () => Promise<DockerDaemonStatus>;
  listDockerContainers: () => Promise<DockerContainerInfo[]>;
  startDockerContainer: (containerId: string) => Promise<boolean>;
  stopDockerContainer: (containerId: string) => Promise<boolean>;
  restartDockerContainer: (containerId: string) => Promise<boolean>;
  getDockerLogs: (containerId: string, lines?: number) => Promise<string>;
  removeDockerContainer: (containerId: string) => Promise<boolean>;

  // Rede & Detecção de IPs (Local e WSL)
  getNetworkIps: () => Promise<NetworkIpInfo>;
  checkHttpHealth: (url: string, timeoutMs?: number) => Promise<HttpHealthResult>;

  // Métricas do Sistema
  getSystemMetrics: () => Promise<SystemMetrics>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
