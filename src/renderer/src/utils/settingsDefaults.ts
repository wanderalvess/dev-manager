/**
 * Valores padrão da tela de Configurações e a normalização do que vem do disco. Antes ficavam espalhados pelo
 * SettingsPage (o estado inicial e o `then` do getSettings repetiam os mesmos defaults).
 */
import type {
  AppSettings,
  EnvironmentAutomationConfig,
  MonitoredPortConfig,
  RealtimeLogSource,
  TrackedProcessConfig,
  TrackedServiceConfig
} from '../../../shared/types';
import { normalizeLauncherMap } from './settingsListEditors';

export const DEFAULT_PORTS: MonitoredPortConfig[] = [
  { port: 8889, label: 'Portal Web Local (WTA)', enabled: true },
  { port: 9195, label: 'WinThor Start (Launcher Delphi)', enabled: true },
  { port: 8101, label: 'Karaf SSH (client.bat)', enabled: true },
  { port: 5005, label: 'Java Remote Debug', enabled: true },
  { port: 1521, label: 'Oracle DB Listener', enabled: true }
];

export const DEFAULT_SERVICES: TrackedServiceConfig[] = [];

export const DEFAULT_PROCESSES: TrackedProcessConfig[] = [];

export const DEFAULT_LOG_SOURCES: RealtimeLogSource[] = [];

export const DEFAULT_AUTOMATION: EnvironmentAutomationConfig = {
  stopServices: true,
  killProcesses: true,
  launchIde: true,
  startKaraf: true,
  openBrowser: false,
  launchMode: 'embedded',
  selectedServiceNames: [],
  selectedProcesses: [],
  selectedStartServiceNames: []
};

const DEFAULT_CCW_BASE_URL = 'https://centraldecontrole.pcinformatica.com.br';
const DEFAULT_WTA_URL = 'http://localhost:8889';

/** Estado da tela antes de o getSettings responder. */
export function createInitialSettings(): AppSettings {
  return {
    appPath: '',
    karafPath: '',
    karafEnvironment: 'local',
    karafWslDistro: '',
    jdkPath: '',
    karafScript: '',
    karafUser: 'karaf',
    karafPass: 'karaf',
    intellijPath: '',
    projectsPath: '',
    targetPrBranch: 'develop',
    favoriteRoutines: [],
    webPort: 8889,
    webPath: '',
    winthorStartEnabled: true,
    winthorStartPort: 9195,
    wtaUrl: DEFAULT_WTA_URL,
    wtaLogin: 'PCADMIN',
    wtaPassword: '',
    wtaAuthToken: '',
    winthorStartDefaultPayload: '',
    karafSshPort: 8101,
    karafDebugPort: 5005,
    monitoredPorts: DEFAULT_PORTS,
    trackedServices: DEFAULT_SERVICES,
    trackedProcesses: DEFAULT_PROCESSES,
    automationDefaults: DEFAULT_AUTOMATION,
    pgDumpPath: '',
    expdpPath: '',
    mysqldumpPath: '',
    psqlPath: '',
    impdpPath: '',
    mysqlPath: '',
    oracleTnsnamesPath: '',
    ccwBaseUrl: DEFAULT_CCW_BASE_URL,
    ccwWinthorVersion: '30',
    ccwAuthCookie: ''
  };
}

/**
 * Preenche o que veio vazio do disco com os padrões da tela. As extensões do launcher de rotinas já saem
 * normalizadas (`.EXE`): assim o snapshot de "alterações não salvas" bate com o que a tela produz ao editar.
 */
export function normalizeLoadedSettings(st: AppSettings): AppSettings {
  return {
    ...st,
    jdkPath: st.jdkPath || '',
    karafScript: st.karafScript || '',
    webPort: st.webPort || 8889,
    webPath: st.webPath || '',
    winthorStartEnabled: st.winthorStartEnabled !== undefined ? st.winthorStartEnabled : true,
    winthorStartPort: st.winthorStartPort || 9195,
    wtaUrl: st.wtaUrl || DEFAULT_WTA_URL,
    wtaLogin: st.wtaLogin !== undefined ? st.wtaLogin : 'PCADMIN',
    wtaPassword: st.wtaPassword || '',
    wtaAuthToken: st.wtaAuthToken || '',
    winthorStartDefaultPayload: st.winthorStartDefaultPayload || '',
    karafSshPort: st.karafSshPort || 8101,
    karafDebugPort: st.karafDebugPort || 5005,
    monitoredPorts: st.monitoredPorts && st.monitoredPorts.length > 0 ? st.monitoredPorts : DEFAULT_PORTS,
    trackedServices: st.trackedServices && st.trackedServices.length > 0 ? st.trackedServices : DEFAULT_SERVICES,
    trackedProcesses: st.trackedProcesses && st.trackedProcesses.length > 0 ? st.trackedProcesses : DEFAULT_PROCESSES,
    automationDefaults: st.automationDefaults || DEFAULT_AUTOMATION,
    pgDumpPath: st.pgDumpPath || '',
    expdpPath: st.expdpPath || '',
    mysqldumpPath: st.mysqldumpPath || '',
    psqlPath: st.psqlPath || '',
    impdpPath: st.impdpPath || '',
    mysqlPath: st.mysqlPath || '',
    oracleTnsnamesPath: st.oracleTnsnamesPath || '',
    ccwBaseUrl: st.ccwBaseUrl || DEFAULT_CCW_BASE_URL,
    ccwWinthorVersion: st.ccwWinthorVersion || '30',
    ccwAuthCookie: st.ccwAuthCookie || '',
    routineLauncherMap: normalizeLauncherMap(st.routineLauncherMap || {})
  };
}
