import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  AppSettings,
  PathStatusInfo,
  MonitoredPortConfig,
  TrackedServiceConfig,
  TrackedProcessConfig,
  EnvironmentAutomationConfig,
  AutomationProfile
} from '../../shared/types';

export const DEFAULT_MONITORED_PORTS: MonitoredPortConfig[] = [
  { port: 8889, label: 'Portal Web Local', enabled: true },
  { port: 8101, label: 'Karaf SSH (client.bat)', enabled: true },
  { port: 5005, label: 'Java Remote Debug (JVM)', enabled: true },
  { port: 1521, label: 'Oracle DB Listener', enabled: true }
];

export const DEFAULT_AUTOMATION_PROFILES: AutomationProfile[] = [
  {
    id: 'profile-softclinic',
    name: 'SoftClinic Genesys (Microsserviços)',
    description: 'Docker PostgreSQL, SSO, Gateway, API Backend e App Frontend em sequência',
    isDefault: true,
    steps: [
      {
        id: 'step-docker',
        name: 'Docker Desktop & PostgreSQL (5432)',
        type: 'command',
        enabled: true,
        command: 'docker start banco-re || docker run -d --name banco-re -p 5432:5432 -e POSTGRES_PASSWORD=postgres vtzndv/banco-re:latest',
        port: 5432,
        launchMode: 'background',
        delayAfterSeconds: 2
      },
      {
        id: 'step-sso',
        name: 'SSO Auth Server (8787)',
        type: 'command',
        enabled: true,
        command: '.\\gradlew.bat bootRun',
        cwd: 'bats\\softclinic-genesys-sso',
        port: 8787,
        launchMode: 'wt',
        delayAfterSeconds: 3
      },
      {
        id: 'step-gateway',
        name: 'Gateway de Rotas (8080)',
        type: 'command',
        enabled: true,
        command: '.\\gradlew.bat bootRun',
        cwd: 'bats\\softclinic-genesys-gateway',
        port: 8080,
        launchMode: 'wt',
        delayAfterSeconds: 3
      },
      {
        id: 'step-api',
        name: 'API Backend Spring Boot (8888)',
        type: 'command',
        enabled: true,
        command: '.\\mvnw.cmd spring-boot:run',
        cwd: 'bats\\softclinic-genesys-api',
        port: 8888,
        launchMode: 'wt',
        delayAfterSeconds: 3
      },
      {
        id: 'step-app',
        name: 'App Frontend Vite (3000)',
        type: 'command',
        enabled: true,
        command: 'npm run dev',
        cwd: 'bats\\softclinic-genesys-app',
        port: 3000,
        launchMode: 'wt',
        delayAfterSeconds: 1
      }
    ]
  },
  {
    id: 'profile-winthor-karaf',
    name: 'WinThor / Karaf OSGi Clássico',
    description: 'Parada de serviços do Windows, liberação de portas, IDE e Servidor Karaf Debug',
    isDefault: false,
    steps: [
      {
        id: 'step-stop-services',
        name: 'Parar Serviços Windows Conflitantes',
        type: 'service-stop',
        enabled: true
      },
      {
        id: 'step-kill-processes',
        name: 'Liberar Portas Conflitantes (taskkill)',
        type: 'kill-process',
        enabled: true
      },
      {
        id: 'step-launch-ide',
        name: 'Inicializar IDE (IntelliJ / VSCode / Cursor)',
        type: 'ide',
        enabled: true
      },
      {
        id: 'step-start-karaf',
        name: 'Karaf OSGi Debug Server',
        type: 'karaf',
        enabled: true,
        launchMode: 'background',
        port: 8101
      },
      {
        id: 'step-open-browser',
        name: 'Abrir Portal Web Local',
        type: 'browser',
        enabled: false,
        browserUrl: 'http://localhost:8889/web'
      }
    ]
  }
];

export const DEFAULT_TRACKED_SERVICES: TrackedServiceConfig[] = [
  { name: 'PDVSync.Client.API', displayName: 'Serviço API Local', enabled: true, autoStop: true, autoStart: false },
  { name: 'PDVSync.Client.Down', displayName: 'Serviço Sync Down', enabled: true, autoStop: true, autoStart: false },
  { name: 'PDVSync.Client.Up', displayName: 'Serviço Sync Up', enabled: true, autoStop: true, autoStart: false },
  { name: 'WinThor', displayName: 'Serviço Web Local', enabled: true, autoStop: true, autoStart: false }
];

export const DEFAULT_TRACKED_PROCESSES: TrackedProcessConfig[] = [
  { name: 'pdvsyncclientservicocontrole.exe', displayName: 'Serviço Sync Controle', enabled: true, autoKill: true }
];

export const DEFAULT_AUTOMATION_CONFIG: EnvironmentAutomationConfig = {
  stopServices: true,
  killProcesses: true,
  launchIde: true,
  startKaraf: true,
  openBrowser: false,
  launchMode: 'embedded',
  selectedServiceNames: ['PDVSync.Client.API', 'PDVSync.Client.Down', 'PDVSync.Client.Up', 'WinThor'],
  selectedProcesses: ['pdvsyncclientservicocontrole.exe'],
  selectedStartServiceNames: []
};

export function detectDefaultIntelliJPath(): string {
  // 1. Tentar IntelliJ IDEA (JetBrains e Toolbox)
  const possibleRoots = [
    'C:\\Program Files\\JetBrains',
    'C:\\Program Files (x86)\\JetBrains',
    path.join(os.homedir(), 'AppData', 'Local', 'Programs'),
    path.join(os.homedir(), 'AppData', 'Local', 'JetBrains', 'Toolbox', 'apps', 'IDEA-U', 'ch-0'),
    path.join(os.homedir(), 'AppData', 'Local', 'JetBrains', 'Toolbox', 'apps', 'IDEA-C', 'ch-0')
  ];

  for (const root of possibleRoots) {
    try {
      if (fs.existsSync(root)) {
        const entries = fs.readdirSync(root, { withFileTypes: true });
        const ideaDirs = entries
          .filter((e) => e.isDirectory() && (e.name.toLowerCase().includes('intellij') || e.name.toLowerCase().includes('idea')))
          .sort((a, b) => b.name.localeCompare(a.name));

        for (const dir of ideaDirs) {
          const exePath = path.join(root, dir.name, 'bin', 'idea64.exe');
          if (fs.existsSync(exePath)) {
            return exePath;
          }
          try {
            const subEntries = fs.readdirSync(path.join(root, dir.name), { withFileTypes: true });
            for (const sub of subEntries) {
              if (sub.isDirectory()) {
                const subExe = path.join(root, dir.name, sub.name, 'bin', 'idea64.exe');
                if (fs.existsSync(subExe)) {
                  return subExe;
                }
              }
            }
          } catch {
            // Ignora
          }
        }
      }
    } catch {
      // Ignorar erros de leitura de pastas
    }
  }

  // 2. Tentar VS Code
  const vsCodeCandidates = [
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Microsoft VS Code', 'Code.exe'),
    'C:\\Program Files\\Microsoft VS Code\\Code.exe',
    'C:\\Program Files (x86)\\Microsoft VS Code\\Code.exe'
  ];
  for (const candidate of vsCodeCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 3. Tentar Cursor
  const cursorCandidates = [
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'cursor', 'Cursor.exe'),
    path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Cursor', 'Cursor.exe')
  ];
  for (const candidate of cursorCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // 4. Tentar Eclipse
  const eclipseCandidates = [
    'C:\\eclipse\\eclipse.exe',
    'C:\\Program Files\\eclipse\\eclipse.exe',
    path.join(os.homedir(), 'eclipse', 'eclipse.exe')
  ];
  for (const candidate of eclipseCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return 'C:\\Program Files\\JetBrains\\IntelliJ IDEA\\bin\\idea64.exe';
}

export function detectDefaultProjectsPath(): string {
  if (process.env.PROJECTS_DIR && fs.existsSync(process.env.PROJECTS_DIR)) {
    return process.env.PROJECTS_DIR;
  }
  const userHome = os.homedir();
  const candidates = [
    '/workspace/projects',
    '/projects',
    path.join(userHome, 'Projetos'),
    path.join(userHome, 'projetos'),
    path.join(userHome, 'Projects'),
    path.join(userHome, 'source', 'repos'),
    path.join(userHome, 'projetosTOTVS'),
    'C:\\Projetos',
    'C:\\projetosTOTVS'
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignora erro
    }
  }

  return '';
}

export function detectDefaultKarafPath(): string {
  if (process.env.KARAF_DIR && fs.existsSync(process.env.KARAF_DIR)) {
    return process.env.KARAF_DIR;
  }
  const userHome = os.homedir();
  const candidates = [
    '/workspace/karaf',
    '/karaf',
    path.join(userHome, 'karaf'),
    'C:\\karaf',
    'D:\\karaf',
    'C:\\pcsist\\produtos\\winthor',
    path.join(userHome, 'pcsist', 'produtos', 'winthor')
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignora erro
    }
  }

  return '';
}

export function detectDefaultAppPath(): string {
  const envDir = process.env.APP_DIR || process.env.WINTHOR_DIR;
  if (envDir && fs.existsSync(envDir)) {
    return envDir;
  }
  const userHome = os.homedir();
  const candidates = [
    '/workspace/app',
    '/app',
    path.join(userHome, 'app'),
    'C:\\app',
    'D:\\app',
    'C:\\Winthor',
    path.join(userHome, 'Winthor')
  ];

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // Ignora erro
    }
  }

  return '';
}

export const detectDefaultWinthorPath = detectDefaultAppPath;

export function getDynamicDefaultConfig(): AppSettings {
  const appPath = detectDefaultAppPath();
  return {
    appPath,
    winthorPath: appPath,
    karafPath: detectDefaultKarafPath(),
    karafUser: process.env.KARAF_USER || 'karaf',
    karafPass: process.env.KARAF_PASS || 'karaf',
    intellijPath: detectDefaultIntelliJPath(),
    projectsPath: detectDefaultProjectsPath(),
    targetPrBranch: process.env.TARGET_PR_BRANCH || 'develop',
    favoriteRoutines: [],
    webPort: 8889,
    webPath: '',
    winthorWebPort: 8889,
    winthorWebPath: '',
    karafSshPort: 8101,
    karafDebugPort: 5005,
    monitoredPorts: DEFAULT_MONITORED_PORTS,
    trackedServices: DEFAULT_TRACKED_SERVICES,
    trackedProcesses: DEFAULT_TRACKED_PROCESSES,
    automationDefaults: DEFAULT_AUTOMATION_CONFIG,
    automationProfiles: DEFAULT_AUTOMATION_PROFILES,
    activeProfileId: 'profile-softclinic'
  };
}

export class ConfigService {
  private configPath: string;

  constructor() {
    const configDir =
      process.env.CONFIG_DIR ||
      process.env.APPDATA ||
      path.join(os.homedir(), '.config');
    const newDir = process.env.CONFIG_DIR
      ? configDir
      : process.env.APPDATA
      ? path.join(configDir, 'dev-manager')
      : path.join(configDir, 'dev-manager');

    if (!fs.existsSync(newDir)) {
      fs.mkdirSync(newDir, { recursive: true });
      // Migração suave: se existir pasta legada winthor-dev-manager, copiar config.json
      if (process.env.APPDATA) {
        const oldFile = path.join(process.env.APPDATA, 'winthor-dev-manager', 'config.json');
        const newFile = path.join(newDir, 'config.json');
        if (fs.existsSync(oldFile) && !fs.existsSync(newFile)) {
          try {
            fs.copyFileSync(oldFile, newFile);
          } catch {}
        }
      }
    }
    this.configPath = path.join(newDir, 'config.json');
  }

  public getSettings(): AppSettings {
    const defaultConfig = getDynamicDefaultConfig();
    try {
      if (fs.existsSync(this.configPath)) {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const automationProfiles =
          parsed.automationProfiles && Array.isArray(parsed.automationProfiles) && parsed.automationProfiles.length > 0
            ? parsed.automationProfiles
            : DEFAULT_AUTOMATION_PROFILES;
        const activeProfileId =
          parsed.activeProfileId || (automationProfiles[0]?.id) || 'profile-softclinic';

        return {
          ...defaultConfig,
          ...parsed,
          appPath: parsed.appPath || parsed.winthorPath || defaultConfig.appPath,
          winthorPath: parsed.appPath || parsed.winthorPath || defaultConfig.winthorPath,
          webPort: parsed.webPort || parsed.winthorWebPort || defaultConfig.webPort,
          webPath: parsed.webPath !== undefined ? parsed.webPath : (parsed.winthorWebPath !== undefined ? parsed.winthorWebPath : defaultConfig.webPath),
          winthorWebPort: parsed.webPort || parsed.winthorWebPort || defaultConfig.winthorWebPort,
          winthorWebPath: parsed.webPath !== undefined ? parsed.webPath : (parsed.winthorWebPath !== undefined ? parsed.winthorWebPath : defaultConfig.winthorWebPath),
          karafSshPort: parsed.karafSshPort || defaultConfig.karafSshPort,
          karafDebugPort: parsed.karafDebugPort || defaultConfig.karafDebugPort,
          monitoredPorts: parsed.monitoredPorts && parsed.monitoredPorts.length > 0 ? parsed.monitoredPorts : DEFAULT_MONITORED_PORTS,
          trackedServices: parsed.trackedServices && parsed.trackedServices.length > 0 ? parsed.trackedServices : DEFAULT_TRACKED_SERVICES,
          trackedProcesses: parsed.trackedProcesses && parsed.trackedProcesses.length > 0 ? parsed.trackedProcesses : DEFAULT_TRACKED_PROCESSES,
          automationDefaults: parsed.automationDefaults ? { ...DEFAULT_AUTOMATION_CONFIG, ...parsed.automationDefaults } : DEFAULT_AUTOMATION_CONFIG,
          automationProfiles,
          activeProfileId
        };
      }
    } catch (err) {
      console.error('Erro ao ler configurações:', err);
    }
    return defaultConfig;
  }

  public saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    if (settings.appPath && !settings.winthorPath) {
      updated.winthorPath = settings.appPath;
    }
    if (settings.webPort && !settings.winthorWebPort) {
      updated.winthorWebPort = settings.webPort;
    }
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(updated, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    }
    return updated;
  }

  public autoDetectPaths(): Partial<AppSettings> {
    const appPath = detectDefaultAppPath();
    return {
      appPath,
      winthorPath: appPath,
      karafPath: detectDefaultKarafPath(),
      intellijPath: detectDefaultIntelliJPath(),
      projectsPath: detectDefaultProjectsPath()
    };
  }

  public checkPath(targetPath: string): PathStatusInfo {
    if (!targetPath || targetPath.trim() === '') {
      return { path: targetPath, exists: false, isDirectory: false, isFile: false, message: 'Caminho não informado' };
    }
    try {
      const exists = fs.existsSync(targetPath);
      if (!exists) {
        return { path: targetPath, exists: false, isDirectory: false, isFile: false, message: 'Caminho não encontrado no disco' };
      }
      const stat = fs.statSync(targetPath);
      return {
        path: targetPath,
        exists: true,
        isDirectory: stat.isDirectory(),
        isFile: stat.isFile(),
        message: stat.isDirectory() ? 'Diretório acessível' : 'Arquivo acessível'
      };
    } catch (err: any) {
      return {
        path: targetPath,
        exists: false,
        isDirectory: false,
        isFile: false,
        message: `Erro ao acessar caminho: ${err?.message || err}`
      };
    }
  }

  public toggleFavoriteRoutine(routineId: string): AppSettings {
    const current = this.getSettings();
    const favs = new Set(current.favoriteRoutines || []);
    if (favs.has(routineId)) {
      favs.delete(routineId);
    } else {
      favs.add(routineId);
    }
    return this.saveSettings({ favoriteRoutines: Array.from(favs) });
  }
}
