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
  | 'browser';

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
  /** Extensões de arquivo reconhecidas como rotina executável no Catálogo de Rotinas (padrão: ['.EXE']) */
  routineFileExtensions?: string[];
  /** Mapa de extensão -> caminho de executável launcher, para formatos de rotina que não rodam sozinhos (ex: ".PC" -> caminho de um launcher configurado pelo usuário) */
  routineLauncherMap?: Record<string, string>;
  /** Programas mapeados manualmente pelo usuário para abrir com um clique */
  mappedPrograms?: MappedProgram[];
}

export interface DocChunk {
  id: string;
  projectName: string;
  projectPath: string;
  filePath: string;
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
  totalProjects: number;
  projectNames: string[];
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
  const path = settings?.webPath ?? subPath;
  const normalized = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `http://localhost:${port}${normalized}`;
}



