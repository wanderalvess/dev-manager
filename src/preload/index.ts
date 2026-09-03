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
  DocsIndexProgress
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
  parsePom: (projectPath: string) => ipcRenderer.invoke('karaf:parse-pom', projectPath),
  onKarafLogChunk: (callback: (chunk: string) => void) => {
    const subscription = (_: any, chunk: string) => callback(chunk);
    ipcRenderer.on('karaf:log-chunk', subscription);
    return () => ipcRenderer.removeListener('karaf:log-chunk', subscription);
  },

  // Git & Azure DevOps
  listProjects: (): Promise<GitProjectInfo[]> => ipcRenderer.invoke('git:list-projects'),
  getProjectInfo: (projectPath: string): Promise<GitProjectInfo | null> =>
    ipcRenderer.invoke('git:get-project-info', projectPath),
  buildPrUrl: (projectPath: string, targetBranch?: string): Promise<string | null> =>
    ipcRenderer.invoke('git:build-pr-url', projectPath, targetBranch),
  execGitCommand: (projectPath: string, command: 'fetch' | 'pull' | 'status' | 'stash' | 'stash-pop'): Promise<{ success: boolean; output: string }> =>
    ipcRenderer.invoke('git:exec-command', projectPath, command),
  openExternal: (url: string): Promise<boolean> => ipcRenderer.invoke('shell:open-external', url),

  // Catálogo de Rotinas
  listRoutines: (): Promise<RoutineItem[]> => ipcRenderer.invoke('routines:list'),
  launchRoutine: (fullPath: string): Promise<boolean> => ipcRenderer.invoke('routines:launch', fullPath),
  launchMappedProgram: (id: string): Promise<boolean> => ipcRenderer.invoke('routines:launch-mapped', id),
  toggleFavoriteRoutine: (id: string): Promise<AppSettings> => ipcRenderer.invoke('routines:toggle-favorite', id),

  // Índice de Documentação (RAG local)
  reindexDocs: (): Promise<DocsIndexStatus> => ipcRenderer.invoke('docs:reindex'),
  searchDocs: (query: string, options?: { projectName?: string; topK?: number }): Promise<DocSearchResult[]> =>
    ipcRenderer.invoke('docs:search', query, options),
  getDocsIndexStatus: (): Promise<DocsIndexStatus> => ipcRenderer.invoke('docs:get-status'),
  openDocFile: (filePath: string): Promise<boolean> => ipcRenderer.invoke('docs:open-file', filePath),
  onDocsIndexProgress: (callback: (progress: DocsIndexProgress) => void) => {
    const subscription = (_: any, progress: DocsIndexProgress) => callback(progress);
    ipcRenderer.on('docs:index-progress', subscription);
    return () => ipcRenderer.removeListener('docs:index-progress', subscription);
  },

  // Configurações
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: Partial<AppSettings>): Promise<AppSettings> =>
    ipcRenderer.invoke('settings:save', settings)
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

