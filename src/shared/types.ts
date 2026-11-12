export interface TrackedServiceConfig {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
}

export interface TrackedProcessConfig {
  id: string;
  name: string;
  displayName?: string;
}

export interface ServiceStatus {
  name: string;
  displayName: string;
  status: 'Running' | 'Stopped' | 'Pending' | 'Unknown';
  pid?: number;
  startType?: string;
  description?: string;
}

export interface ProcessStatus {
  name: string;
  displayName?: string;
  running: boolean;
  pid?: number;
  memoryMb?: number;
}

export interface PortStatus {
  port: number;
  label: string;
  inUse: boolean;
  pid?: number;
  processName?: string;
}

export interface EnvironmentLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success' | 'stdout' | 'stderr';
  message: string;
  source?: string;
}

export interface AutomationStep {
  id: string;
  name: string;
  type: 'stop-services' | 'kill-processes' | 'wait' | 'launch-ide' | 'start-server' | 'command' | 'docker' | 'healthcheck';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface AutomationProfile {
  id: string;
  name: string;
  description?: string;
  steps: AutomationStep[];
}

export interface EnvironmentAutomationConfig {
  mode?: 'embedded' | 'external';
  stopServices?: boolean;
  killProcesses?: boolean;
  launchIde?: boolean;
  startServer?: boolean;
}

export interface ProfileExecutionResult {
  success: boolean;
  logs: EnvironmentLog[];
  error?: string;
  durationMs?: number;
}

export interface GitProjectInfo {
  name: string;
  path: string;
  branch: string;
  remoteUrl?: string;
  ahead?: number;
  behind?: number;
  dirty?: boolean;
  uncommittedCount?: number;
  unpushedCount?: number;
  isKarafBundle?: boolean;
  mavenArtifactId?: string;
  mavenVersion?: string;
}

export interface GitBranchPublishStatus {
  branch: string;
  hasUpstream: boolean;
  ahead: number;
  behind: number;
}

export interface GitCommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitDiffResult {
  success: boolean;
  diff: string;
  error?: string;
}

export interface GitCommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  error?: string;
}

export interface RoutineItem {
  id: string;
  code: string;
  name: string;
  fullPath: string;
  category?: string;
  version?: string;
  lastModified?: string;
  isFavorite?: boolean;
}

export interface RoutineLaunchResult {
  success: boolean;
  message?: string;
  pid?: number;
}

export interface KarafWtaStatusResult {
  running: boolean;
  port?: number;
  url?: string;
}

export interface PomInfo {
  groupId: string;
  artifactId: string;
  version: string;
  packaging: string;
  name?: string;
}

export interface PathStatusInfo {
  path: string;
  exists: boolean;
  isDirectory?: boolean;
  isFile?: boolean;
}

export interface SelectFileOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface SystemAppInfo {
  appName: string;
  appVersion: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  mode: 'desktop' | 'web';
  configPath?: string;
  uptimeSeconds?: number;
}

export interface NetworkIpInfo {
  primaryLocalIp: string;
  wslIp?: string | null;
  interfaces: Array<{ name: string; address: string; family: string }>;
}

export interface SystemMetrics {
  cpuUsagePercent: number;
  totalMemMb: number;
  usedMemMb: number;
  memUsagePercent: number;
  totalMemoryMb?: number;
  usedMemoryMb?: number;
  memoryUsagePercent?: number;
  uptimeSeconds: number;
  loadAvg?: number[];
}

export interface DatabaseConnectionConfig {
  id: string;
  name: string;
  vendor: 'oracle' | 'postgres' | 'mysql';
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  serviceName?: string;
  isProduction?: boolean;
  color?: string;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string;
  affectedRows?: number;
}

export interface DbObjectInfo {
  name: string;
  type: DbObjectType;
  schema?: string;
  rowCount?: number;
}

export type DbObjectType = 'TABLE' | 'VIEW' | 'INDEX' | 'TRIGGER' | 'PROCEDURE' | 'FUNCTION' | 'SEQUENCE';

export interface DbTablesResult {
  tables: DbObjectInfo[];
  error?: string;
}

export interface DbColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  defaultValue?: string;
}

export interface DbTableColumnsResult {
  tableName: string;
  columns: DbColumnInfo[];
  error?: string;
}

export interface TableDetails {
  tableName: string;
  columns: DbColumnInfo[];
  constraints: Array<{ name: string; type: string; columns: string[] }>;
  indexes: Array<{ name: string; unique: boolean; columns: string[] }>;
  triggers: Array<{ name: string; timing: string; event: string }>;
  ddl?: string;
}

export interface ObjectDdlResult {
  objectName: string;
  objectType: DbObjectType;
  ddl: string;
}

export interface DbSessionState {
  sessionId: string;
  connectionId: string;
  autoCommit: boolean;
  inTransaction: boolean;
  status: 'open' | 'busy' | 'closed';
}

export interface DbSessionQueryResult extends QueryResult {
  session: DbSessionState;
}

export interface ExplainPlanNode {
  id: number;
  operation: string;
  objectName?: string;
  cost?: number;
  rows?: number;
  children?: ExplainPlanNode[];
}

export interface ExplainPlanResult {
  success: boolean;
  planText: string;
  nodes?: ExplainPlanNode[];
  error?: string;
}

export interface OracleTracerFilter {
  schema?: string;
  search?: string;
  limit?: number;
}

export interface OracleActiveSessionsResult {
  sessions: Array<{ sid: number; serial: number; username: string; status: string; sqlId?: string; sqlText?: string; elapsedMs?: number }>;
}

export interface OracleRecentStatementsResult {
  statements: Array<{ sqlId: string; sqlText: string; schema: string; executions: number; elapsedMs: number; lastActive: string }>;
}

export interface OracleCaptureOptions {
  intervalMs: number;
  schema?: string;
}

export interface OracleCaptureState {
  active: boolean;
  connectionId: string;
  startedAt?: string;
  capturedCount: number;
}

export interface BackupConfig {
  id: string;
  connectionId: string;
  destinationFolder: string;
  cronExpression?: string;
  enabled?: boolean;
  compress?: boolean;
  maxAgeDays?: number;
  maxCount?: number;
  useCustomCommand?: boolean;
  customCommand?: string;
}

export interface BackupResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  sizeBytes?: number;
  sha256?: string;
  durationMs: number;
  output: string;
  error?: string;
}

export interface BackupFileInfo {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  createdAt: string;
  sha256?: string;
}

export interface BackupHistoryEntry {
  id: string;
  connectionId: string;
  connectionName: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  durationMs: number;
  fileName?: string;
  sizeBytes?: number;
  output: string;
}

export interface BackupWebhookConfig {
  id: string;
  name: string;
  provider: 'discord' | 'slack' | 'teams' | 'custom';
  url: string;
  enabled: boolean;
}

export interface DockerDaemonStatus {
  available: boolean;
  engine: 'docker' | 'podman' | 'simulated';
  version?: string;
  wslDistro?: string | null;
  error?: string;
}

export interface DockerContainerInfo {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'paused' | 'created';
  status: string;
  ports: string[];
  createdAt?: string;
  group?: string;
}

export interface DockerContainerStats {
  id: string;
  name: string;
  cpuPercent: number;
  memUsageMb: number;
  memLimitMb: number;
  memPercent: number;
  netIo?: string;
}

export interface DockerContainerInspect {
  id: string;
  name: string;
  image: string;
  state: Record<string, any>;
  env: string[];
  mounts: Array<{ source: string; destination: string; mode?: string }>;
  ports: Record<string, any>;
}

export interface ComposeServiceStatus {
  name: string;
  state: string;
  status: string;
  ports?: string[];
}

export interface WslDistroInfo {
  name: string;
  state: 'Running' | 'Stopped';
  version: number;
  isDefault?: boolean;
}

export interface ContainerEnvironment {
  id: string;
  name: string;
  color?: string;
  containers: string[];
}

export interface OracleMaintenanceResult { success: boolean; output: string; }
export interface OracleDataPumpParams { containerName: string; action: 'import' | 'export'; dumpFile: string; schema: string; }
export interface WslDumpFileInfo { name: string; path: string; sizeBytes: number; modifiedAt: string; }
export interface WshPrerequisiteStatus { name: string; ok: boolean; detail?: string; }
export interface WslSnapshotFileInfo { name: string; path: string; sizeBytes: number; createdAt: string; }
export interface WslSnapshotActionResult { success: boolean; message?: string; }
export interface WslActionResult { success: boolean; message?: string; }
export interface InfrDockerScriptStatus { name: string; exists: boolean; path: string; }

export interface KarafBundleInfo {
  id: string;
  state: 'Active' | 'Resolved' | 'Installed' | 'Waiting' | 'Failure' | 'Stopping';
  level: number;
  version: string;
  name: string;
  symbolicName?: string;
  location?: string;
}

export interface KarafFeatureInfo {
  name: string;
  version: string;
  status: 'Started' | 'Installed' | 'Uninstalled';
  repository?: string;
  description?: string;
}

export interface KarafBundleDetails {
  id: string;
  name: string;
  symbolicName: string;
  version: string;
  state: string;
  headers: Record<string, string>;
  importedPackages: string[];
  exportedPackages: string[];
  services: string[];
}

export interface BundleDependencyCheckResult {
  ok: boolean;
  missingPackages: string[];
  conflicts: Array<{ package: string; expected: string; found: string }>;
}

export interface InstallBundleRequest { location: string; start?: boolean; credentials?: { user?: string; pass?: string; port?: number }; }
export interface ReinstallBundleRequest { bundleId: string; location?: string; credentials?: { user?: string; pass?: string; port?: number }; }
export interface UpdateBundleVersionRequest { bundleId: string; location: string; }

export interface KarafDeployRequest {
  artifactPath: string;
  bundleSymbolicName?: string;
  featureName?: string;
  autoStart?: boolean;
}

export interface KarafDeployHistoryEntry {
  id: string;
  timestamp: string;
  artifact: string;
  status: 'success' | 'error';
  durationMs: number;
  message?: string;
}

export interface DeployStep {
  id: string;
  name: string;
  type: 'maven' | 'karaf-install' | 'karaf-command' | 'docker' | 'shell';
  target?: string;
  command?: string;
  enabled: boolean;
}

export interface DeployProfile {
  id: string;
  name: string;
  description?: string;
  steps: DeployStep[];
}

export interface DeployProfileHistoryEntry {
  id: string;
  profileId: string;
  profileName: string;
  timestamp: string;
  status: 'success' | 'error' | 'aborted';
  durationMs: number;
  logs?: string[];
}

export interface DeployProgressEvent {
  stepIndex: number;
  totalSteps: number;
  stepName: string;
  status: 'running' | 'done' | 'error';
}

export interface OsgiResolutionDiagnosticSummary {
  bundleName: string;
  cause: string;
  missingRequirements: string[];
  suggestedFixes: string[];
}

export interface Routine801Item {
  id: string;
  name: string;
  version: string;
  installedVersion?: string;
  status: 'installed' | 'update-available' | 'available';
  description?: string;
}

export interface Routine801CatalogResponse {
  items: Routine801Item[];
  serverUrl: string;
  fetchedAt: string;
}

export interface Routine801InstallRequest { featureIds: string[]; customUrl?: string; }
export interface Routine801InstallResult { success: boolean; installed: string[]; failed: string[]; output: string; }

export interface DelphiInstallation { id: string; name: string; version: string; msbuildPath: string; }
export interface DelphiProject { name: string; path: string; dprojPath: string; }
export interface DelphiBuildRequest { projectPath: string; config?: 'Debug' | 'Release'; platform?: 'Win32' | 'Win64'; }
export interface DelphiBuildResult { success: boolean; output: string; durationMs: number; binaryPath?: string; }
export interface DelphiPipelineRequest { projectPath: string; publishFolder?: string; launchAfter?: boolean; }
export interface DelphiPipelineResult { success: boolean; steps: Array<{ name: string; ok: boolean; output: string }>; }

export interface DocSearchResult {
  id: string;
  title: string;
  path: string;
  source: string;
  score: number;
  snippet: string;
  lineStart?: number;
}

export interface DocsIndexStatus {
  indexed: boolean;
  totalFiles: number;
  totalChunks: number;
  lastIndexedAt?: string;
  indexing: boolean;
}

export interface ConfluenceSourceConfig { url: string; email: string; token?: string; spaceKey?: string; }
export interface JiraSourceConfig { url: string; email: string; token?: string; projectKey?: string; }
export interface DocsIndexProgress { current: number; total: number; currentFile: string; }
export interface DocSyncProgress { targetId: string; status: string; progress: number; }
export interface DocSyncResult { targetId: string; success: boolean; syncedCount: number; message: string; }

export interface LlmProviderConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'gemini' | 'ollama' | 'custom';
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

export interface LlmChatRequest {
  providerId?: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

export interface LlmChatResponse {
  content: string;
  model: string;
  tokensUsed?: number;
}

export interface LlmTestResult { success: boolean; message: string; latencyMs?: number; }
export interface LlmRagQueryRequest { query: string; topK?: number; }
export interface LlmRagQueryResponse { answer: string; sources: DocSearchResult[]; }

export interface HttpHealthResult {
  url: string;
  ok: boolean;
  status: number;
  latencyMs: number;
  error?: string;
}

export interface HttpProbeRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface HttpProbeResult {
  ok: boolean;
  status: number;
  statusText: string;
  latencyMs: number;
  sizeBytes: number;
  headers: Record<string, string>;
  body: string;
  error?: string;
}

export interface LogWatchStatus {
  sourceId: string;
  filePath: string;
  exists: boolean;
  sizeBytes: number;
  watching: boolean;
  lineCount?: number;
}

export interface LogChunkEvent {
  sourceId: string;
  lines: string[];
  timestamp: string;
}

export type UpdateStatus =
  | { status: 'checking' }
  | { status: 'not-available'; version?: string }
  | { status: 'available'; version: string; manual?: boolean }
  | { status: 'downloading'; percent: number }
  | { status: 'downloaded'; version: string }
  | { status: 'error'; message: string };

export interface ApmSpan {
  spanId: string;
  parentSpanId?: string;
  name: string;
  service: string;
  kind: 'HTTP' | 'JAVA' | 'JDBC' | 'INTERNAL';
  startOffsetMs: number;
  durationMs: number;
  status: 'ok' | 'error';
  attributes: Record<string, string | number | boolean>;
}

export interface TraceSummary {
  traceId: string;
  rootService: string;
  rootOperation: string;
  httpMethod?: string;
  httpStatus?: number;
  durationMs: number;
  spanCount: number;
  errorCount: number;
  timestamp: string;
}

export interface TraceDetails extends TraceSummary {
  spans: ApmSpan[];
}

export interface ApmFilter {
  service?: string;
  search?: string;
  onlyErrors?: boolean;
  minDurationMs?: number;
}

export interface ApmReceiverStatus {
  running: boolean;
  port: number;
  receivedTraces: number;
  receivedSpans: number;
}

export interface ApmReceiverPortChangeResult {
  success: boolean;
  port: number;
  message?: string;
}

export interface ObservabilityOverview {
  totalTraces: number;
  errorRatePercent: number;
  p95DurationMs: number;
  avgDurationMs: number;
  activeServices: number;
}

export interface ServiceMetricsSummary {
  service: string;
  requestCount: number;
  errorCount: number;
  avgDurationMs: number;
  p95DurationMs: number;
}

export interface UsageSummaryQuery { days?: number; }
export interface UsageSummary { totalActions: number; totalSavedMinutes: number; byModule: Record<string, number>; }
export interface UsageDays { days: Array<{ date: string; actions: number; savedMinutes: number }>; }
export type AiUsagePeriod = '7d' | '30d' | 'all';
export interface AiUsageReport { requests: number; tokens: number; period: AiUsagePeriod; }

export interface AppSettings {
  projectsDir: string;
  karafDir: string;
  appDir: string;
  routinesDir: string;
  idePath: string;
  karafSshHost: string;
  karafSshPort: number;
  karafSshUser: string;
  karafSshPass: string;
  disabledModules: string[];
  favoriteRoutines: string[];
  trackedServices: TrackedServiceConfig[];
  trackedProcesses: TrackedProcessConfig[];
  automationProfiles: AutomationProfile[];
  activeProfileId: string;
  deployProfiles: DeployProfile[];
  databaseConnections: DatabaseConnectionConfig[];
  backupConfigs: BackupConfig[];
  backupWebhooks: BackupWebhookConfig[];
  llmProviders: LlmProviderConfig[];
  docsFolders: string[];
  confluenceSource?: ConfluenceSourceConfig;
  jiraSource?: JiraSourceConfig;
  logSources: Array<{ id: string; name: string; filePath: string; encoding?: string }>;
  apmPort: number;
  quickLinks: Array<{ id: string; label: string; url: string }>;
}
