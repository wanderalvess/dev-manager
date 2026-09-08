export type ServiceState = 'RUNNING' | 'STOPPED' | 'START_PENDING' | 'STOP_PENDING' | 'UNKNOWN' | 'NOT_INSTALLED';

export interface ServiceStatus {
  name: string;
  displayName: string;
  state: ServiceState;
}

export interface TrackedServiceConfig {
  id?: string;
  name: string;
  displayName: string;
  enabled: boolean;
  autoStop?: boolean;
  autoStart?: boolean;
}

export interface TrackedProcessConfig {
  id?: string;
  name: string;
  displayName: string;
  enabled: boolean;
  autoKill?: boolean;
}

export interface ProcessStatus {
  name: string;
  displayName: string;
  isRunning: boolean;
  pid?: string;
}

export interface EnvironmentAutomationConfig {
  stopServices: boolean;
  killProcesses: boolean;
  launchIde: boolean;
  startKaraf: boolean;
  openBrowser?: boolean;
  launchMode: 'embedded' | 'external';
  selectedServiceNames?: string[];
  selectedProcesses?: string[];
  selectedStartServiceNames?: string[];
}

export type AutomationStepType =
  | 'command'
  | 'kill-port'
  | 'service-start'
  | 'service-stop'
  | 'kill-process'
  | 'ide'
  | 'karaf'
  | 'browser'
  | 'db-query';

export interface AutomationStep {
  id: string;
  name: string;
  type: AutomationStepType;
  enabled: boolean;
  command?: string;
  cwd?: string;
  envVars?: Record<string, string>;
  port?: number;
  launchMode?: 'wt' | 'cmd' | 'background';
  wtWindowId?: string;
  delayAfterSeconds?: number;
  waitForPort?: boolean;
  browserUrl?: string;
  targetName?: string;
  /** Para type 'db-query': id de uma DatabaseConnectionConfig salva nas configurações. */
  dbConnectionId?: string;
  /** Para type 'db-query': SQL a executar. Suporta os placeholders {{localIp}} e {{wslIp}}. */
  sql?: string;
}

export interface AutomationProfile {
  id: string;
  name: string;
  description?: string;
  steps: AutomationStep[];
  isDefault?: boolean;
}

export interface ProfileExecutionResult {
  success: boolean;
  logs: EnvironmentLog[];
  error?: string;
}

export interface MonitoredPortConfig {
  id?: string;
  port: number;
  label: string;
  enabled: boolean;
}

export interface PortStatus {
  port: number;
  label: string;
  inUse: boolean;
  pid?: string;
}

export interface EnvironmentLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface EnvironmentResetResult {
  success: boolean;
  logs: EnvironmentLog[];
  error?: string;
}

export interface KarafDeployRequest {
  karafClientPath: string;
  user: string;
  pass: string;
  repoUrl: string;
  featureInstall: string;
  port?: number;
}

export type DeployStepType =
  | 'maven-build'
  | 'karaf-command'
  | 'karaf-bundle'
  | 'docker-build'
  | 'docker-push'
  | 'docker-restart'
  | 'command';

export interface DeployStep {
  id: string;
  name: string;
  type: DeployStepType;
  enabled: boolean;
  // maven-build
  projectPath?: string;
  skipTests?: boolean;
  // karaf-command / command (genérico)
  command?: string;
  cwd?: string;
  // karaf-bundle
  bundleAction?: 'install' | 'reinstall' | 'uninstall' | 'update' | 'restart' | 'refresh' | 'start' | 'stop';
  bundleId?: string;
  bundleLocation?: string;
  bundleStart?: boolean;
  // docker-build / docker-push
  dockerContextPath?: string;
  dockerFile?: string;
  dockerImageTag?: string;
  // docker-restart
  dockerContainer?: string;
}

export interface DeployProfile {
  id: string;
  name: string;
  description?: string;
  steps: DeployStep[];
}

export interface PomInfo {
  groupId: string;
  artifactId: string;
  version: string;
  modules: string[];
  suggestedRepoCommand?: string;
  suggestedInstallCommand?: string;
}

export interface GitProjectInfo {
  name: string;
  path: string;
  currentBranch: string;
  branches: string[];
  remoteUrl?: string;
  isAzure: boolean;
  azureOrg?: string;
  azureProject?: string;
  azureRepo?: string;
  uncommittedCount?: number;
  pomInfo?: PomInfo;
}

export interface RoutineItem {
  id: string;
  name: string;
  module: string;
  fullPath: string;
  sizeMb: string;
  isFavorite: boolean;
}

export interface PathStatusInfo {
  path: string;
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
  message?: string;
}

export interface SelectFileOptions {
  defaultPath?: string;
  filters?: { name: string; extensions: string[] }[];
}

export interface AppSettings {
  appPath?: string;
  karafPath: string;
  jdkPath?: string;
  karafScript?: string;
  karafUser: string;
  karafPass: string;
  intellijPath: string;
  ideName?: string;
  projectsPath: string;
  targetPrBranch: string;
  favoriteRoutines: string[];
  webPort?: number;
  webPath?: string;
  karafSshPort?: number;
  karafDebugPort?: number;
  monitoredPorts?: MonitoredPortConfig[];
  trackedServices?: TrackedServiceConfig[];
  trackedProcesses?: TrackedProcessConfig[];
  automationDefaults?: EnvironmentAutomationConfig;
  automationProfiles?: AutomationProfile[];
  activeProfileId?: string;
  /** Perfis de deploy (Karaf/Docker/comando genérico) com etapas sequenciais */
  deployProfiles?: DeployProfile[];
  activeDeployProfileId?: string;
  /** Extensões de arquivo reconhecidas como rotina executável no Catálogo de Rotinas (padrão: ['.EXE']) */
  routineFileExtensions?: string[];
  /** Mapa de extensão -> caminho de executável launcher, para formatos de rotina que não rodam sozinhos (ex: ".PC" -> caminho de um launcher configurado pelo usuário) */
  routineLauncherMap?: Record<string, string>;
  /** Programas mapeados manualmente pelo usuário para abrir com um clique */
  mappedPrograms?: MappedProgram[];
  /** Perfis de conexão com bancos de dados (Oracle, MySQL, PostgreSQL) */
  databaseConnections?: DatabaseConnectionConfig[];
  /** Pastas locais adicionais (fora da Pasta de Projetos) indexadas pelo RAG de documentação */
  docFolders?: DocFolderConfig[];
}

export interface DocFolderConfig {
  path: string;
  label?: string;
}

export interface DocChunk {
  id: string;
  /** Id estável da fonte que originou o chunk (ex: caminho do projeto git, "local-folder:C:\Docs") */
  sourceId: string;
  /** Rótulo exibido na UI/filtros (nome do projeto, ou o rótulo configurado da pasta) */
  sourceLabel: string;
  /** Id do item dentro da fonte — para fontes locais é o caminho absoluto do arquivo */
  entryId: string;
  /** Nome legível do item (caminho relativo à raiz da fonte) */
  entryTitle: string;
  chunkIndex: number;
  text: string;
  mtimeMs: number;
}

export interface DocSearchResult {
  chunk: DocChunk;
  score: number;
}

export type DocsIndexPhase = 'loading-model' | 'scanning' | 'embedding' | 'saving' | 'done';

export interface DocsIndexProgress {
  phase: DocsIndexPhase;
  current: number;
  total: number;
  currentFile?: string;
}

export interface DocsIndexStatus {
  totalChunks: number;
  totalFiles: number;
  totalSources: number;
  sourceLabels: string[];
  lastIndexedAt?: string;
  modelDownloaded: boolean;
}

export interface MappedProgram {
  id: string;
  name: string;
  fullPath: string;
}

export interface IdeInfo {
  name: string;
  shortName: string;
  exeName: string;
  iconType: 'intellij' | 'vscode' | 'cursor' | 'eclipse' | 'code';
}

/**
 * Identifica o nome amigável e tipo da IDE a partir do executável (.exe) ou de rótulo customizado.
 */
export function detectIdeInfo(targetPath?: string, customName?: string): IdeInfo {
  if (customName && customName.trim()) {
    const trimmed = customName.trim();
    const exe = targetPath ? targetPath.split(/[\\/]/).pop() || 'IDE.exe' : 'IDE.exe';
    return {
      name: trimmed,
      shortName: trimmed.length > 14 ? trimmed.slice(0, 12) + '...' : trimmed,
      exeName: exe,
      iconType: trimmed.toLowerCase().includes('code')
        ? 'vscode'
        : trimmed.toLowerCase().includes('cursor')
        ? 'cursor'
        : trimmed.toLowerCase().includes('intellij') || trimmed.toLowerCase().includes('idea')
        ? 'intellij'
        : 'code'
    };
  }

  if (!targetPath || targetPath.trim() === '') {
    return {
      name: 'IDE / Editor',
      shortName: 'IDE',
      exeName: 'idea64.exe',
      iconType: 'code'
    };
  }

  const normalized = targetPath.toLowerCase().replace(/\\/g, '/');
  const exe = targetPath.split(/[\\/]/).pop() || '';
  const exeLower = exe.toLowerCase();

  // IntelliJ IDEA e JetBrains IDEs
  if (exeLower.includes('idea') || normalized.includes('intellij')) {
    return {
      name: 'IntelliJ IDEA',
      shortName: 'IntelliJ',
      exeName: exe || 'idea64.exe',
      iconType: 'intellij'
    };
  }
  if (exeLower === 'code.exe' || normalized.includes('vs code') || normalized.includes('vscode')) {
    return {
      name: 'Visual Studio Code',
      shortName: 'VS Code',
      exeName: exe || 'Code.exe',
      iconType: 'vscode'
    };
  }
  if (exeLower === 'cursor.exe' || normalized.includes('cursor')) {
    return {
      name: 'Cursor',
      shortName: 'Cursor',
      exeName: exe || 'Cursor.exe',
      iconType: 'cursor'
    };
  }
  if (exeLower.includes('eclipse') || normalized.includes('eclipse')) {
    return {
      name: 'Eclipse IDE',
      shortName: 'Eclipse',
      exeName: exe || 'eclipse.exe',
      iconType: 'eclipse'
    };
  }
  if (exeLower.includes('netbeans')) {
    return {
      name: 'Apache NetBeans',
      shortName: 'NetBeans',
      exeName: exe || 'netbeans64.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('pycharm')) {
    return {
      name: 'PyCharm',
      shortName: 'PyCharm',
      exeName: exe || 'pycharm64.exe',
      iconType: 'intellij'
    };
  }
  if (exeLower.includes('webstorm')) {
    return {
      name: 'WebStorm',
      shortName: 'WebStorm',
      exeName: exe || 'webstorm64.exe',
      iconType: 'intellij'
    };
  }
  if (exeLower.includes('rider')) {
    return {
      name: 'JetBrains Rider',
      shortName: 'Rider',
      exeName: exe || 'rider64.exe',
      iconType: 'intellij'
    };
  }
  if (exeLower.includes('fleet')) {
    return {
      name: 'JetBrains Fleet',
      shortName: 'Fleet',
      exeName: exe || 'fleet.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('sublime')) {
    return {
      name: 'Sublime Text',
      shortName: 'Sublime',
      exeName: exe || 'sublime_text.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('notepad++')) {
    return {
      name: 'Notepad++',
      shortName: 'Notepad++',
      exeName: exe || 'notepad++.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('devenv')) {
    return {
      name: 'Visual Studio',
      shortName: 'Visual Studio',
      exeName: exe || 'devenv.exe',
      iconType: 'code'
    };
  }
  if (exeLower.includes('studio64')) {
    return {
      name: 'Android Studio',
      shortName: 'Android Studio',
      exeName: exe || 'studio64.exe',
      iconType: 'intellij'
    };
  }

  // Derivar do nome do executável
  const baseName = exe.replace(/\.exe$/i, '');
  if (baseName) {
    const formatted = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    return {
      name: formatted,
      shortName: formatted.length > 14 ? formatted.slice(0, 12) + '...' : formatted,
      exeName: exe,
      iconType: 'code'
    };
  }

  return {
    name: 'IDE / Editor',
    shortName: 'IDE',
    exeName: exe || 'editor.exe',
    iconType: 'code'
  };
}

export interface SystemAppInfo {
  appName: string;
  appVersion: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
  v8Version: string;
  osPlatform: string;
  osRelease: string;
  osArch: string;
  osHostname: string;
  totalMemoryMb: number;
  freeMemoryMb: number;
  configPath: string;
  isAdmin: boolean;
}

/**
 * Obtém a porta HTTP/Web do Portal Local de forma dinâmica.
 * Prioridade: settings.webPort -> primeira porta monitorada rotulada como Web/HTTP/Portal -> 8889.
 */
export function getWebPort(
  settings?: AppSettings | null,
  monitoredPorts?: (MonitoredPortConfig | PortStatus)[] | null
): number {
  const custom = settings?.webPort;
  if (custom && Number(custom) > 0) {
    return Number(custom);
  }
  const ports = monitoredPorts || settings?.monitoredPorts;
  if (ports && Array.isArray(ports) && ports.length > 0) {
    const web = ports.find(
      (p) =>
        p &&
        (p as any).enabled !== false &&
        typeof p.label === 'string' &&
        (p.label.toLowerCase().includes('web') ||
          p.label.toLowerCase().includes('http') ||
          p.label.toLowerCase().includes('portal'))
    );
    if (web && web.port > 0) return Number(web.port);
  }
  return 8889;
}

/**
 * Obtém a porta SSH do Karaf (usada no client.bat) de forma dinâmica.
 * Prioridade: settings.karafSshPort -> primeira porta monitorada rotulada como SSH/client.bat -> 8101.
 */
export function getKarafSshPort(
  settings?: AppSettings | null,
  monitoredPorts?: (MonitoredPortConfig | PortStatus)[] | null
): number {
  if (settings?.karafSshPort && Number(settings.karafSshPort) > 0) {
    return Number(settings.karafSshPort);
  }
  const ports = monitoredPorts || settings?.monitoredPorts;
  if (ports && Array.isArray(ports) && ports.length > 0) {
    const ssh = ports.find(
      (p) =>
        p &&
        (p as any).enabled !== false &&
        typeof p.label === 'string' &&
        (p.label.toLowerCase().includes('ssh') || p.label.toLowerCase().includes('client'))
    );
    if (ssh && ssh.port > 0) return Number(ssh.port);
  }
  return 8101;
}

/**
 * Monta a URL dinâmica do Portal Web Local (ex: http://localhost:8889/web)
 */
export function getWebUrl(
  settings?: AppSettings | null,
  subPath: string = '',
  monitoredPorts?: (MonitoredPortConfig | PortStatus)[] | null
): string {
  const port = getWebPort(settings, monitoredPorts);
  const targetPath = subPath ? subPath : (settings?.webPath || '');
  const normalized = targetPath ? (targetPath.startsWith('/') ? targetPath : `/${targetPath}`) : '';
  return `http://localhost:${port}${normalized}`;
}

// ==========================================
// Módulo de Banco de Dados (Oracle, MySQL, Postgres)
// ==========================================

export type DatabaseType = 'oracle' | 'mysql' | 'postgres';

export interface DatabaseConnectionConfig {
  id: string;
  name: string;
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  /** Para Oracle: se a conexão deve usar Service Name (ex: 'XEPDB1') ou SID (padrão: serviceName) */
  oracleMode?: 'serviceName' | 'sid';
  /** Flag para SSL/TLS (PostgreSQL e MySQL) */
  ssl?: boolean;
  isDefault?: boolean;
}

export interface QueryRequest {
  connectionId: string;
  sql: string;
  maxRows?: number;
}

export interface QueryResult {
  success: boolean;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  affectedRows?: number;
  executionTimeMs: number;
  isQuery: boolean;
  error?: string;
}

export interface TableInfo {
  name: string;
  schema?: string;
  type?: string;
}

export interface TableColumnInfo {
  name: string;
  type: string;
  nullable?: boolean;
  isPrimaryKey?: boolean;
  length?: number | string;
  defaultValue?: string;
}

// ==========================================
// Módulo de Gerenciamento de Containers (Docker / Podman)
// ==========================================

export type ContainerEngineType = 'docker' | 'podman' | 'containerd' | 'unknown';

export interface DockerContainerInfo {
  id: string;
  names: string;
  image: string;
  state: 'running' | 'exited' | 'paused' | 'restarting' | 'created' | 'dead' | 'unknown';
  status: string;
  ports: string;
  created: string;
}

export interface DockerDaemonStatus {
  installed: boolean;
  running: boolean;
  engine?: ContainerEngineType;
  version?: string;
  error?: string;
}

export interface DockerContainerStats {
  id: string;
  name?: string;
  cpu: string;
  mem: string;
  memPerc: string;
  netIO: string;
}

// Aliases semânticos para compatibilidade genérica de containers
export type ContainerInfo = DockerContainerInfo;
export type ContainerDaemonStatus = DockerDaemonStatus;
export type ContainerStats = DockerContainerStats;

// ==========================================
// Módulo de Rede & IPs (Local e WSL)
// ==========================================

export interface NetworkInterfaceItem {
  interface: string;
  ip: string;
  mac?: string;
  type?: string;
}

export interface NetworkIpInfo {
  primaryLocalIp: string;
  localIps: NetworkInterfaceItem[];
  wslIp: string | null;
  hostname: string;
}

// ==========================================
// Explain Plan & SQL Snippets
// ==========================================

export interface ExplainPlanResult {
  success: boolean;
  planLines: string[];
  executionTimeMs: number;
  error?: string;
}

export interface SqlSnippet {
  id: string;
  title: string;
  category: string;
  description?: string;
  sql: string;
  dbType?: DatabaseType | 'all';
}

// ==========================================
// Karaf Bundles & Maven Build
// ==========================================

export interface KarafBundleInfo {
  id: string;
  state: 'Active' | 'Resolved' | 'Installed' | 'Starting' | 'Stopping' | 'Unknown';
  blueprint?: string;
  level?: string;
  name: string;
  version: string;
  symbolicName?: string;
  location?: string;
  updateUrl?: string;
}

export interface KarafBundleDependent {
  id: string;
  name: string;
  version?: string;
  state?: string;
  reason: string;
}

export interface KarafBundleDetails {
  id: string;
  name: string;
  symbolicName?: string;
  version: string;
  state: string;
  location?: string;
  exportedPackages: string[];
  importedPackages: string[];
  requiredBundles: string[];
  dependentBundles: KarafBundleDependent[];
  unresolvedRequirements?: string[];
  rawHeaders?: Record<string, string>;
  diag?: string;
}

export interface BundleDependencyCheckResult {
  bundleId?: string;
  targetUrl?: string;
  targetVersion?: string;
  name?: string;
  symbolicName?: string;
  alreadyInstalled: boolean;
  existingBundle?: KarafBundleInfo;
  dependentBundles: KarafBundleDependent[];
  exportedPackages: string[];
  missingDependencies?: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  warningMessage?: string;
  canProceed: boolean;
}

export interface InstallBundleRequest {
  location: string;
  version?: string;
  startImmediately?: boolean;
  credentials?: { user?: string; pass?: string; port?: number };
}

export interface ReinstallBundleRequest {
  bundleId: string;
  location?: string;
  projectPath?: string;
  rebuild?: boolean;
  credentials?: { user?: string; pass?: string; port?: number };
}

export interface UpdateBundleVersionRequest {
  bundleId: string;
  newVersionOrLocation: string;
  credentials?: { user?: string; pass?: string; port?: number };
}

export interface MavenBuildRequest {
  projectPath: string;
  goals?: string[];
  skipTests?: boolean;
}

export interface BundleSnapshotItem {
  id: string;
  name: string;
  version: string;
  state: string;
  symbolicName?: string;
  location?: string;
}

export interface BundleSnapshot {
  id: string;
  label: string;
  createdAt: string;
  bundleCount: number;
  bundles: BundleSnapshotItem[];
}

export interface BundleSnapshotDiff {
  unchanged: BundleSnapshotItem[];
  versionChanged: {
    snapshot: BundleSnapshotItem;
    current: KarafBundleInfo;
  }[];
  stateChanged: {
    snapshot: BundleSnapshotItem;
    current: KarafBundleInfo;
  }[];
  added: KarafBundleInfo[];
  removed: BundleSnapshotItem[];
}

// ==========================================
// Git Commits & Branching
// ==========================================

export interface GitCommitInfo {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' | 'copied';
  staged: boolean;
}

export interface GitDiffResult {
  success: boolean;
  diff: string;
  files: string[];
  error?: string;
}

// ==========================================
// Observabilidade & Métricas do Sistema
// ==========================================

export interface SystemMetrics {
  cpuUsagePercent: number;
  totalMemMb: number;
  freeMemMb: number;
  usedMemMb: number;
  memUsagePercent: number;
  uptimeSeconds: number;
  // Aliases de compatibilidade
  totalMemoryMb?: number;
  freeMemoryMb?: number;
  usedMemoryMb?: number;
  memoryUsagePercent?: number;
}

export interface HttpHealthResult {
  url: string;
  reachable: boolean;
  isHealthy?: boolean;
  status?: number;
  statusCode?: number;
  statusText?: string;
  timeMs: number;
  responseTimeMs?: number;
  error?: string;
}
