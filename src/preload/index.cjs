const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
  // Gestor de Ambiente
  checkAdmin: () => ipcRenderer.invoke('env:check-admin'),
  getServicesStatus: () => ipcRenderer.invoke('env:get-services-status'),
  checkPorts: () => ipcRenderer.invoke('env:check-ports'),
  startService: (name) => ipcRenderer.invoke('env:start-service', name),
  stopService: (name) => ipcRenderer.invoke('env:stop-service', name),
  killControlProcess: () => ipcRenderer.invoke('env:kill-control-process'),
  launchIntelliJ: () => ipcRenderer.invoke('env:launch-intellij'),
  launchServerDebug: () => ipcRenderer.invoke('env:launch-server-debug'),
  launchWinThorDebug: () => ipcRenderer.invoke('env:launch-server-debug'),
  resetEnvironment: (mode) => ipcRenderer.invoke('env:reset-environment', mode),
  onEnvLog: (callback) => {
    const subscription = (_, log) => callback(log);
    ipcRenderer.on('env:log-event', subscription);
    return () => ipcRenderer.removeListener('env:log-event', subscription);
  },

  // Karaf Deployer & Console Embutido
  startEmbeddedKaraf: () => ipcRenderer.invoke('karaf:start-embedded'),
  sendKarafInput: (input) => ipcRenderer.invoke('karaf:send-input', input),
  stopEmbeddedKaraf: () => ipcRenderer.invoke('karaf:stop-embedded'),
  isEmbeddedKarafRunning: () => ipcRenderer.invoke('karaf:is-embedded-running'),
  onKarafStdout: (callback) => {
    const subscription = (_, chunk) => callback(chunk);
    ipcRenderer.on('karaf:stdout', subscription);
    return () => ipcRenderer.removeListener('karaf:stdout', subscription);
  },
  deployKaraf: (request) => ipcRenderer.invoke('karaf:deploy', request),
  execKarafDiagnostic: (command) => ipcRenderer.invoke('karaf:exec-diagnostic', command),
  parsePom: (projectPath) => ipcRenderer.invoke('karaf:parse-pom', projectPath),
  onKarafLogChunk: (callback) => {
    const subscription = (_, chunk) => callback(chunk);
    ipcRenderer.on('karaf:log-chunk', subscription);
    return () => ipcRenderer.removeListener('karaf:log-chunk', subscription);
  },

  // Git & Azure DevOps
  listProjects: () => ipcRenderer.invoke('git:list-projects'),
  getProjectInfo: (projectPath) => ipcRenderer.invoke('git:get-project-info', projectPath),
  buildPrUrl: (projectPath, targetBranch) => ipcRenderer.invoke('git:build-pr-url', projectPath, targetBranch),
  execGitCommand: (projectPath, command) => ipcRenderer.invoke('git:exec-command', projectPath, command),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  // Rotinas WinThor
  listRoutines: () => ipcRenderer.invoke('routines:list'),
  launchRoutine: (fullPath) => ipcRenderer.invoke('routines:launch', fullPath),
  toggleFavoriteRoutine: (id) => ipcRenderer.invoke('routines:toggle-favorite', id),

  // Configurações
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings)
};

try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('[Preload] electronAPI exposto no window com sucesso.');
} catch (err) {
  console.error('[Preload] Erro ao expor electronAPI:', err);
}
