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
  WinthorRoutine,
  PomInfo,
  PathStatusInfo,
  SelectFileOptions,
  SystemAppInfo
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
  killControlProcess: () => Promise<boolean>;
  batchKillProcesses: (processNames: string[]) => Promise<Record<string, boolean>>;
  launchIntelliJ: () => Promise<boolean>;
  launchServerDebug: () => Promise<boolean>;
  launchWinThorDebug: () => Promise<boolean>;
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

  // Git & Azure DevOps
  listProjects: () => Promise<GitProjectInfo[]>;
  getProjectInfo: (projectPath: string) => Promise<GitProjectInfo | null>;
  buildPrUrl: (projectPath: string, targetBranch?: string) => Promise<string | null>;
  execGitCommand: (
    projectPath: string,
    command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'
  ) => Promise<{ success: boolean; output: string }>;
  openExternal: (url: string) => Promise<boolean>;

  // Catálogo de Rotinas
  listRoutines: () => Promise<RoutineItem[]>;
  launchRoutine: (fullPath: string) => Promise<boolean>;
  toggleFavoriteRoutine: (id: string) => Promise<AppSettings>;

  // Configurações
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
